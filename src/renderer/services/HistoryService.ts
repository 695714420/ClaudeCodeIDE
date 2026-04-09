import type { HistoryRecord } from '../../shared/types'

/**
 * HistoryService — thin wrapper around CacheManager IPC calls
 * for history record CRUD and search.
 */
export class HistoryService {
  /** Save a history record via IPC */
  async saveRecord(record: HistoryRecord): Promise<void> {
    return window.electronAPI.saveHistoryRecord(record)
  }

  /** Get all history records, optionally filtered by query */
  async getRecords(query?: string): Promise<HistoryRecord[]> {
    return window.electronAPI.getHistoryRecords(query)
  }

  /** Search records by keyword (delegates to main process) */
  async searchRecords(keyword: string): Promise<HistoryRecord[]> {
    return window.electronAPI.getHistoryRecords(keyword)
  }

  /** Delete a single history record by id */
  async deleteRecord(id: string): Promise<void> {
    return window.electronAPI.deleteHistoryRecord(id)
  }

  /** Clear all history records */
  async clearHistory(): Promise<void> {
    return window.electronAPI.clearHistory()
  }
}
