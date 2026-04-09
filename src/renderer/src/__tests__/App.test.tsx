import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from '../App'

// --- Mock window.electronAPI ---
const mockElectronAPI = {
  executeCli: jest.fn().mockResolvedValue(undefined),
  cancelCli: jest.fn().mockResolvedValue(undefined),
  checkCliStatus: jest.fn().mockResolvedValue({ available: false }),
  onCliStreamEvent: jest.fn(),
  removeCliStreamListener: jest.fn(),
  getHistoryRecords: jest.fn().mockResolvedValue([]),
  saveHistoryRecord: jest.fn().mockResolvedValue(undefined),
  deleteHistoryRecord: jest.fn().mockResolvedValue(undefined),
  clearHistory: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  getCodeSnippets: jest.fn().mockResolvedValue([]),
  saveCodeSnippet: jest.fn(),
  readDirectory: jest.fn().mockResolvedValue([]),
  createFile: jest.fn(),
  createDirectory: jest.fn(),
  deleteFile: jest.fn(),
  renameFile: jest.fn(),
  watchDirectory: jest.fn(),
  onFileChange: jest.fn(),
  getSettings: jest.fn().mockResolvedValue({}),
  saveSettings: jest.fn().mockResolvedValue(undefined),
  loadSessions: jest.fn().mockResolvedValue([]),
  saveSessions: jest.fn().mockResolvedValue(undefined),
  listBackends: jest.fn().mockResolvedValue([
    { id: 'claude', name: 'Claude Code', cliCommand: 'claude' },
    { id: 'codex', name: 'Codex', cliCommand: 'codex' }
  ])
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Mock Monaco Editor to avoid jsdom issues
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'mock-monaco-editor' }, 'Monaco Editor')
}))

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

describe('App Component', () => {
  it('should render the app container', () => {
    render(<App />)
    expect(screen.getByTestId('app')).toBeInTheDocument()
  })

  it('should render NavBar', () => {
    render(<App />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('should render Layout with three panels', () => {
    render(<App />)
    expect(screen.getByTestId('layout-container')).toBeInTheDocument()
    expect(screen.getByTestId('layout-panel-left')).toBeInTheDocument()
    expect(screen.getByTestId('layout-panel-center')).toBeInTheDocument()
    expect(screen.getByTestId('layout-panel-right')).toBeInTheDocument()
  })

  it('should render StatusBar', () => {
    render(<App />)
    expect(screen.getByTestId('statusbar')).toBeInTheDocument()
  })

  it('should render FileExplorer in left panel', () => {
    render(<App />)
    expect(screen.getByTestId('file-explorer')).toBeInTheDocument()
  })

  it('should render sidebar tabs', () => {
    render(<App />)
    expect(screen.getByTestId('sidebar-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-tab-files')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-tab-search')).toBeInTheDocument()
  })

  it('should show FileExplorer by default and switch to SearchPanel on tab click', () => {
    render(<App />)
    // Files tab is active by default
    expect(screen.getByTestId('file-explorer')).toBeInTheDocument()
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()

    // Click search tab
    fireEvent.click(screen.getByTestId('sidebar-tab-search'))
    expect(screen.queryByTestId('file-explorer')).not.toBeInTheDocument()
    expect(screen.getByTestId('search-panel')).toBeInTheDocument()

    // Click files tab to switch back
    fireEvent.click(screen.getByTestId('sidebar-tab-files'))
    expect(screen.getByTestId('file-explorer')).toBeInTheDocument()
    expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
  })

  it('should render editor placeholder when no file is open', () => {
    render(<App />)
    expect(screen.getByTestId('editor-placeholder')).toBeInTheDocument()
  })

  it('should render AIChatPanel in right panel', () => {
    render(<App />)
    expect(screen.getByTestId('ai-chat-panel')).toBeInTheDocument()
  })

  it('should render EditorTabs', () => {
    render(<App />)
    expect(screen.getByTestId('editor-tabs')).toBeInTheDocument()
  })

  describe('Keyboard Shortcuts', () => {
    it('should toggle terminal panel when Ctrl+` is pressed', () => {
      render(<App />)
      const terminalArea = screen.getByTestId('layout-terminal-area')

      // Terminal is hidden by default
      expect(terminalArea).toHaveClass('hidden')

      // Press Ctrl+`
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: '`', ctrlKey: true, bubbles: true })
        )
      })

      expect(terminalArea).not.toHaveClass('hidden')

      // Press Ctrl+` again to hide
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: '`', ctrlKey: true, bubbles: true })
        )
      })

      expect(terminalArea).toHaveClass('hidden')
    })

    it('should not toggle terminal when ` is pressed without Ctrl', () => {
      render(<App />)
      const terminalArea = screen.getByTestId('layout-terminal-area')

      expect(terminalArea).toHaveClass('hidden')

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: '`', ctrlKey: false, bubbles: true })
        )
      })

      expect(terminalArea).toHaveClass('hidden')
    })

    it('should not toggle terminal when Ctrl+Shift+` is pressed', () => {
      render(<App />)
      const terminalArea = screen.getByTestId('layout-terminal-area')

      expect(terminalArea).toHaveClass('hidden')

      act(() => {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: '`', ctrlKey: true, shiftKey: true, bubbles: true })
        )
      })

      expect(terminalArea).toHaveClass('hidden')
    })
  })
})
