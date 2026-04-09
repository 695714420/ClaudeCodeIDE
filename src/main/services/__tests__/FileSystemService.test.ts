import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { FileSystemService } from '../FileSystemService'

describe('FileSystemService', () => {
  let service: FileSystemService
  let testDir: string

  beforeEach(async () => {
    service = new FileSystemService()
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-service-test-'))
  })

  afterEach(async () => {
    service.stopAllWatchers()
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {})
  })

  describe('createFile', () => {
    it('should create a file with content', async () => {
      const filePath = path.join(testDir, 'test.txt')
      await service.createFile(filePath, 'hello world')
      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('hello world')
    })

    it('should create a file with empty content when no content provided', async () => {
      const filePath = path.join(testDir, 'empty.txt')
      await service.createFile(filePath)
      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('')
    })

    it('should create parent directories if they do not exist', async () => {
      const filePath = path.join(testDir, 'sub', 'deep', 'file.txt')
      await service.createFile(filePath, 'nested')
      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('nested')
    })
  })

  describe('createDirectory', () => {
    it('should create a directory', async () => {
      const dirPath = path.join(testDir, 'newdir')
      await service.createDirectory(dirPath)
      const stat = await fs.stat(dirPath)
      expect(stat.isDirectory()).toBe(true)
    })

    it('should create nested directories recursively', async () => {
      const dirPath = path.join(testDir, 'a', 'b', 'c')
      await service.createDirectory(dirPath)
      const stat = await fs.stat(dirPath)
      expect(stat.isDirectory()).toBe(true)
    })
  })

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'read.txt')
      await fs.writeFile(filePath, 'read me', 'utf-8')
      const content = await service.readFile(filePath)
      expect(content).toBe('read me')
    })

    it('should throw for non-existent file', async () => {
      const filePath = path.join(testDir, 'nonexistent.txt')
      await expect(service.readFile(filePath)).rejects.toThrow()
    })
  })

  describe('writeFile', () => {
    it('should write content to an existing file', async () => {
      const filePath = path.join(testDir, 'write.txt')
      await fs.writeFile(filePath, 'old', 'utf-8')
      await service.writeFile(filePath, 'new content')
      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('new content')
    })

    it('should create file and parent dirs if they do not exist', async () => {
      const filePath = path.join(testDir, 'sub', 'write.txt')
      await service.writeFile(filePath, 'created')
      const content = await fs.readFile(filePath, 'utf-8')
      expect(content).toBe('created')
    })
  })

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      const filePath = path.join(testDir, 'delete-me.txt')
      await fs.writeFile(filePath, 'bye', 'utf-8')
      await service.deleteFile(filePath)
      await expect(fs.access(filePath)).rejects.toThrow()
    })

    it('should delete a directory recursively', async () => {
      const dirPath = path.join(testDir, 'delete-dir')
      await fs.mkdir(dirPath)
      await fs.writeFile(path.join(dirPath, 'child.txt'), 'child', 'utf-8')
      await service.deleteFile(dirPath)
      await expect(fs.access(dirPath)).rejects.toThrow()
    })
  })

  describe('renameFile', () => {
    it('should rename a file', async () => {
      const oldPath = path.join(testDir, 'old-name.txt')
      const newPath = path.join(testDir, 'new-name.txt')
      await fs.writeFile(oldPath, 'content', 'utf-8')
      await service.renameFile(oldPath, newPath)
      await expect(fs.access(oldPath)).rejects.toThrow()
      const content = await fs.readFile(newPath, 'utf-8')
      expect(content).toBe('content')
    })

    it('should create parent directories for the new path', async () => {
      const oldPath = path.join(testDir, 'move-me.txt')
      const newPath = path.join(testDir, 'sub', 'moved.txt')
      await fs.writeFile(oldPath, 'moved', 'utf-8')
      await service.renameFile(oldPath, newPath)
      const content = await fs.readFile(newPath, 'utf-8')
      expect(content).toBe('moved')
    })
  })

  describe('readDirectory', () => {
    it('should return empty array for empty directory', async () => {
      const result = await service.readDirectory(testDir)
      expect(result).toEqual([])
    })

    it('should list files and directories', async () => {
      await fs.writeFile(path.join(testDir, 'file.txt'), 'content', 'utf-8')
      await fs.mkdir(path.join(testDir, 'subdir'))
      const result = await service.readDirectory(testDir)
      expect(result).toHaveLength(2)
      // Directories first
      expect(result[0].name).toBe('subdir')
      expect(result[0].type).toBe('directory')
      expect(result[1].name).toBe('file.txt')
      expect(result[1].type).toBe('file')
    })

    it('should return shallow results without recursive children', async () => {
      const subdir = path.join(testDir, 'parent')
      await fs.mkdir(subdir)
      await fs.writeFile(path.join(subdir, 'child.txt'), 'child', 'utf-8')
      const result = await service.readDirectory(testDir)
      expect(result[0].name).toBe('parent')
      expect(result[0].type).toBe('directory')
      // Shallow: children should be undefined (lazy loading)
      expect(result[0].children).toBeUndefined()
    })

    it('should sort directories before files, alphabetically', async () => {
      await fs.writeFile(path.join(testDir, 'z-file.txt'), '', 'utf-8')
      await fs.writeFile(path.join(testDir, 'a-file.txt'), '', 'utf-8')
      await fs.mkdir(path.join(testDir, 'z-dir'))
      await fs.mkdir(path.join(testDir, 'a-dir'))
      const result = await service.readDirectory(testDir)
      expect(result.map((n) => n.name)).toEqual(['a-dir', 'z-dir', 'a-file.txt', 'z-file.txt'])
    })
  })

  describe('readDirectoryShallow', () => {
    it('should filter out default ignore patterns', async () => {
      await fs.mkdir(path.join(testDir, 'node_modules'))
      await fs.mkdir(path.join(testDir, '.git'))
      await fs.writeFile(path.join(testDir, 'index.ts'), '', 'utf-8')
      const result = await service.readDirectoryShallow(testDir)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('index.ts')
    })

    it('should filter out custom ignore patterns', async () => {
      await fs.writeFile(path.join(testDir, 'keep.ts'), '', 'utf-8')
      await fs.writeFile(path.join(testDir, 'remove.log'), '', 'utf-8')
      const result = await service.readDirectoryShallow(testDir, ['remove.log'])
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('keep.ts')
    })

    it('should load children on demand for subdirectories', async () => {
      const subdir = path.join(testDir, 'src')
      await fs.mkdir(subdir)
      await fs.writeFile(path.join(subdir, 'main.ts'), '', 'utf-8')
      // First call: shallow, no children
      const root = await service.readDirectoryShallow(testDir)
      expect(root[0].children).toBeUndefined()
      // Second call: load children of subdir
      const children = await service.readDirectoryShallow(subdir)
      expect(children).toHaveLength(1)
      expect(children[0].name).toBe('main.ts')
    })
  })

  describe('listAllFiles', () => {
    it('should return all files recursively', async () => {
      await fs.writeFile(path.join(testDir, 'root.txt'), '', 'utf-8')
      const subdir = path.join(testDir, 'sub')
      await fs.mkdir(subdir)
      await fs.writeFile(path.join(subdir, 'child.txt'), '', 'utf-8')
      const deepDir = path.join(subdir, 'deep')
      await fs.mkdir(deepDir)
      await fs.writeFile(path.join(deepDir, 'deep.txt'), '', 'utf-8')

      const result = await service.listAllFiles(testDir)
      expect(result).toHaveLength(3)
      expect(result).toContain(path.join(testDir, 'root.txt'))
      expect(result).toContain(path.join(subdir, 'child.txt'))
      expect(result).toContain(path.join(deepDir, 'deep.txt'))
    })

    it('should skip default ignore patterns', async () => {
      await fs.writeFile(path.join(testDir, 'keep.ts'), '', 'utf-8')
      await fs.mkdir(path.join(testDir, 'node_modules'))
      await fs.writeFile(path.join(testDir, 'node_modules', 'pkg.js'), '', 'utf-8')
      await fs.mkdir(path.join(testDir, '.git'))
      await fs.writeFile(path.join(testDir, '.git', 'config'), '', 'utf-8')

      const result = await service.listAllFiles(testDir)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('keep.ts')
    })

    it('should return empty array for empty directory', async () => {
      const result = await service.listAllFiles(testDir)
      expect(result).toEqual([])
    })

    it('should skip custom ignore patterns', async () => {
      await fs.writeFile(path.join(testDir, 'keep.ts'), '', 'utf-8')
      await fs.writeFile(path.join(testDir, 'skip.log'), '', 'utf-8')

      const result = await service.listAllFiles(testDir, ['skip.log'])
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('keep.ts')
    })
  })

  describe('loadGitignore', () => {
    it('should parse .gitignore file', async () => {
      await fs.writeFile(
        path.join(testDir, '.gitignore'),
        '# comment\nnode_modules/\ndist\n\n*.log\n',
        'utf-8'
      )
      const patterns = await service.loadGitignore(testDir)
      expect(patterns).toEqual(['node_modules', 'dist', '*.log'])
    })

    it('should return empty array when .gitignore does not exist', async () => {
      const patterns = await service.loadGitignore(testDir)
      expect(patterns).toEqual([])
    })
  })

  describe('setWorkspaceRoot / validatePath', () => {
    it('should allow operations on files within the workspace root', async () => {
      service.setWorkspaceRoot(testDir)
      const filePath = path.join(testDir, 'allowed.txt')
      await service.createFile(filePath, 'ok')
      const content = await service.readFile(filePath)
      expect(content).toBe('ok')
    })

    it('should allow operations on the workspace root directory itself', async () => {
      service.setWorkspaceRoot(testDir)
      // Reading the workspace root directory should not throw
      const result = await service.readDirectoryShallow(testDir)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should allow deeply nested paths within workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const deepPath = path.join(testDir, 'a', 'b', 'c', 'd', 'deep.txt')
      await service.createFile(deepPath, 'deep content')
      const content = await service.readFile(deepPath)
      expect(content).toBe('deep content')
    })

    it('should reject path traversal attacks using ../', async () => {
      service.setWorkspaceRoot(testDir)
      const maliciousPath = path.join(testDir, '..', 'outside.txt')
      await expect(service.readFile(maliciousPath)).rejects.toThrow('Access denied')
    })

    it('should reject path traversal with nested ../ sequences', async () => {
      service.setWorkspaceRoot(testDir)
      const maliciousPath = path.join(testDir, 'sub', '..', '..', 'escape.txt')
      await expect(service.readFile(maliciousPath)).rejects.toThrow('Access denied')
    })

    it('should reject absolute paths outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const outsidePath = path.resolve(os.tmpdir(), 'outside-workspace.txt')
      // Only test if the path is actually outside testDir
      if (!outsidePath.startsWith(testDir + path.sep)) {
        await expect(service.readFile(outsidePath)).rejects.toThrow('Access denied')
      }
    })

    it('should reject writeFile to paths outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const outsidePath = path.join(testDir, '..', 'hack.txt')
      await expect(service.writeFile(outsidePath, 'malicious')).rejects.toThrow('Access denied')
    })

    it('should reject deleteFile on paths outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const outsidePath = path.join(testDir, '..', 'delete-me.txt')
      await expect(service.deleteFile(outsidePath)).rejects.toThrow('Access denied')
    })

    it('should reject renameFile when source is outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const outsideSrc = path.join(testDir, '..', 'src.txt')
      const insideDst = path.join(testDir, 'dst.txt')
      await expect(service.renameFile(outsideSrc, insideDst)).rejects.toThrow('Access denied')
    })

    it('should reject renameFile when destination is outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const insideSrc = path.join(testDir, 'src.txt')
      const outsideDst = path.join(testDir, '..', 'dst.txt')
      await service.createFile(insideSrc, 'content')
      await expect(service.renameFile(insideSrc, outsideDst)).rejects.toThrow('Access denied')
    })

    it('should not validate paths when workspace root is not set', async () => {
      // No setWorkspaceRoot call — validatePath should be a no-op
      const filePath = path.join(testDir, 'no-root.txt')
      await service.createFile(filePath, 'works')
      const content = await service.readFile(filePath)
      expect(content).toBe('works')
    })

    it('should reject createDirectory outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const outsidePath = path.join(testDir, '..', 'evil-dir')
      await expect(service.createDirectory(outsidePath)).rejects.toThrow('Access denied')
    })

    it('should reject readDirectoryShallow outside workspace', async () => {
      service.setWorkspaceRoot(testDir)
      const outsidePath = path.resolve(testDir, '..')
      await expect(service.readDirectoryShallow(outsidePath)).rejects.toThrow('Access denied')
    })
  })

  describe('watchDirectory', () => {
    it('should detect file creation', (done) => {
      service.watchDirectory(testDir, (event) => {
        expect(event.eventType).toBe('create')
        expect(event.path).toContain('watch-test.txt')
        done()
      })

      // Small delay to let the watcher initialize
      setTimeout(async () => {
        await fs.writeFile(path.join(testDir, 'watch-test.txt'), 'watched', 'utf-8')
      }, 100)
    }, 5000)

    it('should stop watching when stopWatching is called', async () => {
      const callback = jest.fn()
      service.watchDirectory(testDir, callback)
      service.stopWatching(testDir)

      await fs.writeFile(path.join(testDir, 'after-stop.txt'), 'data', 'utf-8')
      // Wait a bit to ensure no events fire
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(callback).not.toHaveBeenCalled()
    })
  })
})
