import * as fs from 'fs'
import { CacheManager } from '../CacheManager'
import type { HistoryRecord, CodeSnippet, ApiResult } from '../../../shared/types'

// Mock electron-store at module level to avoid Electron dependency
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => {
    const data = new Map<string, unknown>()
    return {
      get: (key: string) => data.get(key),
      set: (key: string, value: unknown) => data.set(key, value),
      delete: (key: string) => data.delete(key),
      has: (key: string) => data.has(key)
    }
  })
})

jest.mock('fs')

/**
 * Mock electron-store as a simple in-memory Map-based store.
 * Same pattern as KeyManager tests.
 */
function createMockStore(): any {
  const data = new Map<string, unknown>()
  return {
    get: (key: string) => data.get(key),
    set: (key: string, value: unknown) => data.set(key, value),
    delete: (key: string) => data.delete(key),
    has: (key: string) => data.has(key)
  }
}

function makeApiResult(overrides?: Partial<ApiResult>): ApiResult {
  return {
    id: 'result-1',
    type: 'generate',
    success: true,
    content: 'console.log("hello")',
    timestamp: Date.now(),
    ...overrides
  }
}

function makeHistoryRecord(overrides?: Partial<HistoryRecord>): HistoryRecord {
  return {
    id: 'rec-1',
    type: 'generate',
    instruction: 'Generate a hello world function',
    code: 'function hello() {}',
    language: 'javascript',
    result: makeApiResult(),
    createdAt: Date.now(),
    ...overrides
  }
}

function makeCodeSnippet(overrides?: Partial<CodeSnippet>): CodeSnippet {
  return {
    id: 'snip-1',
    code: 'const x = 1;',
    language: 'javascript',
    description: 'A simple variable',
    source: 'generated',
    createdAt: Date.now(),
    ...overrides
  }
}

describe('CacheManager', () => {
  let cacheManager: CacheManager
  let mockStore: ReturnType<typeof createMockStore>

  beforeEach(() => {
    mockStore = createMockStore()
    cacheManager = new CacheManager(mockStore)
  })

  // --- History Records ---

  describe('saveHistoryRecord', () => {
    it('should save a history record', async () => {
      const record = makeHistoryRecord()
      await cacheManager.saveHistoryRecord(record)
      const records = await cacheManager.getHistoryRecords()
      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('rec-1')
    })

    it('should append multiple records', async () => {
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'rec-1' }))
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'rec-2' }))
      const records = await cacheManager.getHistoryRecords()
      expect(records).toHaveLength(2)
    })
  })

  describe('getHistoryRecords', () => {
    it('should return empty array when no records exist', async () => {
      const records = await cacheManager.getHistoryRecords()
      expect(records).toEqual([])
    })

    it('should return records sorted by createdAt descending', async () => {
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'old', createdAt: 1000 }))
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'new', createdAt: 3000 }))
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'mid', createdAt: 2000 }))

      const records = await cacheManager.getHistoryRecords()
      expect(records.map((r) => r.id)).toEqual(['new', 'mid', 'old'])
    })

    it('should filter by query in instruction (case-insensitive)', async () => {
      await cacheManager.saveHistoryRecord(
        makeHistoryRecord({
          id: 'r1',
          instruction: 'Generate a Hello World function',
          result: makeApiResult({ content: 'function greet() {}' })
        })
      )
      await cacheManager.saveHistoryRecord(
        makeHistoryRecord({
          id: 'r2',
          instruction: 'Optimize sorting algorithm',
          result: makeApiResult({ content: 'function sort() {}' })
        })
      )

      const results = await cacheManager.getHistoryRecords('hello')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('r1')
    })

    it('should filter by query in result.content (case-insensitive)', async () => {
      await cacheManager.saveHistoryRecord(
        makeHistoryRecord({
          id: 'r1',
          instruction: 'some instruction',
          result: makeApiResult({ content: 'function bubbleSort() {}' })
        })
      )
      await cacheManager.saveHistoryRecord(
        makeHistoryRecord({
          id: 'r2',
          instruction: 'another instruction',
          result: makeApiResult({ content: 'console.log("test")' })
        })
      )

      const results = await cacheManager.getHistoryRecords('BUBBLESORT')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('r1')
    })

    it('should return all records when query is empty string', async () => {
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r1' }))
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r2' }))

      const results = await cacheManager.getHistoryRecords('')
      expect(results).toHaveLength(2)
    })

    it('should return all records when query is whitespace only', async () => {
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r1' }))
      const results = await cacheManager.getHistoryRecords('   ')
      expect(results).toHaveLength(1)
    })
  })

  describe('deleteHistoryRecord', () => {
    it('should delete a specific record by id', async () => {
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r1' }))
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r2' }))

      await cacheManager.deleteHistoryRecord('r1')
      const records = await cacheManager.getHistoryRecords()
      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('r2')
    })

    it('should not throw when deleting a non-existent id', async () => {
      await expect(cacheManager.deleteHistoryRecord('non-existent')).resolves.not.toThrow()
    })
  })

  describe('clearHistory', () => {
    it('should remove all history records', async () => {
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r1' }))
      await cacheManager.saveHistoryRecord(makeHistoryRecord({ id: 'r2' }))

      await cacheManager.clearHistory()
      const records = await cacheManager.getHistoryRecords()
      expect(records).toEqual([])
    })
  })

  // --- Code Snippets ---

  describe('saveCodeSnippet', () => {
    it('should save a code snippet', async () => {
      const snippet = makeCodeSnippet()
      await cacheManager.saveCodeSnippet(snippet)
      const snippets = await cacheManager.getCodeSnippets()
      expect(snippets).toHaveLength(1)
      expect(snippets[0].id).toBe('snip-1')
    })

    it('should append multiple snippets', async () => {
      await cacheManager.saveCodeSnippet(makeCodeSnippet({ id: 's1' }))
      await cacheManager.saveCodeSnippet(makeCodeSnippet({ id: 's2' }))
      const snippets = await cacheManager.getCodeSnippets()
      expect(snippets).toHaveLength(2)
    })
  })

  describe('getCodeSnippets', () => {
    it('should return empty array when no snippets exist', async () => {
      const snippets = await cacheManager.getCodeSnippets()
      expect(snippets).toEqual([])
    })
  })

  // --- Round-trip ---

  describe('history record round-trip', () => {
    it('should preserve all fields after save and retrieve', async () => {
      const record = makeHistoryRecord({
        id: 'rt-1',
        type: 'optimize',
        instruction: 'Optimize this code',
        code: 'for(let i=0;i<n;i++){}',
        language: 'typescript',
        result: makeApiResult({
          id: 'res-rt',
          type: 'optimize',
          success: true,
          content: 'for(let i=0; i<n; i++) {}',
          originalCode: 'for(let i=0;i<n;i++){}',
          timestamp: 1700000000
        }),
        createdAt: 1700000000
      })

      await cacheManager.saveHistoryRecord(record)
      const records = await cacheManager.getHistoryRecords()
      expect(records[0]).toEqual(record)
    })
  })

  describe('code snippet round-trip', () => {
    it('should preserve all fields after save and retrieve', async () => {
      const snippet = makeCodeSnippet({
        id: 'srt-1',
        code: 'function add(a, b) { return a + b; }',
        language: 'javascript',
        description: 'Simple add function',
        source: 'optimized',
        createdAt: 1700000000
      })

      await cacheManager.saveCodeSnippet(snippet)
      const snippets = await cacheManager.getCodeSnippets()
      expect(snippets[0]).toEqual(snippet)
    })
  })

  // --- Data Governance ---

  describe('record count limit', () => {
    it('should trim oldest records when exceeding 500', async () => {
      // Insert 501 records with ascending createdAt
      for (let i = 0; i < 501; i++) {
        await cacheManager.saveHistoryRecord(
          makeHistoryRecord({ id: `rec-${i}`, createdAt: i })
        )
      }

      const records = await cacheManager.getHistoryRecords()
      expect(records).toHaveLength(500)
      // The oldest record (createdAt=0, id=rec-0) should have been evicted
      const ids = records.map((r) => r.id)
      expect(ids).not.toContain('rec-0')
      // The newest record should still be present
      expect(ids).toContain('rec-500')
    })
  })

  describe('single record size limit', () => {
    it('should truncate content exceeding 100KB', async () => {
      const largeContent = 'x'.repeat(200 * 1024) // 200KB
      const record = makeHistoryRecord({
        id: 'large-rec',
        result: makeApiResult({ content: largeContent })
      })

      await cacheManager.saveHistoryRecord(record)
      const records = await cacheManager.getHistoryRecords()
      expect(records).toHaveLength(1)
      // Content should be truncated to 100KB + truncation marker
      expect(records[0].result.content.length).toBeLessThan(largeContent.length)
      expect(records[0].result.content).toContain('...[truncated]')
      // First 100KB should be preserved
      expect(records[0].result.content.startsWith('x'.repeat(100))).toBe(true)
    })

    it('should not truncate content under 100KB', async () => {
      const normalContent = 'y'.repeat(50 * 1024) // 50KB
      const record = makeHistoryRecord({
        id: 'normal-rec',
        result: makeApiResult({ content: normalContent })
      })

      await cacheManager.saveHistoryRecord(record)
      const records = await cacheManager.getHistoryRecords()
      expect(records[0].result.content).toBe(normalContent)
    })
  })

  describe('storage file size warning', () => {
    it('should warn when storage file exceeds 50MB', (done) => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockStat = fs.stat as unknown as jest.Mock

      const bigStore = createMockStore()
      bigStore.path = '/fake/path/cache.json'

      mockStat.mockImplementation((_path: string, cb: (err: null, stats: { size: number }) => void) => {
        cb(null, { size: 60 * 1024 * 1024 }) // 60MB
      })

      new CacheManager(bigStore)

      // fs.stat is async callback, give it a tick
      setTimeout(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Cache storage file exceeds 50MB')
        )
        warnSpy.mockRestore()
        done()
      }, 10)
    })

    it('should not warn when storage file is under 50MB', (done) => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockStat = fs.stat as unknown as jest.Mock

      const smallStore = createMockStore()
      smallStore.path = '/fake/path/cache.json'

      mockStat.mockImplementation((_path: string, cb: (err: null, stats: { size: number }) => void) => {
        cb(null, { size: 10 * 1024 * 1024 }) // 10MB
      })

      new CacheManager(smallStore)

      setTimeout(() => {
        expect(warnSpy).not.toHaveBeenCalled()
        warnSpy.mockRestore()
        done()
      }, 10)
    })

    it('should not warn when storage file does not exist', (done) => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const mockStat = fs.stat as unknown as jest.Mock

      const noFileStore = createMockStore()
      noFileStore.path = '/fake/path/cache.json'

      mockStat.mockImplementation((_path: string, cb: (err: Error) => void) => {
        cb(new Error('ENOENT: no such file or directory'))
      })

      new CacheManager(noFileStore)

      setTimeout(() => {
        expect(warnSpy).not.toHaveBeenCalled()
        warnSpy.mockRestore()
        done()
      }, 10)
    })
  })
})
