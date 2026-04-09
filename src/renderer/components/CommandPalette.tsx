import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './CommandPalette.css'

export interface Command {
  id: string
  label: string
  shortcut?: string
  action: () => void
}

export interface CommandPaletteProps {
  visible: boolean
  onClose: () => void
  commands: Command[]
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
 * Score a match: lower is better. Prefers starts-with and contains over fuzzy.
 */
function matchScore(query: string, label: string): number {
  const lowerQuery = query.toLowerCase()
  const lowerLabel = label.toLowerCase()
  if (lowerLabel.startsWith(lowerQuery)) return 0
  if (lowerLabel.includes(lowerQuery)) return 1
  return 2
}

export function CommandPalette({
  visible,
  onClose,
  commands,
  lang = 'en'
}: CommandPaletteProps): JSX.Element | null {
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

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands
    return commands
      .filter((cmd) => fuzzyMatch(query, cmd.label))
      .sort((a, b) => matchScore(query, a.label) - matchScore(query, b.label))
  }, [query, commands])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
      }
    },
    [onClose, filteredCommands, selectedIndex]
  )

  if (!visible) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        data-testid="command-palette"
      >
        <input
          ref={inputRef}
          className="command-palette-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('commandPalette.placeholder', lang)}
          aria-label="Command palette search"
        />
        <div className="command-palette-list">
          {filteredCommands.map((cmd, index) => (
            <div
              key={cmd.id}
              className={`command-palette-item${index === selectedIndex ? ' selected' : ''}`}
              onClick={() => {
                cmd.action()
                onClose()
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="command-palette-label">{cmd.label}</span>
              {cmd.shortcut && (
                <span className="command-palette-shortcut">{cmd.shortcut}</span>
              )}
            </div>
          ))}
          {filteredCommands.length === 0 && query.trim() && (
            <div className="command-palette-empty">
              {t('commandPalette.noMatch', lang)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
