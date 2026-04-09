import React, { useCallback } from 'react'
import { useAppState, useAppDispatch, FileState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './EditorTabs.css'

/**
 * Maps file extensions to Monaco Editor language identifiers.
 */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.php': 'php',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.css': 'css',
  '.html': 'html',
  '.json': 'json',
  '.md': 'markdown',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'shell',
  '.sql': 'sql',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.kt': 'kotlin'
}

/**
 * Detect language from file extension.
 */
export function detectLanguage(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.')
  if (dotIndex === -1) return 'plaintext'
  const ext = filePath.slice(dotIndex).toLowerCase()
  return EXTENSION_LANGUAGE_MAP[ext] || 'plaintext'
}

/**
 * Extract file name from a full path.
 */
function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

/**
 * EditorTabs shows tabs for all open files.
 * Clicking a tab switches the active file; the close button removes it.
 *
 * Reads from editor.openFiles and editor.activeFilePath in AppState.
 * Dispatches SET_ACTIVE_FILE and CLOSE_FILE actions.
 *
 * Req 2.3
 */
export function EditorTabs(): JSX.Element {
  const { editor, settings, git } = useAppState()
  const dispatch = useAppDispatch()
  const lang = (settings.language ?? 'en') as Lang
  const { openFiles, activeFilePath } = editor
  const { fileStatuses } = git

  const tabs = Object.values(openFiles) as FileState[]

  const handleTabClick = useCallback(
    (path: string) => {
      dispatch({ type: 'SET_ACTIVE_FILE', payload: path })
    },
    [dispatch]
  )

  const handleTabClose = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation()
      dispatch({ type: 'CLOSE_FILE', payload: path })
    },
    [dispatch]
  )

  if (tabs.length === 0) {
    return <div className="editor-tabs empty" data-testid="editor-tabs" />
  }

  return (
    <div className="editor-tabs" data-testid="editor-tabs" role="tablist" aria-label="Open files">
      {tabs.map((file) => {
        const isActive = file.path === activeFilePath
        return (
          <div
            key={file.path}
            className={`editor-tab${isActive ? ' active' : ''}${file.isDirty ? ' dirty' : ''}`}
            onClick={() => handleTabClick(file.path)}
            data-testid={`editor-tab-${getFileName(file.path)}`}
            role="tab"
            aria-selected={isActive}
            aria-label={getFileName(file.path)}
            title={file.path}
          >
            <span className="editor-tab-name">{getFileName(file.path)}</span>
            {fileStatuses[file.path] && (
              <span
                className={`editor-tab-git-status git-${fileStatuses[file.path]}`}
                data-testid={`tab-git-status-${getFileName(file.path)}`}
              >
                {fileStatuses[file.path] === 'modified'
                  ? 'M'
                  : fileStatuses[file.path] === 'added'
                    ? 'A'
                    : fileStatuses[file.path] === 'deleted'
                      ? 'D'
                      : fileStatuses[file.path] === 'untracked'
                        ? 'U'
                        : ''}
              </span>
            )}
            {file.isDirty && <span className="editor-tab-dirty" data-testid="dirty-indicator">●</span>}
            <button
              className="editor-tab-close"
              onClick={(e) => handleTabClose(e, file.path)}
              data-testid={`close-tab-${getFileName(file.path)}`}
              aria-label={`Close ${getFileName(file.path)}`}
              title={t('editor.close', lang)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
