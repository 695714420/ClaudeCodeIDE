import { ClaudeBackendAdapter } from '../ClaudeBackendAdapter'
import type { CliStreamEvent, CliExecuteOptions } from '../../../shared/types'
import { EventEmitter } from 'events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// We need to mock child_process before importing ClaudeBackendAdapter internals
const mockSpawn = jest.fn()
const mockExecFile = jest.fn()
const mockExecSync = jest.fn()

jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
  execFile: (...args: unknown[]) => mockExecFile(...args),
  execSync: (...args: unknown[]) => mockExecSync(...args)
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a fake ChildProcess (EventEmitter with stdin/stdout/stderr streams) */
function createFakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdin: { write: jest.Mock; end: jest.Mock }
    stdout: EventEmitter
    stderr: EventEmitter
    kill: jest.Mock
    pid: number
  }
  child.stdin = { write: jest.fn(), end: jest.fn() }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = jest.fn()
  child.pid = 12345
  return child
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClaudeBackendAdapter', () => {
  let service: ClaudeBackendAdapter

  beforeEach(() => {
    jest.useFakeTimers()
    service = new ClaudeBackendAdapter()
    mockSpawn.mockReset()
    mockExecFile.mockReset()
    mockExecSync.mockReturnValue('claude')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // -----------------------------------------------------------------------
  // execute()
  // -----------------------------------------------------------------------
  describe('execute()', () => {
    it('should spawn claude with correct arguments and write prompt to stdin', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      const options: CliExecuteOptions = { prompt: 'hello', cwd: '/tmp' }

      const promise = service.execute(options, (e) => events.push(e))

      // Verify spawn was called correctly
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--output-format', 'stream-json', '--verbose'],
        expect.objectContaining({ cwd: '/tmp', shell: false })
      )

      // Verify prompt was written to stdin
      expect(fakeChild.stdin.write).toHaveBeenCalledWith('hello')
      expect(fakeChild.stdin.end).toHaveBeenCalled()

      // Simulate process close
      fakeChild.emit('close', 0)
      await promise

      // No error events for exit code 0
      expect(events.filter((e) => e.type === 'error')).toHaveLength(0)
    })

    it('should forward parsed stream events via the callback', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      const promise = service.execute({ prompt: 'test', cwd: '.' }, (e) => events.push(e))

      // Feed a valid JSON line through stdout
      const initJson = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      fakeChild.stdout.emit('data', Buffer.from(initJson + '\n'))

      fakeChild.stdout.emit('end')
      fakeChild.emit('close', 0)
      await promise

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'init', data: expect.objectContaining({ model: 'claude-3' }) })
        ])
      )
    })

    it('should emit error event when process exits with non-zero code', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      const promise = service.execute({ prompt: 'x', cwd: '.' }, (e) => events.push(e))

      fakeChild.emit('close', 1)
      await promise

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({ exitCode: 1 })
          })
        ])
      )
    })

    it('should emit error event with stderr content', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      const promise = service.execute({ prompt: 'x', cwd: '.' }, (e) => events.push(e))

      fakeChild.stderr.emit('data', Buffer.from('something went wrong'))
      fakeChild.emit('close', 0)
      await promise

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({ message: 'something went wrong' })
          })
        ])
      )
    })

    it('should reject when spawn emits ENOENT error', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const promise = service.execute({ prompt: 'x', cwd: '.' }, jest.fn())

      const err = new Error('not found') as NodeJS.ErrnoException
      err.code = 'ENOENT'
      fakeChild.emit('error', err)

      await expect(promise).rejects.toThrow('not found')
    })

    it('should emit error event for non-ENOENT spawn errors and resolve', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      const promise = service.execute({ prompt: 'x', cwd: '.' }, (e) => events.push(e))

      const err = new Error('permission denied') as NodeJS.ErrnoException
      err.code = 'EPERM'
      fakeChild.emit('error', err)

      await promise
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({ message: 'permission denied' })
          })
        ])
      )
    })

    it('should kill process on timeout', () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      service.execute({ prompt: 'x', cwd: '.' }, (e) => events.push(e))

      // Advance past the timeout
      jest.advanceTimersByTime(120_001)

      expect(fakeChild.kill).toHaveBeenCalledWith('SIGTERM')
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'error', data: expect.objectContaining({ message: expect.stringContaining('超时') }) })
        ])
      )
    })
  })

  // -----------------------------------------------------------------------
  // cancel()
  // -----------------------------------------------------------------------
  describe('cancel()', () => {
    it('should kill the running process and emit cancelled event', () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const events: CliStreamEvent[] = []
      service.execute({ prompt: 'x', cwd: '.' }, (e) => events.push(e))

      service.cancel()

      expect(fakeChild.kill).toHaveBeenCalledWith('SIGTERM')
      expect(events).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'cancelled', data: null })])
      )
    })

    it('should do nothing when no process is running', () => {
      // Should not throw
      expect(() => service.cancel()).not.toThrow()
    })
  })

  // -----------------------------------------------------------------------
  // checkStatus()
  // -----------------------------------------------------------------------
  describe('checkStatus()', () => {
    it('should return available=true with version when execFile succeeds', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
        cb(null, 'claude v1.2.3\n')
      })

      const result = await service.checkStatus()
      expect(result).toEqual({ available: true, version: 'claude v1.2.3' })
    })

    it('should return available=false when execFile errors', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
        cb(new Error('not found'))
      })

      const result = await service.checkStatus()
      expect(result).toEqual({ available: false })
    })
  })

  // -----------------------------------------------------------------------
  // isRunning()
  // -----------------------------------------------------------------------
  describe('isRunning()', () => {
    it('should return false initially', () => {
      expect(service.isRunning()).toBe(false)
    })

    it('should return true while a process is running', () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      service.execute({ prompt: 'x', cwd: '.' }, jest.fn())
      expect(service.isRunning()).toBe(true)
    })

    it('should return false after process closes', async () => {
      const fakeChild = createFakeChild()
      mockSpawn.mockReturnValue(fakeChild)

      const promise = service.execute({ prompt: 'x', cwd: '.' }, jest.fn())
      fakeChild.emit('close', 0)
      await promise

      expect(service.isRunning()).toBe(false)
    })
  })
})
