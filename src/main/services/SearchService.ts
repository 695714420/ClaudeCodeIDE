import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { DEFAULT_IGNORE_PATTERNS } from '../../shared/constants'

export interface SearchOptions {
  query: string
  rootPath: string
  isRegex: boolean
  caseSensitive: boolean
  includePattern?: string
  excludePattern?: string
  maxResults?: number
}

export interface SearchMatch {
  filePath: string
  line: number
  column: number
  lineContent: string
  matchLength: number
}

export interface ReplaceResult {
  filesChanged: number
  replacementsCount: number
}

/**
 * SearchService provides cross-file text search and replace.
 * Uses Node.js native fs + readline for streaming file reads.
 */
export class SearchService {
  private ignorePatterns: string[] = [...DEFAULT_IGNORE_PATTERNS]

  setIgnorePatterns(patterns: string[]): void {
    this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...patterns]
  }

  async search(options: SearchOptions): Promise<SearchMatch[]> {
    const maxResults = options.maxResults ?? 1000
    const results: SearchMatch[] = []
    const files = await this.collectFiles(options.rootPath, options.includePattern)

    for (const filePath of files) {
      if (results.length >= maxResults) break
      const matches = await this.searchFile(filePath, options)
      for (const match of matches) {
        results.push(match)
        if (results.length >= maxResults) break
      }
    }

    return results
  }

  async replaceInFiles(
    options: SearchOptions,
    replacement: string
  ): Promise<ReplaceResult> {
    const matches = await this.search(options)
    const fileGroups = new Map<string, SearchMatch[]>()

    for (const match of matches) {
      const group = fileGroups.get(match.filePath) || []
      group.push(match)
      fileGroups.set(match.filePath, group)
    }

    let filesChanged = 0
    let replacementsCount = 0

    for (const [filePath, fileMatches] of fileGroups) {
      const content = await fs.readFile(filePath, 'utf-8')
      const regex = this.buildRegex(options)
      const newContent = content.replace(regex, replacement)

      if (newContent !== content) {
        await fs.writeFile(filePath, newContent, 'utf-8')
        filesChanged++
        replacementsCount += fileMatches.length
      }
    }

    return { filesChanged, replacementsCount }
  }

  private async searchFile(
    filePath: string,
    options: SearchOptions
  ): Promise<SearchMatch[]> {
    const matches: SearchMatch[] = []

    try {
      const stream = fsSync.createReadStream(filePath, { encoding: 'utf-8' })
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
      const regex = this.buildRegex(options)
      let lineNum = 0

      for await (const line of rl) {
        lineNum++
        let match: RegExpExecArray | null
        // Reset lastIndex for global regex
        regex.lastIndex = 0

        while ((match = regex.exec(line)) !== null) {
          matches.push({
            filePath,
            line: lineNum,
            column: match.index + 1,
            lineContent: line,
            matchLength: match[0].length
          })
          // Avoid infinite loop for zero-length matches
          if (match[0].length === 0) break
        }
      }
    } catch {
      // Skip files that can't be read (binary, permissions, etc.)
    }

    return matches
  }

  private buildRegex(options: SearchOptions): RegExp {
    const flags = 'g' + (options.caseSensitive ? '' : 'i')
    if (options.isRegex) {
      return new RegExp(options.query, flags)
    }
    // Escape special regex characters for literal search
    const escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(escaped, flags)
  }

  private async collectFiles(
    dirPath: string,
    includePattern?: string
  ): Promise<string[]> {
    const files: string[] = []
    await this.walkDir(dirPath, files, includePattern)
    return files
  }

  private async walkDir(
    dirPath: string,
    files: string[],
    includePattern?: string
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        if (this.ignorePatterns.includes(entry.name)) continue

        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          await this.walkDir(fullPath, files, includePattern)
        } else if (entry.isFile()) {
          if (includePattern && !this.matchGlob(entry.name, includePattern)) {
            continue
          }
          // Skip likely binary files
          if (this.isBinaryExtension(entry.name)) continue
          files.push(fullPath)
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  private matchGlob(filename: string, pattern: string): boolean {
    // Simple glob matching: *.ext or exact name
    if (pattern.startsWith('*.')) {
      return filename.endsWith(pattern.slice(1))
    }
    return filename === pattern
  }

  private isBinaryExtension(filename: string): boolean {
    const binaryExts = new Set([
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
      '.woff', '.woff2', '.ttf', '.eot', '.otf',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.mp3', '.mp4', '.avi', '.mov', '.wav',
      '.pak', '.asar', '.bin', '.dat'
    ])
    const ext = path.extname(filename).toLowerCase()
    return binaryExts.has(ext)
  }
}
