import React, { useState, useCallback, useRef } from 'react'
import { useAppState } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './SearchPanel.css'

interface SearchMatch {
  filePath: string
  line: number
  column: number
  lineContent: string
  matchLength: number
}

export interface SearchPanelProps {
  rootPath: string
  onFileOpen: (filePath: string, line?: number) => void
}

export function SearchPanel({ rootPath, onFileOpen }: SearchPanelProps): JSX.Element {
  const state = useAppState()
  const lang = (state.settings.language ?? 'en') as Lang
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [showReplace, setShowReplace] = useState(false)
  const [results, setResults] = useState<SearchMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [resultCount, setResultCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([])
      setResultCount(0)
      return
    }
    setSearching(true)
    try {
      const api = window.electronAPI
      if (!api?.searchFiles) return
      const response = await api.searchFiles({
        query: query.trim(),
        rootPath,
        isRegex,
        caseSensitive,
        maxResults: 500
      }) as { success: boolean; data: SearchMatch[] }
      const matches = response?.data ?? (response as unknown as SearchMatch[]) ?? []
      setResults(Array.isArray(matches) ? matches : [])
      setResultCount(Array.isArray(matches) ? matches.length : 0)
    } catch {
      setResults([])
      setResultCount(0)
    } finally {
      setSearching(false)
    }
  }, [query, rootPath, isRegex, caseSensitive])

  const doReplace = useCallback(async () => {
    if (!query.trim()) return
    try {
      const api = window.electronAPI
      if (!api?.searchReplace) return
      await api.searchReplace(
        { query: query.trim(), rootPath, isRegex, caseSensitive },
        replacement
      )
      // Re-search to update results
      doSearch()
    } catch {
      // ignore
    }
  }, [query, replacement, rootPath, isRegex, caseSensitive, doSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      doSearch()
    }
  }, [doSearch])

  // Group results by file
  const groupedResults = results.reduce<Record<string, SearchMatch[]>>((acc, match) => {
    const key = match.filePath
    if (!acc[key]) acc[key] = []
    acc[key].push(match)
    return acc
  }, {})

  const relativePath = (fullPath: string): string => {
    if (fullPath.startsWith(rootPath)) {
      return fullPath.slice(rootPath.length + 1).replace(/\\/g, '/')
    }
    return fullPath
  }

  return (
    <div className="search-panel" data-testid="search-panel">
      <div className="search-panel-header">
        <div className="search-input-row">
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder', lang)}
            aria-label="Search query"
          />
          <button
            className={`search-option-btn${isRegex ? ' active' : ''}`}
            onClick={() => setIsRegex(!isRegex)}
            title={t('search.regex', lang)}
            aria-label={t('search.regex', lang)}
          >
            .*
          </button>
          <button
            className={`search-option-btn${caseSensitive ? ' active' : ''}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title={t('search.caseSensitive', lang)}
            aria-label={t('search.caseSensitive', lang)}
          >
            Aa
          </button>
          <button
            className="search-option-btn"
            onClick={() => setShowReplace(!showReplace)}
            title={t('search.toggleReplace', lang)}
            aria-label={t('search.toggleReplace', lang)}
          >
            ↔
          </button>
        </div>
        {showReplace && (
          <div className="search-replace-row">
            <input
              className="search-input"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder={t('search.replacePlaceholder', lang)}
              aria-label={t('search.replacePlaceholder', lang)}
            />
            <button
              className="search-replace-btn"
              onClick={doReplace}
              disabled={!query.trim()}
              aria-label={t('search.replaceAll', lang)}
            >
              {t('search.replaceAll', lang)}
            </button>
          </div>
        )}
      </div>

      <div className="search-panel-status">
        {searching ? (
          <span>{t('search.searching', lang)}</span>
        ) : resultCount > 0 ? (
          <span>
            {t('search.resultSummary', lang, String(resultCount), String(Object.keys(groupedResults).length))}
          </span>
        ) : query.trim() ? (
          <span>{t('search.noResults', lang)}</span>
        ) : null}
      </div>

      <div className="search-panel-results">
        {Object.entries(groupedResults).map(([filePath, matches]) => (
          <div key={filePath} className="search-file-group">
            <div
              className="search-file-header"
              onClick={() => onFileOpen(filePath)}
            >
              📄 {relativePath(filePath)}
              <span className="search-file-count">{matches.length}</span>
            </div>
            {matches.map((match, i) => (
              <div
                key={`${filePath}:${match.line}:${i}`}
                className="search-match-row"
                onClick={() => onFileOpen(filePath, match.line)}
              >
                <span className="search-match-line">{match.line}</span>
                <span className="search-match-content">
                  {match.lineContent.length > 200
                    ? match.lineContent.slice(0, 200) + '...'
                    : match.lineContent}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
