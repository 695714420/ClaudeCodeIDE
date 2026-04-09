import { HistoryService } from '../HistoryService'
import type { HistoryRecord, ApiResult } from '../../../shared/types'

// --- Mock window.electronAPI ---

const mockElectronAPI = {
  saveHistoryRecord: jest.fn(),
  getHistoryRecords: jest.fn(),
  deleteHistoryRecord: jest.fn(),
  clearHistory: jest.fn()
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true
})

// --- Helpers ---

function makeResult(overrides?: Partial<ApiResult>): ApiResult {
  return {
    id: 'res-1',
    type: 'generate',
    success: true,
    content: 'console.log("hello")',
    timestamp: Date.now(),
    ...overrides
  }
}

function makeRecord(overrides?: Partial<HistoryRecord>): HistoryRecord {
  return {
    id: 'rec-1',
    type: 'generate',
    instruction: 'Create a hello world function',
    code: undefined,
    language: 'javascript',
    result: makeResult(),
    createdAt: Date.now(),
    ...overrides
  }
}

describe('HistoryService', () => {
  let service: HistoryService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new HistoryService()
  })

  describe('saveRecord', () => {
    it('should delegate to window.electronAPI.saveHistoryRecord', async () => {
      const record = makeRecord()
      mockElectronAPI.saveHistoryRecord.mockResolvedValue(undefined)
      await service.saveRecord(record)
      expect(mockElectronAPI.saveHistoryRecord).toHaveBeenCalledWith(record)
      expect(mockElectronAPI.saveHistoryRecord).toHaveBeenCalledTimes(1)
    })

    it('should propagate errors from IPC', async () => {
      mockElectronAPI.saveHistoryRecord.mockRejectedValue(new Error('IPC failed'))
      await expect(service.saveRecord(makeRecord())).rejects.toThrow('IPC failed')
    })
  })

  describe('getRecords', () => {
    it('should return all records when no query is provided', async () => {
      const records = [makeRecord(), makeRecord({ id: 'rec-2' })]
      mockElectronAPI.getHistoryRecords.mockResolvedValue(records)
      const result = await service.getRecords()
      expect(mockElectronAPI.getHistoryRecords).toHaveBeenCalledWith(undefined)
      expect(result).toEqual(records)
    })

    it('should pass query to IPC when provided', async () => {
      mockElectronAPI.getHistoryRecords.mockResolvedValue([])
      await service.getRecords('hello')
      expect(mockElectronAPI.getHistoryRecords).toHaveBeenCalledWith('hello')
    })
  })

  describe('searchRecords', () => {
    it('should delegate keyword search to IPC getHistoryRecords', async () => {
      const filtered = [makeRecord()]
      mockElectronAPI.getHistoryRecords.mockResolvedValue(filtered)
      const result = await service.searchRecords('hello')
      expect(mockElectronAPI.getHistoryRecords).toHaveBeenCalledWith('hello')
      expect(result).toEqual(filtered)
    })
  })

  describe('deleteRecord', () => {
    it('should delegate to window.electronAPI.deleteHistoryRecord', async () => {
      mockElectronAPI.deleteHistoryRecord.mockResolvedValue(undefined)
      await service.deleteRecord('rec-1')
      expect(mockElectronAPI.deleteHistoryRecord).toHaveBeenCalledWith('rec-1')
    })
  })

  describe('clearHistory', () => {
    it('should delegate to window.electronAPI.clearHistory', async () => {
      mockElectronAPI.clearHistory.mockResolvedValue(undefined)
      await service.clearHistory()
      expect(mockElectronAPI.clearHistory).toHaveBeenCalledTimes(1)
    })
  })
})
