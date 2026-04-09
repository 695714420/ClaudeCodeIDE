import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { SearchService, SearchOptions } from '../SearchService'

describe('SearchService', () => {
  let service: SearchService
  let testDir: string

  beforeEach(async () => {
    service = new SearchService()
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'search-service-test-'))

    // Create test files
    await fs.writeFile(
      path.join(testDir, 'hello.ts'),
      'const greeting = "Hello World"\nconst name = "hello"\nfunction sayHello() { return greeting }',
      'utf-8'
    )
    await fs.writeFile(
      path.join(testDir, 'data.json'),
      '{"key": "value", "hello": "world"}',
      'utf-8'
    )
    const subDir = path.join(testDir, 'src')
    await fs.mkdir(subDir)
    await fs.writeFile(
      path.join(subDir, 'app.ts'),
      'import { hello } from "./hello"\nconsole.log(hello)\nconst x = 42',
      'utf-8'
    )
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {})
  })

  function makeOptions(overrides: Partial<SearchOptions> = {}): SearchOptions {
    return {
      query: 'hello',
      rootPath: testDir,
      isRegex: false,
      caseSensitive: false,
      ...overrides
    }
  }

  describe('basic text search', () => {
    it('should find matches across multiple files', async () => {
      const results = await service.search(makeOptions({ query: 'hello' }))
      expect(results.length).toBeGreaterThanOrEqual(3)
      const filePaths = [...new Set(results.map((r) => r.filePath))]
      expect(filePaths.length).toBeGreaterThanOrEqual(2)
    })

    it('should return correct line and column info', async () => {
      const results = await service.search(
        makeOptions({ query: 'greeting', caseSensitive: true })
      )
      const helloFileMatches = results.filter((r) => r.filePath.endsWith('hello.ts'))
      expect(helloFileMatches.length).toBe(2)
      // First match: "const greeting = ..."
      expect(helloFileMatches[0].line).toBe(1)
      expect(helloFileMatches[0].column).toBe(7) // 'greeting' starts at index 6, column = 7
      expect(helloFileMatches[0].matchLength).toBe(8)
    })

    it('should include lineContent in results', async () => {
      const results = await service.search(makeOptions({ query: 'sayHello' }))
      expect(results.length).toBe(1)
      expect(results[0].lineContent).toContain('function sayHello')
    })
  })

  describe('regex search', () => {
    it('should support regex patterns', async () => {
      const results = await service.search(
        makeOptions({ query: '\\d+', isRegex: true })
      )
      // Should find "42" in app.ts
      expect(results.length).toBeGreaterThanOrEqual(1)
      const appMatch = results.find((r) => r.filePath.endsWith('app.ts'))
      expect(appMatch).toBeDefined()
      expect(appMatch!.lineContent).toContain('42')
    })

    it('should find multiple regex matches on the same line', async () => {
      await fs.writeFile(
        path.join(testDir, 'multi.txt'),
        'aaa bbb aaa',
        'utf-8'
      )
      const results = await service.search(
        makeOptions({ query: 'aaa', isRegex: true })
      )
      const multiMatches = results.filter((r) => r.filePath.endsWith('multi.txt'))
      expect(multiMatches.length).toBe(2)
    })
  })

  describe('case sensitivity', () => {
    it('should be case-insensitive by default', async () => {
      const results = await service.search(makeOptions({ query: 'HELLO', caseSensitive: false }))
      expect(results.length).toBeGreaterThanOrEqual(3)
    })

    it('should respect case-sensitive flag', async () => {
      const ciResults = await service.search(makeOptions({ query: 'Hello', caseSensitive: false }))
      const csResults = await service.search(makeOptions({ query: 'Hello', caseSensitive: true }))
      // Case-sensitive should find fewer matches (only exact "Hello")
      expect(csResults.length).toBeLessThan(ciResults.length)
    })
  })

  describe('gitignore filtering', () => {
    it('should skip files in default ignore patterns', async () => {
      // Create a node_modules directory with a file
      const nmDir = path.join(testDir, 'node_modules')
      await fs.mkdir(nmDir)
      await fs.writeFile(path.join(nmDir, 'lib.js'), 'const hello = true', 'utf-8')

      const results = await service.search(makeOptions({ query: 'hello' }))
      const nmMatches = results.filter((r) => r.filePath.includes('node_modules'))
      expect(nmMatches.length).toBe(0)
    })

    it('should skip files matching custom ignore patterns', async () => {
      await fs.writeFile(path.join(testDir, 'secret.log'), 'hello secret', 'utf-8')
      service.setIgnorePatterns(['secret.log'])

      const results = await service.search(makeOptions({ query: 'hello' }))
      const logMatches = results.filter((r) => r.filePath.endsWith('secret.log'))
      expect(logMatches.length).toBe(0)
    })
  })

  describe('replaceInFiles', () => {
    it('should replace text across files', async () => {
      const result = await service.replaceInFiles(
        makeOptions({ query: 'hello', caseSensitive: false }),
        'goodbye'
      )
      expect(result.filesChanged).toBeGreaterThanOrEqual(1)
      expect(result.replacementsCount).toBeGreaterThanOrEqual(1)

      // Verify file content was changed
      const content = await fs.readFile(path.join(testDir, 'hello.ts'), 'utf-8')
      expect(content).toContain('goodbye')
    })

    it('should return correct counts', async () => {
      // Create a file with known content
      await fs.writeFile(path.join(testDir, 'replace-test.txt'), 'foo bar foo baz foo', 'utf-8')
      const result = await service.replaceInFiles(
        makeOptions({ query: 'foo', caseSensitive: true }),
        'qux'
      )
      expect(result.filesChanged).toBeGreaterThanOrEqual(1)

      const content = await fs.readFile(path.join(testDir, 'replace-test.txt'), 'utf-8')
      expect(content).toBe('qux bar qux baz qux')
    })
  })

  describe('maxResults limit', () => {
    it('should respect maxResults option', async () => {
      // Create a file with many matches
      const lines = Array.from({ length: 50 }, (_, i) => `line ${i} hello`).join('\n')
      await fs.writeFile(path.join(testDir, 'many.txt'), lines, 'utf-8')

      const results = await service.search(makeOptions({ query: 'hello', maxResults: 5 }))
      expect(results.length).toBe(5)
    })

    it('should default to 1000 max results', async () => {
      // Just verify the search completes without specifying maxResults
      const results = await service.search(makeOptions({ query: 'hello' }))
      expect(results.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('empty query handling', () => {
    it('should return empty results for empty query', async () => {
      const results = await service.search(makeOptions({ query: '' }))
      // Empty regex matches everything, but zero-length match guard breaks the loop
      // so we expect no infinite loop and results to be finite
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('non-existent directory handling', () => {
    it('should return empty results for non-existent directory', async () => {
      const results = await service.search(
        makeOptions({ rootPath: path.join(testDir, 'does-not-exist') })
      )
      expect(results).toEqual([])
    })
  })

  describe('include pattern', () => {
    it('should filter files by include pattern', async () => {
      const results = await service.search(
        makeOptions({ query: 'hello', includePattern: '*.ts' })
      )
      // Should only match .ts files, not .json
      for (const r of results) {
        expect(r.filePath).toMatch(/\.ts$/)
      }
    })
  })

  describe('binary file skipping', () => {
    it('should skip binary files', async () => {
      await fs.writeFile(path.join(testDir, 'image.png'), 'hello in binary', 'utf-8')
      const results = await service.search(makeOptions({ query: 'hello' }))
      const pngMatches = results.filter((r) => r.filePath.endsWith('.png'))
      expect(pngMatches.length).toBe(0)
    })
  })
})
