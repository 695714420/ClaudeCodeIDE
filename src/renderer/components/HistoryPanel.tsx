import React, { useState } from 'react'
import type { HistoryRecord, RequestType } from '../../shared/types'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './HistoryPanel.css'

export interface HistoryPanelProps {
  records: HistoryRecord[]
  onSearch: (keyword: string) => void
  onDelete: (id: string) => void
  onReplay: (record: HistoryRecord) => void
  lang?: Lang
}

/** Map request type to an i18n key */
const TYPE_LABEL_KEYS: Record<RequestType, string> = {
  generate: 'history.type.generate',
  optimize: 'history.type.optimize',
  fixBug: 'history.type.fixBug',
  explain: 'history.type.explain',
  syntax: 'history.type.syntax',
  custom: 'history.type.custom'
}

/** Format a timestamp to a readable date/time string */
function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function HistoryPanel({
  records,
  onSearch,
  onDelete,
  onReplay,
  lang = 'en'
}: HistoryPanelProps): JSX.Element {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setSearchKeyword(value)
    onSearch(value)
  }

  const handleRecordClick = (record: HistoryRecord): void => {
    setExpandedId(expandedId === record.id ? null : record.id)
  }

  return (
    <div className="history-panel" data-testid="history-panel">
      {/* Search input (Req 13.2) */}
      <div className="history-panel-search" data-testid="history-panel-search">
        <input
          type="text"
          className="history-panel-search-input"
          data-testid="history-panel-search-input"
          placeholder={t('history.searchPlaceholder', lang)}
          value={searchKeyword}
          onChange={handleSearchChange}
          aria-label={t('history.searchPlaceholder', lang)}
        />
      </div>

      {/* Empty state */}
      {records.length === 0 ? (
        <div className="history-panel-empty" data-testid="history-panel-empty">
          <p className="history-panel-empty-text">{t('history.empty', lang)}</p>
        </div>
      ) : (
        <ul className="history-panel-list" data-testid="history-panel-list" role="list">
          {records.map((record) => (
            <li
              key={record.id}
              className={`history-panel-item${expandedId === record.id ? ' history-panel-item-expanded' : ''}`}
              data-testid={`history-item-${record.id}`}
            >
              {/* Record summary row */}
              <div
                className="history-item-summary"
                data-testid={`history-item-summary-${record.id}`}
                onClick={() => handleRecordClick(record)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleRecordClick(record)
                }}
                aria-expanded={expandedId === record.id}
                aria-label={`${t('history.title', lang)}: ${record.instruction}`}
              >
                <span
                  className={`history-item-type history-item-type-${record.type}`}
                  data-testid={`history-item-type-${record.id}`}
                >
                  {t(TYPE_LABEL_KEYS[record.type], lang) || record.type}
                </span>
                <span
                  className="history-item-instruction"
                  data-testid={`history-item-instruction-${record.id}`}
                >
                  {record.instruction}
                </span>
                <span
                  className="history-item-time"
                  data-testid={`history-item-time-${record.id}`}
                >
                  {formatTime(record.createdAt)}
                </span>
              </div>

              {/* Action buttons per record (Req 13.3) */}
              <div className="history-item-actions" data-testid={`history-item-actions-${record.id}`}>
                <button
                  className="history-action-btn history-action-replay"
                  data-testid={`history-action-replay-${record.id}`}
                  onClick={() => onReplay(record)}
                  aria-label={`${t('history.replay', lang)}: ${record.instruction}`}
                >
                  {t('history.replay', lang)}
                </button>
                <button
                  className="history-action-btn history-action-delete"
                  data-testid={`history-action-delete-${record.id}`}
                  onClick={() => onDelete(record.id)}
                  aria-label={`${t('history.delete', lang)}: ${record.instruction}`}
                >
                  {t('history.delete', lang)}
                </button>
              </div>

              {/* Expanded detail view (Req 13.3: click to view details) */}
              {expandedId === record.id && (
                <div
                  className="history-item-detail"
                  data-testid={`history-item-detail-${record.id}`}
                >
                  <div className="history-detail-section">
                    <span className="history-detail-label">{t('history.instruction', lang)}</span>
                    <span data-testid={`history-detail-instruction-${record.id}`}>
                      {record.instruction}
                    </span>
                  </div>
                  {record.code && (
                    <div className="history-detail-section">
                      <span className="history-detail-label">{t('history.code', lang)}</span>
                      <pre
                        className="history-detail-code"
                        data-testid={`history-detail-code-${record.id}`}
                      >
                        <code>{record.code}</code>
                      </pre>
                    </div>
                  )}
                  <div className="history-detail-section">
                    <span className="history-detail-label">{t('history.result', lang)}</span>
                    <pre
                      className="history-detail-result"
                      data-testid={`history-detail-result-${record.id}`}
                    >
                      <code>{record.result.content}</code>
                    </pre>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
