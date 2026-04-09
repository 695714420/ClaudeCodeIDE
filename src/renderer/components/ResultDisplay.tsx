import React from 'react'
import { useAppState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import type { ApiResult } from '../../shared/types'
import './ResultDisplay.css'

export interface ResultDisplayProps {
  result: ApiResult | null
  onCopy: () => void
  onInsert: () => void
  onReplace: () => void
  showDiff: boolean
  streamingText?: string
  isStreaming?: boolean
}

export function ResultDisplay({
  result,
  onCopy,
  onInsert,
  onReplace,
  showDiff,
  streamingText,
  isStreaming
}: ResultDisplayProps): JSX.Element {
  const state = useAppState()
  const lang = (state.settings.language ?? 'en') as Lang

  if (isStreaming && streamingText) {
    return (
      <div className="result-display result-display-streaming" data-testid="result-display">
        <div className="result-display-streaming-indicator" data-testid="result-display-streaming-indicator">
          {t('result.streaming', lang)}
        </div>
        <pre className="result-display-code" data-testid="result-display-streaming-content">
          <code>{streamingText}</code>
        </pre>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="result-display result-display-empty" data-testid="result-display">
        <p className="result-display-placeholder" data-testid="result-display-placeholder">
          {t('result.empty', lang)}
        </p>
      </div>
    )
  }

  if (!result.success) {
    return (
      <div className="result-display result-display-error" data-testid="result-display">
        <div className="result-display-error-header" data-testid="result-display-error-header">
          {t('result.failed', lang)}
        </div>
        {result.errorExplanation && (
          <div className="result-display-error-explanation" data-testid="result-display-error-explanation">
            {result.errorExplanation}
          </div>
        )}
        <pre className="result-display-code" data-testid="result-display-content">
          <code>{result.content}</code>
        </pre>
      </div>
    )
  }

  const showDiffView = showDiff && !!result.originalCode

  return (
    <div className="result-display result-display-success" data-testid="result-display">
      {result.errorExplanation && (
        <div className="result-display-error-explanation" data-testid="result-display-error-explanation">
          <strong>{t('result.errorReason', lang)}</strong>
          {result.errorExplanation}
        </div>
      )}

      {showDiffView ? (
        <div className="result-display-diff" data-testid="result-display-diff">
          <div className="result-display-diff-panel result-display-diff-original">
            <div className="result-display-diff-label" data-testid="result-display-diff-original-label">
              {t('result.originalCode', lang)}
            </div>
            <pre className="result-display-code" data-testid="result-display-original-code">
              <code>{result.originalCode}</code>
            </pre>
          </div>
          <div className="result-display-diff-panel result-display-diff-new">
            <div className="result-display-diff-label" data-testid="result-display-diff-new-label">
              {result.type === 'fixBug' ? t('result.fixedCode', lang) : t('result.optimizedCode', lang)}
            </div>
            <pre className="result-display-code" data-testid="result-display-content">
              <code>{result.content}</code>
            </pre>
          </div>
        </div>
      ) : (
        <pre className="result-display-code" data-testid="result-display-content">
          <code>{result.content}</code>
        </pre>
      )}

      <div className="result-display-actions" data-testid="result-display-actions">
        <button
          className="result-action-btn result-action-copy"
          data-testid="result-action-copy"
          onClick={onCopy}
          aria-label={t('result.copy', lang)}
        >
          {t('result.copy', lang)}
        </button>
        <button
          className="result-action-btn result-action-insert"
          data-testid="result-action-insert"
          onClick={onInsert}
          aria-label={t('result.insertToEditor', lang)}
        >
          {t('result.insertToEditor', lang)}
        </button>
        <button
          className="result-action-btn result-action-replace"
          data-testid="result-action-replace"
          onClick={onReplace}
          aria-label={t('result.replace', lang)}
        >
          {t('result.replace', lang)}
        </button>
      </div>
    </div>
  )
}
