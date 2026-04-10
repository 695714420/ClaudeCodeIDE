import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppState, useAppDispatch, type AppAction } from '../store/AppContext'
import { useAIBackend } from '../hooks/useAIBackend'
import { HistoryPanel } from './HistoryPanel'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './AIChatPanel.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
}

interface SlashCommand {
  cmd: string
  briefKey: string
  detailKey: string
  category: 'context' | 'navigation' | 'tools' | 'config' | 'info'
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/compact', briefKey: 'slash.compact.brief', detailKey: 'slash.compact.detail', category: 'context' },
  { cmd: '/clear', briefKey: 'slash.clear.brief', detailKey: 'slash.clear.detail', category: 'context' },
  { cmd: '/context', briefKey: 'slash.context.brief', detailKey: 'slash.context.detail', category: 'context' },
  { cmd: '/cost', briefKey: 'slash.cost.brief', detailKey: 'slash.cost.detail', category: 'info' },
  { cmd: '/diff', briefKey: 'slash.diff.brief', detailKey: 'slash.diff.detail', category: 'tools' },
  { cmd: '/doctor', briefKey: 'slash.doctor.brief', detailKey: 'slash.doctor.detail', category: 'info' },
  { cmd: '/effort', briefKey: 'slash.effort.brief', detailKey: 'slash.effort.detail', category: 'config' },
  { cmd: '/export', briefKey: 'slash.export.brief', detailKey: 'slash.export.detail', category: 'tools' },
  { cmd: '/help', briefKey: 'slash.help.brief', detailKey: 'slash.help.detail', category: 'info' },
  { cmd: '/init', briefKey: 'slash.init.brief', detailKey: 'slash.init.detail', category: 'tools' },
  { cmd: '/model', briefKey: 'slash.model.brief', detailKey: 'slash.model.detail', category: 'config' },
  { cmd: '/plan', briefKey: 'slash.plan.brief', detailKey: 'slash.plan.detail', category: 'tools' },
  { cmd: '/review', briefKey: 'slash.review.brief', detailKey: 'slash.review.detail', category: 'tools' },
  { cmd: '/security-review', briefKey: 'slash.securityReview.brief', detailKey: 'slash.securityReview.detail', category: 'tools' },
  { cmd: '/memory', briefKey: 'slash.memory.brief', detailKey: 'slash.memory.detail', category: 'config' },
  { cmd: '/permissions', briefKey: 'slash.permissions.brief', detailKey: 'slash.permissions.detail', category: 'config' },
  { cmd: '/mcp', briefKey: 'slash.mcp.brief', detailKey: 'slash.mcp.detail', category: 'config' },
  { cmd: '/hooks', briefKey: 'slash.hooks.brief', detailKey: 'slash.hooks.detail', category: 'config' },
  { cmd: '/resume', briefKey: 'slash.resume.brief', detailKey: 'slash.resume.detail', category: 'navigation' },
  { cmd: '/rewind', briefKey: 'slash.rewind.brief', detailKey: 'slash.rewind.detail', category: 'navigation' },
  { cmd: '/branch', briefKey: 'slash.branch.brief', detailKey: 'slash.branch.detail', category: 'navigation' },
  { cmd: '/copy', briefKey: 'slash.copy.brief', detailKey: 'slash.copy.detail', category: 'tools' },
  { cmd: '/status', briefKey: 'slash.status.brief', detailKey: 'slash.status.detail', category: 'info' },
  { cmd: '/stats', briefKey: 'slash.stats.brief', detailKey: 'slash.stats.detail', category: 'info' },
  { cmd: '/insights', briefKey: 'slash.insights.brief', detailKey: 'slash.insights.detail', category: 'info' },
  { cmd: '/fast', briefKey: 'slash.fast.brief', detailKey: 'slash.fast.detail', category: 'config' },
  { cmd: '/vim', briefKey: 'slash.vim.brief', detailKey: 'slash.vim.detail', category: 'config' },
  { cmd: '/theme', briefKey: 'slash.theme.brief', detailKey: 'slash.theme.detail', category: 'config' },
  { cmd: '/add-dir', briefKey: 'slash.addDir.brief', detailKey: 'slash.addDir.detail', category: 'tools' },
  { cmd: '/pr-comments', briefKey: 'slash.prComments.brief', detailKey: 'slash.prComments.detail', category: 'tools' },
  { cmd: '/release-notes', briefKey: 'slash.releaseNotes.brief', detailKey: 'slash.releaseNotes.detail', category: 'info' },
]

function getCategoryLabels(lang: Lang): Record<string, string> {
  return {
    context: t('cat.context', lang),
    tools: t('cat.tools', lang),
    navigation: t('cat.navigation', lang),
    config: t('cat.config', lang),
    info: t('cat.info', lang),
  }
}

export interface AIChatPanelProps { isExpanded: boolean; onToggle: () => void }

interface ChatSession {
  id: string
  name: string
  messages: ChatMessage[]
}

/** Parsed segment of assistant content: either plain text or a fenced code block. */
interface ContentSegment {
  type: 'text' | 'code'
  content: string
  language?: string
}

/** Parse assistant content into text and code-block segments. */
function parseAssistantContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'code', content: match[2], language: match[1] || undefined })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return segments
}

/** Syntax-highlighted code block component using Monaco colorize API. */
function HighlightedCodeBlock({ code, language }: { code: string; language?: string }): JSX.Element {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    const monacoModule = (window as unknown as Record<string, unknown>).monaco as
      | { editor: { colorize: (text: string, lang: string, opts: Record<string, unknown>) => Promise<string> } }
      | undefined

    if (monacoModule && ref.current && language) {
      monacoModule.editor.colorize(code, language, { tabSize: 2 }).then((html: string) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = html
        }
      }).catch(() => { /* fallback to plain text */ })
    }
    return () => { cancelled = true }
  }, [code, language])

  return <code ref={ref} className={language ? `language-${language}` : undefined}>{code}</code>
}

// Helper: detect numbered options in assistant text and render as clickable buttons
function renderAssistantContent(
  content: string,
  sendMessage: (text: string) => void,
  claude: { customRequest: (text: string) => Promise<void> },
  dispatch: React.Dispatch<AppAction>,
  activeFilePath: string | null,
  lang: Lang
): JSX.Element {
  const segments = parseAssistantContent(content)
  const hasCodeBlocks = segments.some(s => s.type === 'code')

  // If no code blocks, use the original option-detection logic
  if (!hasCodeBlocks) {
    const lines = content.split('\n')
    const optionRegex = /^(\d+)\.\s+(.+)$/
    const options: { num: string; text: string }[] = []
    const textLines: string[] = []

    for (const line of lines) {
      const match = optionRegex.exec(line)
      if (match) {
        options.push({ num: match[1], text: match[2] })
      } else {
        textLines.push(line)
      }
    }

    const hasOptions = options.length >= 2

    return (
      <>
        <pre><code>{hasOptions ? textLines.join('\n').trimEnd() : content}</code></pre>
        {hasOptions && (
          <div className="ai-chat-options">
            {options.map((opt) => (
              <button
                key={opt.num}
                className="ai-chat-option-btn"
                onClick={() => {
                  sendMessage(opt.text)
                  claude.customRequest(opt.text)
                }}
              >
                {opt.num}. {opt.text}
              </button>
            ))}
          </div>
        )}
      </>
    )
  }

  // Render segments with code blocks having Apply buttons
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          const trimmed = seg.content.trim()
          return trimmed ? <pre key={i}><code>{trimmed}</code></pre> : null
        }
        return (
          <div key={i} className="ai-chat-codeblock-wrapper">
            <div className="ai-chat-codeblock-header">
              {seg.language && <span className="ai-chat-codeblock-lang">{seg.language}</span>}
              <button
                className="ai-chat-apply-btn"
                onClick={() => {
                  if (activeFilePath) {
                    dispatch({ type: 'UPDATE_FILE_CONTENT', payload: { path: activeFilePath, content: seg.content } })
                  }
                }}
                disabled={!activeFilePath}
                title={t('chat.apply', lang)}
              >
                {t('chat.apply', lang)}
              </button>
            </div>
            <pre className="ai-chat-codeblock">
              <HighlightedCodeBlock code={seg.content} language={seg.language} />
            </pre>
          </div>
        )
      })}
    </>
  )
}

let sessionCounter = 1

export function AIChatPanel({ isExpanded, onToggle }: AIChatPanelProps): JSX.Element {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const lang = (state.settings.language ?? 'en') as Lang
  const claude = useAIBackend()
  const [input, setInput] = useState('')
  const [sessions, setSessions] = useState<ChatSession[]>([{ id: 'session-1', name: `${t('chat.newSession', lang)} 1`, messages: [] }])
  const [activeSessionId, setActiveSessionId] = useState('session-1')
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showCommandsModal, setShowCommandsModal] = useState(false)
  const [selectedCmd, setSelectedCmd] = useState<SlashCommand | null>(null)
  const [cmdFilter, setCmdFilter] = useState('')
  const [showSlashPopup, setShowSlashPopup] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const CATEGORY_LABELS = getCategoryLabels(lang)

  // Determine active backend display name
  const activeBackendMeta = claude.backends.find(b => b.id === state.cli.activeBackend)

  // Load sessions on mount
  useEffect(() => {
    window.electronAPI.loadSessions().then((data: unknown) => {
      const loaded = data as ChatSession[] | undefined
      if (loaded && Array.isArray(loaded) && loaded.length > 0) {
        setSessions(loaded)
        setActiveSessionId(loaded[loaded.length - 1].id)
        const maxId = loaded.reduce((max, s) => {
          const num = parseInt(s.id.replace('session-', ''), 10)
          return isNaN(num) ? max : Math.max(max, num)
        }, 0)
        sessionCounter = maxId
      }
      setSessionsLoaded(true)
    }).catch(() => { setSessionsLoaded(true) })
  }, [])

  // Auto-save sessions whenever they change
  useEffect(() => {
    if (!sessionsLoaded) return
    window.electronAPI.saveSessions(sessions).catch(() => {})
  }, [sessions, sessionsLoaded])

  // Save on window close
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      window.electronAPI.saveSessions(sessions).catch(() => {})
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [sessions])
  const prevResultRef = useRef(state.cli.lastResult)

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0]
  const messages = activeSession.messages

  const setMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: updater(s.messages) } : s))
  }, [activeSessionId])

  const addNewSession = useCallback(() => {
    sessionCounter++
    const newSession: ChatSession = { id: `session-${sessionCounter}`, name: `${t('chat.newSession', lang)} ${sessionCounter}`, messages: [] }
    setSessions(prev => [...prev, newSession])
    setActiveSessionId(newSession.id)
  }, [lang])

  const closeSession = useCallback((id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id)
      if (remaining.length === 0) {
        sessionCounter++
        const fresh: ChatSession = { id: `session-${sessionCounter}`, name: `${t('chat.newSession', lang)} ${sessionCounter}`, messages: [] }
        setActiveSessionId(fresh.id)
        return [fresh]
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[remaining.length - 1].id)
      }
      return remaining
    })
  }, [activeSessionId, lang])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [state.cli.streamingText, messages])

  // Consume pending chat text from "Send to Chat" context menu action
  useEffect(() => {
    if (state.cli.pendingChatText) {
      setInput(prev => prev ? prev + '\n' + state.cli.pendingChatText : state.cli.pendingChatText!)
      dispatch({ type: 'CLEAR_PENDING_CHAT' })
    }
  }, [state.cli.pendingChatText, dispatch])

  useEffect(() => {
    const result = state.cli.lastResult
    if (result && result !== prevResultRef.current && !state.cli.isLoading) {
      setMessages(prev => [...prev, {
        id: result.id,
        role: result.success ? 'assistant' : 'error',
        content: result.success ? result.content : (result.errorExplanation || t('chat.requestFailed', lang))
      }])
    }
    prevResultRef.current = result
  }, [state.cli.lastResult, state.cli.isLoading])

  const addUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }])
  }, [])

  const handleSend = (): void => {
    const trimmed = input.trim()
    if (!trimmed || state.cli.isLoading) return
    addUserMessage(trimmed)
    claude.customRequest(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (showSlashPopup && e.key === 'Escape') { setShowSlashPopup(false); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setShowSlashPopup(false); handleSend() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const val = e.target.value
    setInput(val)
    if (val.startsWith('/') && val.indexOf(' ') === -1) {
      setSlashFilter(val.toLowerCase())
      setShowSlashPopup(true)
    } else {
      setShowSlashPopup(false)
    }
  }

  const slashPopupCmds = showSlashPopup
    ? SLASH_COMMANDS.filter(c => c.cmd.startsWith(slashFilter) || (slashFilter === '/'))
    : []

  const handleSlashSelect = (cmd: SlashCommand): void => {
    setInput(cmd.cmd + ' ')
    setShowSlashPopup(false)
  }

  const handleSlashCommand = (cmd: SlashCommand): void => {
    addUserMessage(cmd.cmd)
    claude.customRequest(cmd.cmd)
    setShowCommandsModal(false)
  }

  const filteredCmds = SLASH_COMMANDS.filter(c =>
    !cmdFilter || c.cmd.includes(cmdFilter.toLowerCase()) || t(c.briefKey, lang).includes(cmdFilter)
  )

  const groupedCmds = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    label,
    commands: filteredCmds.filter(c => c.category === key)
  })).filter(g => g.commands.length > 0)

  return (
    <div className="ai-chat-panel" data-testid="ai-chat-panel">
      <div className="ai-chat-panel-header" data-testid="ai-chat-panel-header">
        <div className="ai-chat-header-left">
          <span className="ai-chat-panel-title">{activeBackendMeta?.name || 'AI'}</span>
          <select
            className="ai-chat-backend-selector"
            value={state.cli.activeBackend}
            onChange={(e) => claude.switchBackend(e.target.value)}
            disabled={state.cli.isLoading}
            aria-label="Select AI Backend"
          >
            {claude.backends.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span className={`ai-chat-status-dot ${state.cli.status}`} />
        </div>
        <div className="ai-chat-header-actions">
          <button className="ai-chat-icon-btn" onClick={() => setShowCommandsModal(true)} title={t('chat.quickCommands', lang)} aria-label={t('chat.quickCommands', lang)}>{'\u26A1'}</button>
          <button className="ai-chat-icon-btn" onClick={() => setShowHistoryModal(true)} title={t('chat.history', lang)} aria-label={t('chat.history', lang)}>{'\uD83D\uDD50'}</button>
          <button className="ai-chat-icon-btn" onClick={() => setShowStatusModal(true)} title={t('chat.connectionStatus', lang)} aria-label={t('chat.connectionStatus', lang)}>{'\u2699'}</button>
          <button className="ai-chat-panel-toggle" onClick={onToggle} data-testid="ai-chat-panel-toggle"
            aria-label={isExpanded ? t('panel.collapse', lang) : t('panel.expand', lang)} aria-expanded={isExpanded}>
            {isExpanded ? '\u25B6' : '\u25C0'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Session tabs */}
          <div className="ai-chat-session-tabs">
            {sessions.map(s => (
              <div key={s.id} className={`ai-chat-session-tab ${s.id === activeSessionId ? 'active' : ''}`}
                onClick={() => setActiveSessionId(s.id)}>
                <span className="ai-chat-session-tab-name">{s.name}</span>
                {sessions.length > 1 && (
                  <button className="ai-chat-session-tab-close" onClick={(e) => { e.stopPropagation(); closeSession(s.id) }}>{'\u2715'}</button>
                )}
              </div>
            ))}
            <button className="ai-chat-session-add" onClick={addNewSession} title={t('chat.newChat', lang)}>+</button>
          </div>

          <div className="ai-chat-chat-messages" data-testid="ai-chat-chat-messages">
            {messages.length === 0 && !state.cli.isLoading && (
              <div className="ai-chat-welcome">
                <p>{t('chat.welcome', lang)}</p>
                <p className="ai-chat-welcome-hint">{t('chat.welcomeHint', lang)}</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-chat-message ai-chat-message-${msg.role}`}>
                <div className="ai-chat-message-label">{msg.role === 'user' ? t('chat.you', lang) : msg.role === 'error' ? t('chat.error', lang) : (activeBackendMeta?.name || 'AI')}</div>
                <div className="ai-chat-message-content">
                  {msg.role === 'user' ? <p>{msg.content}</p> : msg.role === 'error' ? <div className="ai-chat-error-text">{msg.content}</div> : renderAssistantContent(msg.content, addUserMessage, claude, dispatch, state.editor.activeFilePath, lang)}
                </div>
                {msg.role === 'assistant' && (
                  <div className="ai-chat-message-actions">
                    <button onClick={claude.copyResult}>{t('chat.copy', lang)}</button>
                    <button onClick={claude.insertResult}>{t('chat.insert', lang)}</button>
                    <button onClick={claude.replaceResult}>{t('chat.replace', lang)}</button>
                  </div>
                )}
              </div>
            ))}

            {state.cli.isLoading && state.cli.streamingText && (
              <div className="ai-chat-message ai-chat-message-assistant">
                <div className="ai-chat-message-label">{activeBackendMeta?.name || 'AI'}</div>
                <div className="ai-chat-message-content"><pre><code>{state.cli.streamingText}</code></pre></div>
                <div className="ai-chat-streaming-indicator"><span className="ai-chat-typing-dot" /><span className="ai-chat-typing-dot" /><span className="ai-chat-typing-dot" /></div>
              </div>
            )}
            {state.cli.isLoading && !state.cli.streamingText && (
              <div className="ai-chat-message ai-chat-message-loading">
                <span className="ai-chat-typing-dot" /><span className="ai-chat-typing-dot" /><span className="ai-chat-typing-dot" />
                <span className="ai-chat-typing">{t('chat.thinking', lang)}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-area" data-testid="ai-chat-input-area">
            {showSlashPopup && slashPopupCmds.length > 0 && (
              <div className="ai-chat-slash-popup">
                {slashPopupCmds.slice(0, 8).map(cmd => (
                  <div key={cmd.cmd} className="ai-chat-slash-item" onClick={() => handleSlashSelect(cmd)}>
                    <span className="ai-chat-slash-cmd">{cmd.cmd}</span>
                    <span className="ai-chat-slash-brief">{t(cmd.briefKey, lang)}</span>
                  </div>
                ))}
              </div>
            )}
            <textarea className="ai-chat-input" data-testid="ai-chat-generate-input"
              placeholder={state.cli.status === 'connected' ? t('chat.placeholder', lang) : t('chat.placeholderDisconnected', lang)}
              value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
              disabled={state.cli.isLoading} rows={3} aria-label={t('chat.placeholder', lang)} />
            <div className="ai-chat-input-footer">
              {state.cli.isLoading ? (
                <button className="ai-chat-cancel-btn" onClick={claude.cancelRequest}>{t('chat.cancel', lang)}</button>
              ) : (
                <button className="ai-chat-send-btn" onClick={handleSend} disabled={!input.trim() || !claude.cliStatus.available}>{t('chat.send', lang)}</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Commands Modal */}
      {showCommandsModal && (
        <div className="ai-chat-modal-overlay" onClick={() => { setShowCommandsModal(false); setSelectedCmd(null); setCmdFilter('') }}>
          <div className="ai-chat-modal ai-chat-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-modal-header">
              <span>{t('commands.title', lang)}</span>
              <button onClick={() => { setShowCommandsModal(false); setSelectedCmd(null); setCmdFilter('') }}>{'\u2715'}</button>
            </div>
            <div className="ai-chat-modal-body">
              <input className="ai-chat-cmd-filter" placeholder={t('commands.search', lang)} value={cmdFilter}
                onChange={(e) => setCmdFilter(e.target.value)} autoFocus />
              {selectedCmd ? (
                <div className="ai-chat-cmd-detail">
                  <button className="ai-chat-cmd-back" onClick={() => setSelectedCmd(null)}>{t('commands.back', lang)}</button>
                  <h3>{selectedCmd.cmd}</h3>
                  <p className="ai-chat-cmd-detail-text">{t(selectedCmd.detailKey, lang)}</p>
                  <button className="ai-chat-cmd-run" onClick={() => handleSlashCommand(selectedCmd)}
                    disabled={!claude.cliStatus.available || state.cli.isLoading}>{t('commands.run', lang)}</button>
                </div>
              ) : (
                <div className="ai-chat-cmd-list">
                  {groupedCmds.map(group => (
                    <div key={group.label} className="ai-chat-cmd-group">
                      <div className="ai-chat-cmd-group-label">{group.label}</div>
                      {group.commands.map(cmd => (
                        <div key={cmd.cmd} className="ai-chat-cmd-item">
                          <button className="ai-chat-cmd-run-btn" onClick={() => handleSlashCommand(cmd)}
                            disabled={!claude.cliStatus.available || state.cli.isLoading} title={t('chat.execute', lang)}>{'\u25B6'}</button>
                          <div className="ai-chat-cmd-info" onClick={() => setSelectedCmd(cmd)}>
                            <span className="ai-chat-cmd-name">{cmd.cmd}</span>
                            <span className="ai-chat-cmd-brief">{t(cmd.briefKey, lang)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="ai-chat-modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="ai-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-modal-header"><span>{t('status.title', lang)}</span><button onClick={() => setShowStatusModal(false)}>{'\u2715'}</button></div>
            <div className="ai-chat-modal-body">
              <div className="ai-chat-status-row"><span>{t('status.label', lang)}</span><span className={`ai-chat-status-badge ${state.cli.status}`}>{state.cli.status === 'connected' ? t('status.connected', lang) : t('status.disconnected', lang)}</span></div>
              {state.cli.version && <div className="ai-chat-status-row"><span>{t('status.version', lang)}:</span><span>v{state.cli.version}</span></div>}
              {state.cli.modelName && <div className="ai-chat-status-row"><span>{t('status.model', lang)}:</span><span>{state.cli.modelName}</span></div>}
              <button className="ai-chat-refresh-btn" onClick={claude.checkCliStatus}>{t('status.refresh', lang)}</button>
              {state.cli.status === 'disconnected' && <p className="ai-chat-install-hint">{t('status.installHint', lang)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="ai-chat-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="ai-chat-modal ai-chat-modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-modal-header"><span>{t('history.title', lang)}</span><button onClick={() => setShowHistoryModal(false)}>{'\u2715'}</button></div>
            <div className="ai-chat-modal-body">
              <HistoryPanel records={claude.historyRecords} onSearch={claude.searchHistory} onDelete={claude.deleteHistoryRecord} onReplay={claude.replayHistory} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AIChatPanelConnected(): JSX.Element {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const handleToggle = React.useCallback(() => { dispatch({ type: 'TOGGLE_RIGHT_PANEL' }) }, [dispatch])
  return <AIChatPanel isExpanded={state.layout.rightPanelVisible} onToggle={handleToggle} />
}
