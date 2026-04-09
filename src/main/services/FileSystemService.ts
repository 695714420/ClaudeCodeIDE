import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import type { FileTreeNode, FileChangeEvent } from '../../shared/types'
import { DEFAULT_IGNORE_PATTERNS } from '../../shared/constants'

export class FileSystemService {
  private watchers: Map<string, fsSync.FSWatcher> = new Map()
  private workspaceRoot: string | null = null

  /**
   * Set the workspace root for path validation.
   * All file operations will be restricted to this directory.
   */
  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = path.resolve(root)
  }

  /**
   * Validate that a file path is within the workspace root.
   * Throws if the path escapes the workspace boundary.
   */
  private validatePath(filePath: string): void {
    if (!this.workspaceRoot) return
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(this.workspaceRoot + path.sep) && resolved !== this.workspaceRoot) {
      throw new Error(`Access denied: path "${filePath}" is outside workspace`)
    }
  }

  /**
   * Read a single level of a directory (no recursion).
   * Filters out entries matching ignorePatterns.
   * Directories are returned with children = undefined (lazy load).
   */
  async readDirectoryShallow(
    dirPath: string,
    ignorePatterns?: string[]
  ): Promise<FileTreeNode[]> {
    this.validatePath(dirPath)
    const patterns = ignorePatterns ?? DEFAULT_IGNORE_PATTERNS
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes: FileTreeNode[] = []

    for (const entry of entries) {
      // Skip hidden/ignored entries
      if (patterns.includes(entry.name)) continue

      const fullPath = path.join(dirPath, entry.name)
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : 'file'
        // children intentionally omitted for lazy loading
      })
    }

    // Sort: directories first, then files, alphabetically within each group
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return nodes
  }

  /**
   * Recursively list all file paths under a directory.
   * Skips directories matching ignorePatterns.
   * Returns a flat array of absolute file paths.
   */
  async listAllFiles(
    dirPath: string,
    ignorePatterns?: string[]
  ): Promise<string[]> {
    this.validatePath(dirPath)
    const patterns = ignorePatterns ?? DEFAULT_IGNORE_PATTERNS
    const results: string[] = []

    const walk = async (dir: string): Promise<void> => {
      let entries: import('fs').Dirent[]
      try {
        entries = await fs.readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        if (patterns.includes(entry.name)) continue
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else {
          results.push(fullPath)
        }
      }
    }

    await walk(dirPath)
    return results
  }

  /**
   * @deprecated Use readDirectoryShallow for lazy loading. Kept for backward compat.
   */
  async readDirectory(dirPath: string): Promise<FileTreeNode[]> {
    return this.readDirectoryShallow(dirPath)
  }

  /**
   * Load .gitignore patterns from a directory.
   * Returns an array of pattern strings (simple name matching, not full glob).
   */
  async loadGitignore(rootPath: string): Promise<string[]> {
    try {
      const gitignorePath = path.join(rootPath, '.gitignore')
      const content = await fs.readFile(gitignorePath, 'utf-8')
      return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .map((line) => line.replace(/\/$/, '')) // strip trailing slash
    } catch {
      return []
    }
  }

  async createFile(filePath: string, content?: string): Promise<void> {
    this.validatePath(filePath)
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, content ?? '', 'utf-8')
  }

  async createDirectory(dirPath: string): Promise<void> {
    this.validatePath(dirPath)
    await fs.mkdir(dirPath, { recursive: true })
  }

  async readFile(filePath: string): Promise<string> {
    this.validatePath(filePath)
    return fs.readFile(filePath, 'utf-8')
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.validatePath(filePath)
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
  }

  async deleteFile(filePath: string): Promise<void> {
    this.validatePath(filePath)
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true })
    } else {
      await fs.unlink(filePath)
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    this.validatePath(oldPath)
    this.validatePath(newPath)
    const dir = path.dirname(newPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.rename(oldPath, newPath)
  }

  watchDirectory(
    dirPath: string,
    callback: (event: FileChangeEvent) => void
  ): void {
    this.stopWatching(dirPath)

    const watcher = fsSync.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return

      const fullPath = path.join(dirPath, filename)
      let changeType: FileChangeEvent['eventType']

      if (eventType === 'rename') {
        try {
          fsSync.accessSync(fullPath)
          changeType = 'create'
        } catch {
          changeType = 'delete'
        }
      } else {
        changeType = 'update'
      }

      callback({ eventType: changeType, path: fullPath })
    })

    this.watchers.set(dirPath, watcher)
  }

  stopWatching(dirPath: string): void {
    const watcher = this.watchers.get(dirPath)
    if (watcher) {
      watcher.close()
      this.watchers.delete(dirPath)
    }
  }

  stopAllWatchers(): void {
    for (const [, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
  }
}
