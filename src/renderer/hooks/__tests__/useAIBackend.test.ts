import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { AppProvider } from '../../store/AppContext'
import { useAIBackend } from '../useAIBackend'

const mockElectronAPI = {
  executeCli: jest.fn(),
  cancelCli: jest.fn(),
  checkCliStatus: jest.fn(),
  onCliStreamEvent: jest.fn(),
  removeCliStreamListener: jest.fn(),
  getHistoryRecords: jest.fn(),
  saveHistoryRecord: jest.fn(),
  deleteHistoryRecord: jest.fn(),
  clearHistory: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  getCodeSnippets: jest.fn(),
  saveCodeSnippet: jest.fn(),
  readDirectory: jest.fn(),
  createFile: jest.fn(),
  createDirectory: jest.fn(),
  deleteFile: jest.fn(),
  renameFile: jest.fn(),
  watchDirectory: jest.fn(),
  onFileChange: jest.fn(),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  listBackends: jest.fn(),
  checkBackendStatus: jest.fn()
}

Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true, configurable: true })
Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn().mockResolvedValue(undefined) }, writable: true, configurable: true })

function wrapper({ children }: { children: React.ReactNode }): JSX.Element {
  return React.createElement(AppProvider, null, children)
}

describe('useAIBackend', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockElectronAPI.getHistoryRecords.mockResolvedValue([])
    mockElectronAPI.saveHistoryRecord.mockResolvedValue(undefined)
    mockElectronAPI.deleteHistoryRecord.mockResolvedValue(undefined)
    mockElectronAPI.executeCli.mockResolvedValue(undefined)
    mockElectronAPI.cancelCli.mockResolvedValue(undefined)
    mockElectronAPI.checkCliStatus.mockResolvedValue({ available: true, version: '2.1.90' })
    mockElectronAPI.listBackends.mockResolvedValue([
      { id: 'claude', name: 'Claude Code', cliCommand: 'claude' },
      { id: 'codex', name: 'Codex', cliCommand: 'codex' }
    ])
  })

  it('should initialize and auto-check CLI status on mount', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    // Auto-check runs on mount, so status should be updated from mock
    expect(result.current.cliStatus).toEqual({ available: true, version: '2.1.90' })
    expect(result.current.historyRecords).toEqual([])
    expect(result.current.showDiff).toBe(false)
    expect(result.current.streamingText).toBe('')
    expect(result.current.isStreaming).toBe(false)
  })

  it('should register stream event listener on mount', async () => {
    renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(mockElectronAPI.onCliStreamEvent).toHaveBeenCalledTimes(1)
    expect(mockElectronAPI.onCliStreamEvent).toHaveBeenCalledWith(expect.any(Function))
  })

  it('should remove stream event listener on unmount', async () => {
    const { unmount } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    unmount()
    expect(mockElectronAPI.removeCliStreamListener).toHaveBeenCalled()
  })

  it('should check CLI status and update state', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.checkCliStatus() })
    expect(mockElectronAPI.checkCliStatus).toHaveBeenCalled()
    expect(result.current.cliStatus).toEqual({ available: true, version: '2.1.90' })
  })

  it('should handle CLI status check failure', async () => {
    mockElectronAPI.checkCliStatus.mockRejectedValue(new Error('not found'))
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    // Both auto-check on mount and explicit call fail
    await act(async () => { await result.current.checkCliStatus() })
    expect(result.current.cliStatus).toEqual({ available: false })
  })

  it('should call cancelCli with activeBackend', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.cancelRequest() })
    expect(mockElectronAPI.cancelCli).toHaveBeenCalledWith('claude')
  })

  it('should call executeCli on generate with activeBackend', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.generate('print hello world') })
    expect(mockElectronAPI.executeCli).toHaveBeenCalledTimes(1)
    expect(mockElectronAPI.executeCli).toHaveBeenCalledWith(expect.stringContaining('print hello world'), '.', 'claude')
  })

  it('should not call executeCli when no selection for optimize', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.optimize() })
    expect(mockElectronAPI.executeCli).not.toHaveBeenCalled()
  })

  it('should not call executeCli when no selection for fixBug', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.fixBug() })
    expect(mockElectronAPI.executeCli).not.toHaveBeenCalled()
  })

  it('should not call executeCli when no selection for explain', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.explain() })
    expect(mockElectronAPI.executeCli).not.toHaveBeenCalled()
  })

  it('should call executeCli for syntax check with activeBackend', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => {
      await result.current.checkSyntax([{ line: 1, column: 1, endLine: 1, endColumn: 5, message: 'err', severity: 'error' }])
    })
    expect(mockElectronAPI.executeCli).toHaveBeenCalledTimes(1)
    expect(mockElectronAPI.executeCli).toHaveBeenCalledWith(expect.stringContaining('Fix syntax errors'), '.', 'claude')
  })

  it('should call executeCli with custom instruction and activeBackend', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.customRequest('explain this concept') })
    expect(mockElectronAPI.executeCli).toHaveBeenCalledTimes(1)
    expect(mockElectronAPI.executeCli).toHaveBeenCalledWith(expect.stringContaining('explain this concept'), '.', 'claude')
  })

  it('should not call executeCli when no active file for formatAndOptimize', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.formatAndOptimize() })
    expect(mockElectronAPI.executeCli).not.toHaveBeenCalled()
  })

  it('should search history records', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.searchHistory('test') })
    expect(mockElectronAPI.getHistoryRecords).toHaveBeenCalledWith('test')
  })

  it('should delete a history record', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.deleteHistoryRecord('record-1') })
    expect(mockElectronAPI.deleteHistoryRecord).toHaveBeenCalledWith('record-1')
  })

  it('should not copy when no result', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    act(() => { result.current.copyResult() })
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('should pass activeBackend to checkCliStatus', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.checkCliStatus() })
    expect(mockElectronAPI.checkCliStatus).toHaveBeenCalledWith('claude')
  })

  it('should load backends on mount', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    expect(mockElectronAPI.listBackends).toHaveBeenCalled()
    expect(result.current.backends).toEqual([
      { id: 'claude', name: 'Claude Code', cliCommand: 'claude' },
      { id: 'codex', name: 'Codex', cliCommand: 'codex' }
    ])
  })

  it('should switch backend and check status', async () => {
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.switchBackend('codex') })
    expect(mockElectronAPI.checkCliStatus).toHaveBeenCalledWith('codex')
  })

  it('should handle switchBackend status check failure', async () => {
    mockElectronAPI.checkCliStatus.mockRejectedValue(new Error('not found'))
    const { result } = renderHook(() => useAIBackend(), { wrapper })
    await act(async () => { await new Promise((r) => setTimeout(r, 10)) })
    await act(async () => { await result.current.switchBackend('codex') })
    expect(result.current.cliStatus).toEqual({ available: false })
  })
})
