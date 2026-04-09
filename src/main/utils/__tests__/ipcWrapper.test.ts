import { wrapHandler, IpcResult } from '../ipcWrapper'
import type { IpcMainInvokeEvent } from 'electron'

/** Minimal mock for IpcMainInvokeEvent — only used as the first positional arg */
const fakeEvent = {} as IpcMainInvokeEvent

describe('wrapHandler', () => {
  describe('successful handler', () => {
    it('should return { success: true, data } when handler resolves', async () => {
      const handler = wrapHandler(async () => 'hello')
      const result = await handler(fakeEvent)
      expect(result).toEqual({ success: true, data: 'hello' })
    })

    it('should work with non-string return values', async () => {
      const handler = wrapHandler(async () => ({ id: 1, name: 'test' }))
      const result = await handler(fakeEvent)
      expect(result).toEqual({ success: true, data: { id: 1, name: 'test' } })
    })

    it('should handle null data', async () => {
      const handler = wrapHandler(async () => null)
      const result = await handler(fakeEvent)
      expect(result).toEqual({ success: true, data: null })
    })
  })

  describe('handler that throws Error', () => {
    it('should return { success: false, error } with the error message', async () => {
      const handler = wrapHandler(async () => {
        throw new Error('file not found')
      })
      const result = await handler(fakeEvent)
      expect(result).toEqual({ success: false, error: 'file not found' })
    })
  })

  describe('handler that throws non-Error', () => {
    it('should stringify a thrown string', async () => {
      const handler = wrapHandler(async () => {
        throw 'something went wrong'
      })
      const result = await handler(fakeEvent)
      expect(result).toEqual({ success: false, error: 'something went wrong' })
    })

    it('should stringify a thrown number', async () => {
      const handler = wrapHandler(async () => {
        throw 42
      })
      const result = await handler(fakeEvent)
      expect(result).toEqual({ success: false, error: '42' })
    })
  })

  describe('argument pass-through', () => {
    it('should forward all arguments after _event to the wrapped function', async () => {
      const fn = jest.fn(async (a: string, b: number) => `${a}-${b}`)
      const handler = wrapHandler(fn)

      const result = await handler(fakeEvent, 'foo', 123)

      expect(fn).toHaveBeenCalledWith('foo', 123)
      expect(result).toEqual({ success: true, data: 'foo-123' })
    })

    it('should work with no extra arguments', async () => {
      const fn = jest.fn(async () => 'ok')
      const handler = wrapHandler(fn)

      await handler(fakeEvent)

      expect(fn).toHaveBeenCalledWith()
    })
  })

  describe('_event parameter handling', () => {
    it('should not pass _event to the wrapped function', async () => {
      const fn = jest.fn(async (...args: any[]) => args)
      const handler = wrapHandler(fn)

      const result = await handler(fakeEvent, 'arg1')

      // The wrapped fn should only receive 'arg1', not fakeEvent
      expect(fn).toHaveBeenCalledWith('arg1')
      expect(result).toEqual({ success: true, data: ['arg1'] })
    })
  })
})
