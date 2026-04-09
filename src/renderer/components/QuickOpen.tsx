import React, { useState, useCallback, useRef, useEffect } from 'react'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './QuickOpen.css'

export interface QuickOpenProps {
  visible: boolean
  onClose: () => void
  onFileSelect: (filePath: string) => void
  fileList: string[]
  recentFiles: string[]
  rootPath: string
  lang?: Lang
}

/**
 * Simple fuzzy match: checks if all characters of query appear in target in order.
 */
function fuzzyMatch(query: string, target: string): boolean {
  const lowerQuery = query.toLowerCase()
  const lowerTarget = target.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < lowerTarget.length && qi < lowerQuery.length; ti++) {
    if (lowerTarget[ti] === lowerQuery[qi]) qi++
  }
  return qi === lowerQuery.length
}

/**
 * Score a match: lower is better. Prefers filename matches over path matches.
 */
function matchScore(query: string, filePath: string): number {
  const lowerQuery = query.toLowerCase()
  const fileName = filePath.split(/[/\\]/).pop() || ''
  const lowerFileName = fileName.toLowerCase()

  // Exact filename start match gets highest priority
  if (lowerFileName.startsWith(lowerQuery)) return 0
  // Filename contains query
  if (lowerFileName.includes(lowerQuery)) return 1
  // Path contains query
  if (filePath.toLowerCase().includes(lowerQuery)) return 2
  // Fuzzy match
  return 3
}

export function QuickOpen({
  visible,
  onClose,
  onFileSelect,
  fileList,
  recentFiles,
  rootPath,
  lang = 'en'
}: QuickOpenProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [visible])

  const relativePath = useCallback((fullPath: string): string => {
    if (fullPath.startsWith(rootPath)) {
      return fullPath.slice(rootPath.length + 1).replace(/\\/g, '/')
    }
    return fullPath
  }, [rootPath])

  const filteredFiles = React.useMemo(() => {
    if (!query.trim()) {
      // Show recent files first, then all files
      const recentSet = new Set(recentFiles)
      const recent = recentFiles.slice(0, 10)
      const rest = fileList.filter((f) => !recentSet.has(f)).slice(0, 40)
      return [...recent, ...rest]
    }

    return fileList
      .filter((f) => fuzzyMatch(query, relativePath(f)))
      .sort((a, b) => matchScore(query, relativePath(a)) - matchScore(query, relativePath(b)))
      .slice(0, 50)
  }, [query, fileList, recentFiles, relativePath])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredFiles[selectedIndex]) {
        onFileSelect(filteredFiles[selectedIndex])
        onClose()
      }
    }
  }, [onClose, onFileSelect, filteredFiles, selectedIndex])

  if (!visible) return null

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open" onClick={(e) => e.stopPropagation()} data-testid="quick-open">
        <input
          ref={inputRef}
          className="quick-open-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
          onKeyDown={handleKeyDown}
          placeholder={t('quickOpen.placeholder', lang)}
          aria-label="Quick open file search"
        />
        <div className="quick-open-list">
          {filteredFiles.map((filePath, index) => (
            <div
              key={filePath}
              className={`quick-open-item${index === selectedIndex ? ' selected' : ''}`}
              onClick={() => { onFileSelect(filePath); onClose() }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="quick-open-filename">
                {filePath.split(/[/\\]/).pop()}
              </span>
              <span className="quick-open-path">
                {relativePath(filePath)}
              </span>
            </div>
          ))}
          {filteredFiles.length === 0 && query.trim() && (
            <div className="quick-open-empty">{t('quickOpen.noMatch', lang)}</div>
          )}
        </div>
      </div>
    </div>
  )
}
