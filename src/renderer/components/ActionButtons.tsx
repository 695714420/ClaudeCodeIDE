import React, { useState } from 'react'
import { useAppState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './ActionButtons.css'

export interface ActionButtonsProps {
  hasSelection: boolean
  isLoading: boolean
  isOnline: boolean
  cliAvailable: boolean
  onGenerate: () => void
  onOptimize: () => void
  onFixBug: () => void
  onExplain: () => void
  onCustomRequest: (instruction: string) => void
  onCancel: () => void
}

export function ActionButtons({
  hasSelection,
  isLoading,
  isOnline,
  cliAvailable,
  onGenerate,
  onOptimize,
  onFixBug,
  onExplain,
  onCustomRequest,
  onCancel
}: ActionButtonsProps): JSX.Element {
  const state = useAppState()
  const lang = (state.settings.language ?? 'en') as Lang
  const [customInstruction, setCustomInstruction] = useState('')

  const baseDisabled = isLoading || !isOnline || !cliAvailable
  const generateDisabled = baseDisabled
  const selectionDisabled = baseDisabled || !hasSelection

  const handleCustomSubmit = (): void => {
    const trimmed = customInstruction.trim()
    if (trimmed.length === 0) return
    onCustomRequest(trimmed)
    setCustomInstruction('')
  }

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleCustomSubmit()
  }

  return (
    <div className="action-buttons" data-testid="action-buttons">
      {isLoading && (
        <div className="action-buttons-loading" data-testid="action-buttons-loading">
          <button
            className="action-btn action-btn-cancel"
            data-testid="action-btn-cancel"
            onClick={onCancel}
            aria-label={t('action.cancel', lang)}
          >
            {t('action.cancel', lang)}
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="action-buttons-offline" data-testid="action-buttons-offline">
          {t('action.offline', lang)}
        </div>
      )}

      {!cliAvailable && isOnline && (
        <div className="action-buttons-cli-unavailable" data-testid="action-buttons-cli-unavailable">
          {t('action.cliUnavailable', lang)}
        </div>
      )}

      <div className="action-buttons-row">
        <button
          className="action-btn action-btn-generate"
          data-testid="action-btn-generate"
          onClick={onGenerate}
          disabled={generateDisabled}
          aria-label={t('action.generate', lang)}
        >
          {t('action.generate', lang)}
        </button>
        <button
          className="action-btn action-btn-optimize"
          data-testid="action-btn-optimize"
          onClick={onOptimize}
          disabled={selectionDisabled}
          aria-label={t('action.optimize', lang)}
        >
          {t('action.optimize', lang)}
        </button>
        <button
          className="action-btn action-btn-fixbug"
          data-testid="action-btn-fixbug"
          onClick={onFixBug}
          disabled={selectionDisabled}
          aria-label={t('action.fixBug', lang)}
        >
          {t('action.fixBug', lang)}
        </button>
        <button
          className="action-btn action-btn-explain"
          data-testid="action-btn-explain"
          onClick={onExplain}
          disabled={selectionDisabled}
          aria-label={t('action.explain', lang)}
        >
          {t('action.explain', lang)}
        </button>
      </div>

      <div className="action-buttons-custom" data-testid="action-buttons-custom">
        <input
          type="text"
          className="action-buttons-custom-input"
          data-testid="action-buttons-custom-input"
          placeholder={t('action.customPlaceholder', lang)}
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          onKeyDown={handleCustomKeyDown}
          disabled={baseDisabled}
          aria-label={t('action.customPlaceholder', lang)}
        />
        <button
          className="action-btn action-btn-custom-submit"
          data-testid="action-btn-custom-submit"
          onClick={handleCustomSubmit}
          disabled={baseDisabled || customInstruction.trim().length === 0}
          aria-label={t('action.send', lang)}
        >
          {t('action.send', lang)}
        </button>
      </div>
    </div>
  )
}
