import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIChatPanel, AIChatPanelConnected } from '../AIChatPanel'
import { AppProvider, useAppState } from '../../store/AppContext'

// --- Mock window.electronAPI ---
const mockElectronAPI = {
  getHistoryRecords: jest.fn().mockResolvedValue([]),
  saveHistoryRecord: jest.fn().mockResolvedValue(undefined),
  deleteHistoryRecord: jest.fn().mockResolvedValue(undefined),
  clearHistory: jest.fn().mockResolvedValue(undefined),
  executeCli: jest.fn().mockResolvedValue(undefined),
  cancelCli: jest.fn().mockResolvedValue(undefined),
  checkCliStatus: jest.fn().mockResolvedValue({ available: false }),
  onCliStreamEvent: jest.fn(),
  removeCliStreamListener: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  getCodeSnippets: jest.fn().mockResolvedValue([]),
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

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

function StateReader({ onState }: { onState: (s: ReturnType<typeof useAppState>) => void }): null {
  const state = useAppState()
  React.useEffect(() => { onState(state) })
  return null
}

describe('AIChatPanel', () => {
  describe('Rendering', () => {
    it('should render the panel container', () => {
      render(<AppProvider><AIChatPanel isExpanded={true} onToggle={jest.fn()} /></AppProvider>)
      expect(screen.getByTestId('ai-chat-panel')).toBeInTheDocument()
    })

    it('should render the header with dynamic backend title', () => {
      render(<AppProvider><AIChatPanel isExpanded={true} onToggle={jest.fn()} /></AppProvider>)
      expect(screen.getByTestId('ai-chat-panel-header')).toBeInTheDocument()
      // Default title when no backends loaded yet should be 'AI'
      // (backends load asynchronously)
    })

    it('should render backend selector dropdown', () => {
      render(<AppProvider><AIChatPanel isExpanded={true} onToggle={jest.fn()} /></AppProvider>)
      const selector = screen.getByLabelText('Select AI Backend')
      expect(selector).toBeInTheDocument()
      expect(selector.tagName).toBe('SELECT')
    })
  })

  describe('Expand / Collapse', () => {
    it('should show chat area when expanded', () => {
      render(<AppProvider><AIChatPanel isExpanded={true} onToggle={jest.fn()} /></AppProvider>)
      expect(screen.getByTestId('ai-chat-chat-messages')).toBeInTheDocument()
    })

    it('should hide content sections when collapsed', () => {
      render(<AppProvider><AIChatPanel isExpanded={false} onToggle={jest.fn()} /></AppProvider>)
      expect(screen.queryByTestId('ai-chat-chat-messages')).not.toBeInTheDocument()
    })

    it('should call onToggle when toggle button is clicked', () => {
      const onToggle = jest.fn()
      render(<AppProvider><AIChatPanel isExpanded={true} onToggle={onToggle} /></AppProvider>)
      fireEvent.click(screen.getByTestId('ai-chat-panel-toggle'))
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Input area', () => {
    it('should render generate input field when expanded', () => {
      render(<AppProvider><AIChatPanel isExpanded={true} onToggle={jest.fn()} /></AppProvider>)
      expect(screen.getByTestId('ai-chat-generate-input')).toBeInTheDocument()
    })
  })
})

describe('AIChatPanelConnected', () => {
  it('should read rightPanelVisible from AppContext (default true)', () => {
    render(<AppProvider><AIChatPanelConnected /></AppProvider>)
    // rightPanelVisible defaults to true, so chat messages should be visible
    expect(screen.getByTestId('ai-chat-chat-messages')).toBeInTheDocument()
  })

  it('should dispatch TOGGLE_RIGHT_PANEL when toggle is clicked', () => {
    let capturedState: ReturnType<typeof useAppState> | null = null
    render(
      <AppProvider>
        <AIChatPanelConnected />
        <StateReader onState={(s) => { capturedState = s }} />
      </AppProvider>
    )
    expect(capturedState!.layout.rightPanelVisible).toBe(true)
    fireEvent.click(screen.getByTestId('ai-chat-panel-toggle'))
    expect(capturedState!.layout.rightPanelVisible).toBe(false)
  })

  it('should hide content after toggling to collapsed', () => {
    render(<AppProvider><AIChatPanelConnected /></AppProvider>)
    // Initially expanded (default true)
    expect(screen.getByTestId('ai-chat-chat-messages')).toBeInTheDocument()
    // Toggle to collapse
    fireEvent.click(screen.getByTestId('ai-chat-panel-toggle'))
    expect(screen.queryByTestId('ai-chat-chat-messages')).not.toBeInTheDocument()
  })
})
