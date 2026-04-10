import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './TerminalPanel.css'

interface TerminalTab {
  id: string
  title: string
  output: string
  alive: boolean
}

export interface TerminalPanelProps {
  cwd: string
  visible: boolean
  onToggle: () => void
}

export function TerminalPanel({ cwd, visible, onToggle }: TerminalPanelProps): JSX.Element | null {
  const state = useAppState()
  const lang = (state.settings.language ?? 'en') as Lang
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [tabs, activeTabId])

  // Listen for terminal data and exit events
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onTerminalData) return

    api.onTerminalData((id: string, data: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === id ? { ...tab, output: tab.output + data } : tab
        )
      )
    })

    api.onTerminalExit((id: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === id ? { ...tab, alive: false, output: tab.output + '\r\n[Process exited]\r\n' } : tab
        )
      )
    })

    return () => {
      api.removeTerminalListeners?.()
    }
  }, [])

  const createTerminal = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.terminalCreate) return
    const id = await api.terminalCreate(cwd)
    const newTab: TerminalTab = {
      id,
      title: `Terminal ${tabs.length + 1}`,
      output: '',
      alive: true
    }
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(id)
  }, [cwd, tabs.length])

  const closeTerminal = useCallback(async (id: string) => {
    const api = window.electronAPI
    if (api?.terminalClose) {
      await api.terminalClose(id)
    }
    setTabs((prev) => {
      const remaining = prev.filter((tab) => tab.id !== id)
      if (activeTabId === id) {
        setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
      }
      return remaining
    })
  }, [activeTabId])

  const sendInput = useCallback(async () => {
    if (!activeTabId || !inputValue) return
    const api = window.electronAPI
    if (!api?.terminalWrite) return

    const activeTab = tabs.find((t) => t.id === activeTabId)
    if (!activeTab?.alive) return

    await api.terminalWrite(activeTabId, inputValue + '\n')
    setCommandHistory((prev) => [...prev, inputValue])
    setHistoryIndex(-1)
    setInputValue('')
  }, [activeTabId, inputValue, tabs])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendInput()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInputValue('')
      }
    }
  }, [sendInput, commandHistory, historyIndex])

  // Auto-create first terminal when panel becomes visible
  useEffect(() => {
    if (visible && tabs.length === 0) {
      createTerminal()
    }
  }, [visible, tabs.length, createTerminal])

  if (!visible) return null

  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className="terminal-panel" data-testid="terminal-panel">
      <div className="terminal-panel-header">
        <div className="terminal-tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`terminal-tab${tab.id === activeTabId ? ' active' : ''}${!tab.alive ? ' exited' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="terminal-tab-title">{tab.title}</span>
              <button
                className="terminal-tab-close"
                onClick={(e) => { e.stopPropagation(); closeTerminal(tab.id) }}
                aria-label={t('terminal.close', lang)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            className="terminal-new-btn"
            onClick={createTerminal}
            aria-label={t('terminal.new', lang)}
            title={t('terminal.new', lang)}
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          className="terminal-toggle-btn"
          onClick={onToggle}
          aria-label={t('terminal.close', lang)}
        >
          <X size={12} />
        </button>
      </div>
      <div className="terminal-panel-body">
        {activeTab ? (
          <>
            <pre className="terminal-output" ref={outputRef}>
              {activeTab.output}
            </pre>
            <div className="terminal-input-row">
              <span className="terminal-prompt">$</span>
              <input
                ref={inputRef}
                className="terminal-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!activeTab.alive}
                placeholder={activeTab.alive ? t('terminal.typeCommand', lang) : t('terminal.processExited', lang)}
                autoFocus
                aria-label="Terminal input"
              />
            </div>
          </>
        ) : (
          <div className="terminal-empty">{t('terminal.noTerminal', lang)}</div>
        )}
      </div>
    </div>
  )
}
