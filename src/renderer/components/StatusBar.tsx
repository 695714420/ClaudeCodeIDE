import React from 'react'
import { useAppState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './StatusBar.css'

export interface StatusBarProps {
  cliStatus: 'connected' | 'disconnected'
  cliVersion: string | null
  networkStatus: 'online' | 'offline'
  loadingStatus: boolean
  currentLanguage: string
  cursorPosition: { line: number; column: number }
  gitBranch?: string
}

/**
 * Derives the current language from the active file in openFiles.
 * Falls back to 'Plain Text' if no active file or language is found.
 */
function deriveCurrentLanguage(
  openFiles: Record<string, { language: string }>,
  activeFilePath: string | null
): string {
  if (!activeFilePath) return 'Plain Text'
  const file = openFiles[activeFilePath]
  return file?.language || 'Plain Text'
}

/** Maps a backend ID to a human-readable display name. */
function getBackendDisplayName(backendId: string): string {
  const names: Record<string, string> = {
    claude: 'Claude Code',
    codex: 'Codex'
  }
  return names[backendId] ?? backendId.charAt(0).toUpperCase() + backendId.slice(1)
}

export function StatusBar(): JSX.Element {
  const state = useAppState()
  const lang = (state.settings.language ?? 'en') as Lang

  const { cli, network, editor } = state
  const currentLanguage = deriveCurrentLanguage(editor.openFiles, editor.activeFilePath)
  const backendName = getBackendDisplayName(cli.activeBackend)

  const cliStatusLabel = cli.status === 'connected' ? t('statusbar.cliConnected', lang) : t('statusbar.cliDisconnected', lang)
  const networkStatusLabel = network.isOnline ? t('statusbar.online', lang) : t('statusbar.offline', lang)

  return (
    <footer className="statusbar" data-testid="statusbar" role="status" aria-label="Status bar">
      {/* Left section: CLI status, network status, loading */}
      <div className="statusbar-left" data-testid="statusbar-left">
        <span
          className={`statusbar-item statusbar-backend ${cli.status}`}
          data-testid="statusbar-cli-status"
          aria-label={`${backendName} status: ${cliStatusLabel}`}
        >
          <span className="statusbar-indicator" />
          {backendName} | {cliStatusLabel}
          {cli.version && ` (v${cli.version})`}
        </span>

        <span
          className={`statusbar-item statusbar-network ${network.isOnline ? 'online' : 'offline'}`}
          data-testid="statusbar-network-status"
          aria-label={`Network status: ${networkStatusLabel}`}
        >
          <span className="statusbar-indicator" />
          {networkStatusLabel}
        </span>

        {cli.isLoading && (
          <span
            className="statusbar-item statusbar-loading"
            data-testid="statusbar-loading"
            aria-label="Loading"
          >
            {t('statusbar.loading', lang)}
          </span>
        )}
      </div>

      {/* Right section: git branch, language, cursor position */}
      <div className="statusbar-right" data-testid="statusbar-right">
        {state.git.isRepo && state.git.branch && (
          <span
            className="statusbar-item statusbar-git-branch"
            data-testid="statusbar-git-branch"
            aria-label={`Git branch: ${state.git.branch}`}
          >
            ⎇ {state.git.branch}
          </span>
        )}

        <span
          className="statusbar-item statusbar-language"
          data-testid="statusbar-language"
          aria-label={`Language: ${currentLanguage}`}
        >
          {currentLanguage}
        </span>

        <span
          className="statusbar-item statusbar-cursor"
          data-testid="statusbar-cursor-position"
          aria-label={`Cursor position: Line ${editor.cursorPosition.line}, Column ${editor.cursorPosition.column}`}
        >
          {t('statusbar.line', lang)} {editor.cursorPosition.line}, {t('statusbar.column', lang)} {editor.cursorPosition.column}
        </span>
      </div>
    </footer>
  )
}
