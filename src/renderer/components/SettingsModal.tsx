import React, { useState, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from '../../shared/constants'
import type { BackendMeta } from '../../shared/types'
import './SettingsModal.css'

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const lang = (state.settings.language ?? 'en') as Lang
  const [backends, setBackends] = useState<BackendMeta[]>([])

  useEffect(() => {
    if (open) {
      window.electronAPI.listBackends().then((list: BackendMeta[]) => {
        setBackends(list)
      }).catch(() => {})
    }
  }, [open])

  if (!open) return null

  const { theme, language, buddyEnabled, fontSize, tabSize, wordWrap, autoSave, keybindings } =
    state.settings

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <span>{t('settings.title', lang)}</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="settings-modal-body">
          {/* AI Backend */}
          <div className="settings-row">
            <label>{t('settings.backend', lang)}</label>
            <select
              value={state.settings.selectedBackend}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { selectedBackend: e.target.value }
                })
              }
              aria-label="Select AI backend"
            >
              {backends.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div className="settings-row">
            <label>{t('settings.theme', lang)}</label>
            <select
              value={theme}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { theme: e.target.value }
                })
              }
              aria-label="Select theme"
            >
              <option value="dark">{t('settings.themeDark', lang)}</option>
              <option value="light">{t('settings.themeLight', lang)}</option>
              <option value="monokai">{t('settings.themeMonokai', lang)}</option>
              <option value="solarized">{t('settings.themeSolarized', lang)}</option>
            </select>
          </div>

          {/* Language */}
          <div className="settings-row">
            <label>{t('settings.language', lang)}</label>
            <select
              value={language ?? 'en'}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { language: e.target.value as 'en' | 'zh' }
                })
              }
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* Font Size slider */}
          <div className="settings-row">
            <label>{t('settings.fontSize', lang)}</label>
            <div className="settings-slider-group">
              <input
                type="range"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={fontSize}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { fontSize: Number(e.target.value) }
                  })
                }
                aria-label="Font size"
              />
              <span className="settings-slider-value">{fontSize}px</span>
            </div>
          </div>

          {/* Tab Size select */}
          <div className="settings-row">
            <label>{t('settings.tabSize', lang)}</label>
            <select
              value={tabSize}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { tabSize: Number(e.target.value) }
                })
              }
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
            </select>
          </div>

          {/* Word Wrap toggle */}
          <div className="settings-row">
            <label>{t('settings.wordWrap', lang)}</label>
            <button
              className={`settings-toggle ${wordWrap === 'on' ? 'on' : ''}`}
              onClick={() =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { wordWrap: wordWrap === 'on' ? 'off' : 'on' }
                })
              }
              aria-label="Toggle word wrap"
            />
          </div>

          {/* Auto Save select */}
          <div className="settings-row">
            <label>{t('settings.autoSave', lang)}</label>
            <select
              value={autoSave}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: {
                    autoSave: e.target.value as 'off' | 'afterDelay' | 'onFocusChange'
                  }
                })
              }
            >
              <option value="off">{t('settings.autoSave.off', lang)}</option>
              <option value="afterDelay">{t('settings.autoSave.afterDelay', lang)}</option>
              <option value="onFocusChange">{t('settings.autoSave.onFocusChange', lang)}</option>
            </select>
          </div>

          {/* Buddy Pet */}
          <div className="settings-row">
            <label>{t('settings.buddyPet', lang)}</label>
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={!!buddyEnabled}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_SETTINGS',
                  payload: { buddyEnabled: e.target.checked }
                })
              }
              aria-label="Enable buddy pet"
            />
          </div>

          {/* Keybindings (read-only display) */}
          <div className="settings-section-title">{t('settings.keybindings', lang)}</div>
          <div className="settings-keybindings">
            {Object.entries(keybindings).map(([action, shortcut]) => (
              <div className="settings-keybinding-row" key={action}>
                <span className="settings-keybinding-action">{action}</span>
                <kbd className="settings-keybinding-key">{shortcut}</kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
