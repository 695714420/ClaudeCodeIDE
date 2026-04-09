import ElectronStore from 'electron-store'
import * as fs from 'fs'
import type { HistoryRecord, CodeSnippet } from '../../shared/types'

const HISTORY_KEY = 'historyRecords'
const SNIPPETS_KEY = 'codeSnippets'
const SESSIONS_KEY = 'chatSessions'
const MAX_HISTORY_RECORDS = 500
const MAX_RECORD_CONTENT_SIZE = 100 * 1024 // 100KB
const MAX_STORAGE_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * CacheManager — Manages history records and code snippet caching.
 *
 * Uses electron-store for local persistence.
 * Req 13.1: Save each API call history with instruction, result, timestamp.
 * Req 16.1: Cache code snippets and API results locally.
 */
export class CacheManager {
  private store: ElectronStore

  constructor(store?: ElectronStore) {
    this.store =
      store ??
      new ElectronStore({
        name: 'claudecode-cache'
      })
    this.checkStorageSize()
  }

  /**
   * Check storage file size and warn if it exceeds 50MB.
   * Runs asynchronously (fire-and-forget) from the constructor.
   */
  private checkStorageSize(): void {
    try {
      const filePath = (this.store as any).path
      if (!filePath) return
      fs.stat(filePath, (err, stats) => {
        if (err) return // File may not exist yet — no warning needed
        if (stats.size > MAX_STORAGE_FILE_SIZE) {
          console.warn(
            `Cache storage file exceeds 50MB (${(stats.size / (1024 * 1024)).toFixed(1)}MB), consider clearing history`
          )
        }
      })
    } catch {
      // Ignore errors — store.path may not be available in test environments
    }
  }

  /**
   * Save a history record.
   * Enforces max record count (500) and max content size (100KB).
   */
  async saveHistoryRecord(record: HistoryRecord): Promise<void> {
    // Truncate oversized content
    if (record.result.content.length > MAX_RECORD_CONTENT_SIZE) {
      record = {
        ...record,
        result: {
          ...record.result,
          content: record.result.content.slice(0, MAX_RECORD_CONTENT_SIZE) + '\n...[truncated]'
        }
      }
    }

    const records = this.getRecordsFromStore()
    records.push(record)

    // Evict oldest records if over limit
    if (records.length > MAX_HISTORY_RECORDS) {
      records.sort((a, b) => b.createdAt - a.createdAt)
      records.length = MAX_HISTORY_RECORDS
    }

    this.store.set(HISTORY_KEY, records)
  }

  /**
   * Get history records, optionally filtered by a query string.
   * When query is provided, filters records where instruction or result.content
   * contains the query string (case-insensitive).
   * Returns records sorted by createdAt descending.
   */
  async getHistoryRecords(query?: string): Promise<HistoryRecord[]> {
    let records = this.getRecordsFromStore()

    if (query && query.trim().length > 0) {
      const lowerQuery = query.toLowerCase()
      records = records.filter(
        (r) =>
          r.instruction.toLowerCase().includes(lowerQuery) ||
          r.result.content.toLowerCase().includes(lowerQuery)
      )
    }

    return records.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Delete a single history record by id.
   */
  async deleteHistoryRecord(id: string): Promise<void> {
    const records = this.getRecordsFromStore()
    const filtered = records.filter((r) => r.id !== id)
    this.store.set(HISTORY_KEY, filtered)
  }

  /**
   * Clear all history records.
   */
  async clearHistory(): Promise<void> {
    this.store.set(HISTORY_KEY, [])
  }

  /**
   * Save a code snippet to the cache.
   */
  async saveCodeSnippet(snippet: CodeSnippet): Promise<void> {
    const snippets = this.getSnippetsFromStore()
    snippets.push(snippet)
    this.store.set(SNIPPETS_KEY, snippets)
  }

  /**
   * Get all cached code snippets.
   */
  async getCodeSnippets(): Promise<CodeSnippet[]> {
    return this.getSnippetsFromStore()
  }

  // --- Sessions ---

  async saveSessions(sessions: unknown): Promise<void> {
    this.store.set(SESSIONS_KEY, sessions)
  }

  async loadSessions(): Promise<unknown> {
    return this.store.get(SESSIONS_KEY) ?? []
  }

  // --- Settings ---

  async saveSettings(settings: unknown): Promise<void> {
    this.store.set('userSettings', settings)
  }

  async loadSettings(): Promise<unknown> {
    return this.store.get('userSettings') ?? null
  }

  // --- Private helpers ---

  private getRecordsFromStore(): HistoryRecord[] {
    return (this.store.get(HISTORY_KEY) as HistoryRecord[] | undefined) ?? []
  }

  private getSnippetsFromStore(): CodeSnippet[] {
    return (this.store.get(SNIPPETS_KEY) as CodeSnippet[] | undefined) ?? []
  }
}
