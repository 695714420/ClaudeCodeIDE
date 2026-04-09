/**
 * Unit tests for GitService.
 *
 * We mock util.promisify so that the promisified execFile in GitService
 * calls our controlled mock function.
 */

const mockExecFileAsync = jest.fn()

jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockExecFileAsync
}))

import { GitService, GitFileStatus } from '../GitService'

function mockGitSuccess(stdout: string): void {
  mockExecFileAsync.mockResolvedValue({ stdout, stderr: '' })
}

function mockGitError(message = 'git error'): void {
  mockExecFileAsync.mockRejectedValue(new Error(message))
}

describe('GitService', () => {
  let service: GitService

  beforeEach(() => {
    service = new GitService()
    mockExecFileAsync.mockReset()
  })

  // ── isGitRepo ──────────────────────────────────────────────

  describe('isGitRepo', () => {
    it('should return true when inside a git work tree', async () => {
      mockGitSuccess('true')
      const result = await service.isGitRepo('/some/repo')
      expect(result).toBe(true)
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['rev-parse', '--is-inside-work-tree'],
        expect.objectContaining({ cwd: '/some/repo' })
      )
    })

    it('should return false when not a git repo', async () => {
      mockGitError('fatal: not a git repository')
      const result = await service.isGitRepo('/not/a/repo')
      expect(result).toBe(false)
    })
  })

  // ── getCurrentBranch ───────────────────────────────────────

  describe('getCurrentBranch', () => {
    it('should return the current branch name', async () => {
      mockGitSuccess('main\n')
      const branch = await service.getCurrentBranch('/some/repo')
      expect(branch).toBe('main')
    })

    it('should return feature branch with slashes', async () => {
      mockGitSuccess('feature/my-branch\n')
      const branch = await service.getCurrentBranch('/some/repo')
      expect(branch).toBe('feature/my-branch')
    })

    it('should return empty string on error', async () => {
      mockGitError('fatal: not a git repository')
      const branch = await service.getCurrentBranch('/not/a/repo')
      expect(branch).toBe('')
    })
  })

  // ── getStatus ──────────────────────────────────────────────

  describe('getStatus', () => {
    it('should parse staged modified files', async () => {
      mockGitSuccess('M  src/file.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual<GitFileStatus[]>([
        { path: 'src/file.ts', status: 'modified', staged: true }
      ])
    })

    it('should parse added files', async () => {
      mockGitSuccess('A  newfile.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual<GitFileStatus[]>([
        { path: 'newfile.ts', status: 'added', staged: true }
      ])
    })

    it('should parse staged deleted files', async () => {
      mockGitSuccess('D  old.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual<GitFileStatus[]>([
        { path: 'old.ts', status: 'deleted', staged: true }
      ])
    })

    it('should parse untracked files', async () => {
      mockGitSuccess('?? untracked.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual<GitFileStatus[]>([
        { path: 'untracked.ts', status: 'untracked', staged: false }
      ])
    })

    it('should parse renamed files', async () => {
      mockGitSuccess('R  old.ts -> new.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual<GitFileStatus[]>([
        { path: 'old.ts -> new.ts', status: 'renamed', staged: true }
      ])
    })

    it('should parse unstaged modified files in multi-line output', async () => {
      // When there are multiple lines, trim() only strips outer whitespace,
      // so interior lines with leading spaces are preserved correctly
      mockGitSuccess('M  staged.ts\n M unstaged.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toHaveLength(2)
      expect(statuses[0]).toEqual({ path: 'staged.ts', status: 'modified', staged: true })
      expect(statuses[1]).toEqual({ path: 'unstaged.ts', status: 'modified', staged: false })
    })

    it('should parse multiple status lines', async () => {
      mockGitSuccess('M  src/a.ts\nA  src/b.ts\n?? src/c.ts\nD  src/d.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toHaveLength(4)
      expect(statuses[0]).toEqual({ path: 'src/a.ts', status: 'modified', staged: true })
      expect(statuses[1]).toEqual({ path: 'src/b.ts', status: 'added', staged: true })
      expect(statuses[2]).toEqual({ path: 'src/c.ts', status: 'untracked', staged: false })
      expect(statuses[3]).toEqual({ path: 'src/d.ts', status: 'deleted', staged: true })
    })

    it('should return empty array for clean repo', async () => {
      mockGitSuccess('')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual([])
    })

    it('should return empty array on error', async () => {
      mockGitError('fatal: not a git repository')
      const statuses = await service.getStatus('/not/a/repo')
      expect(statuses).toEqual([])
    })

    it('should default unknown status codes to modified', async () => {
      mockGitSuccess('C  copied.ts')
      const statuses = await service.getStatus('/repo')
      expect(statuses).toEqual<GitFileStatus[]>([
        { path: 'copied.ts', status: 'modified', staged: true }
      ])
    })
  })

  // ── getDiff ────────────────────────────────────────────────

  describe('getDiff', () => {
    it('should return diff output', async () => {
      const diffOutput =
        'diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n-old\n+new'
      mockGitSuccess(diffOutput)
      const diff = await service.getDiff('file.ts', '/repo')
      expect(diff).toBe(diffOutput)
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['diff', '--', 'file.ts'],
        expect.objectContaining({ cwd: '/repo' })
      )
    })

    it('should return empty string when no diff', async () => {
      mockGitSuccess('')
      const diff = await service.getDiff('file.ts', '/repo')
      expect(diff).toBe('')
    })

    it('should return empty string on error', async () => {
      mockGitError('fatal: bad revision')
      const diff = await service.getDiff('file.ts', '/repo')
      expect(diff).toBe('')
    })
  })

  // ── stage ──────────────────────────────────────────────────

  describe('stage', () => {
    it('should call git add with file paths', async () => {
      mockGitSuccess('')
      await service.stage(['file1.ts', 'file2.ts'], '/repo')
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['add', 'file1.ts', 'file2.ts'],
        expect.objectContaining({ cwd: '/repo' })
      )
    })

    it('should stage a single file', async () => {
      mockGitSuccess('')
      await service.stage(['index.ts'], '/repo')
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['add', 'index.ts'],
        expect.objectContaining({ cwd: '/repo' })
      )
    })

    it('should throw on error', async () => {
      mockGitError('fatal: pathspec not found')
      await expect(service.stage(['nonexistent.ts'], '/repo')).rejects.toThrow(
        'fatal: pathspec not found'
      )
    })
  })

  // ── commit ─────────────────────────────────────────────────

  describe('commit', () => {
    it('should call git commit with message', async () => {
      mockGitSuccess('[main abc1234] fix: resolve bug')
      await service.commit('/repo', 'fix: resolve bug')
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'fix: resolve bug'],
        expect.objectContaining({ cwd: '/repo' })
      )
    })

    it('should throw on error', async () => {
      mockGitError('nothing to commit')
      await expect(service.commit('/repo', 'empty')).rejects.toThrow('nothing to commit')
    })
  })

  // ── push ───────────────────────────────────────────────────

  describe('push', () => {
    it('should call git push', async () => {
      mockGitSuccess('')
      await service.push('/repo')
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['push'],
        expect.objectContaining({ cwd: '/repo' })
      )
    })

    it('should throw on error', async () => {
      mockGitError('rejected: non-fast-forward')
      await expect(service.push('/repo')).rejects.toThrow('rejected: non-fast-forward')
    })
  })

  // ── pull ───────────────────────────────────────────────────

  describe('pull', () => {
    it('should call git pull', async () => {
      mockGitSuccess('Already up to date.')
      await service.pull('/repo')
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        ['pull'],
        expect.objectContaining({ cwd: '/repo' })
      )
    })

    it('should throw on error', async () => {
      mockGitError('merge conflict')
      await expect(service.pull('/repo')).rejects.toThrow('merge conflict')
    })
  })

  // ── maxBuffer configuration ────────────────────────────────

  describe('maxBuffer configuration', () => {
    it('should pass 10MB maxBuffer option to execFile', async () => {
      mockGitSuccess('')
      await service.isGitRepo('/repo')
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        'git',
        expect.any(Array),
        expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 })
      )
    })
  })
})
