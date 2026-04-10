import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Code2 } from 'lucide-react'
import { useAppState, useAppDispatch } from '../store/AppContext'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import './NavBar.css'

export interface NavBarProps {
  onFileAction: (action: 'new' | 'open' | 'save' | 'saveAs') => void
  onEditAction: (action: 'undo' | 'redo' | 'copy' | 'paste') => void
  onViewAction: (action: 'toggleTheme' | 'toggleSidebar') => void
  onOpenSettings?: () => void
}

interface MenuItem {
  label: string
  action: () => void
}

interface MenuDefinition {
  label: string
  items: MenuItem[]
}

export function NavBar({ onFileAction, onEditAction, onViewAction, onOpenSettings }: NavBarProps): JSX.Element {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const lang = (state.settings.language ?? 'en') as Lang
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  const handleToggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_LEFT_PANEL' })
    onViewAction('toggleSidebar')
  }, [dispatch, onViewAction])

  const handleToggleClaudeCodePanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_RIGHT_PANEL' })
  }, [dispatch])

  const menus: MenuDefinition[] = [
    {
      label: t('menu.file', lang),
      items: [
        { label: t('menu.new', lang), action: () => onFileAction('new') },
        { label: t('menu.open', lang), action: () => onFileAction('open') },
        { label: t('menu.save', lang), action: () => onFileAction('save') },
        { label: t('menu.newWindow', lang), action: () => window.electronAPI.newWindow() }
      ]
    },
    {
      label: t('menu.view', lang),
      items: [
        { label: t('menu.toggleSidebar', lang), action: handleToggleSidebar },
        { label: t('menu.toggleClaudeCode', lang), action: handleToggleClaudeCodePanel }
      ]
    },
    {
      label: t('menu.settings', lang),
      items: [
        { label: t('menu.preferences', lang), action: () => onOpenSettings?.() }
      ]
    }
  ]

  const toggleMenu = useCallback(
    (menuLabel: string) => {
      setOpenMenu((prev) => (prev === menuLabel ? null : menuLabel))
    },
    []
  )

  const handleItemClick = useCallback(
    (item: MenuItem) => {
      item.action()
      setOpenMenu(null)
    },
    []
  )

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenu) return

    const handleClickOutside = (e: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenu])

  return (
    <nav className="navbar" ref={navRef} data-testid="navbar" role="menubar" aria-label="Main navigation">
      <div className="navbar-brand">
        <Code2 size={16} />
        <span className="navbar-brand-text">Code IDE</span>
      </div>
      {menus.map((menu) => (
        <div key={menu.label} className="navbar-menu" data-testid={`navbar-menu-${menu.label.toLowerCase()}`}>
          <button
            className={`navbar-menu-trigger${openMenu === menu.label ? ' active' : ''}`}
            onClick={() => toggleMenu(menu.label)}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === menu.label}
            data-testid={`navbar-trigger-${menu.label.toLowerCase()}`}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <ul className="navbar-dropdown" role="menu" data-testid={`navbar-dropdown-${menu.label.toLowerCase()}`}>
              {menu.items.map((item) => (
                <li key={item.label} role="none">
                  <button
                    className="navbar-dropdown-item"
                    onClick={() => handleItemClick(item)}
                    role="menuitem"
                    data-testid={`navbar-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  )
}
