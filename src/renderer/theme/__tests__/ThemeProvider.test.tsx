import React from 'react'
import { render } from '@testing-library/react'
import {
  ThemeProvider,
  LIGHT_THEME,
  DARK_THEME,
  getThemeColors,
  getMonacoTheme,
  getThemeVars,
  AVAILABLE_THEMES
} from '../ThemeProvider'
import { AppProvider } from '../../store/AppContext'
import type { ThemeColors } from '../../../shared/types'

// Helper to render ThemeProvider within AppProvider
function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<AppProvider>{ui}</AppProvider>)
}

describe('getThemeColors', () => {
  it('returns DARK_THEME for "dark"', () => {
    expect(getThemeColors('dark')).toEqual(DARK_THEME)
  })

  it('returns LIGHT_THEME for "light"', () => {
    expect(getThemeColors('light')).toEqual(LIGHT_THEME)
  })

  it('returns DARK_THEME for unknown theme string', () => {
    expect(getThemeColors('custom-unknown')).toEqual(DARK_THEME)
  })

  it('returns customColors when provided', () => {
    const custom: ThemeColors = {
      background: '#000',
      foreground: '#fff',
      accent: '#f00',
      editorBackground: '#111',
      sidebarBackground: '#222'
    }
    expect(getThemeColors('dark', custom)).toEqual(custom)
    expect(getThemeColors('light', custom)).toEqual(custom)
  })
})

describe('getMonacoTheme', () => {
  it('returns "vs" for light theme', () => {
    expect(getMonacoTheme('light')).toBe('vs')
  })

  it('returns "vs-dark" for dark theme', () => {
    expect(getMonacoTheme('dark')).toBe('vs-dark')
  })

  it('returns "vs-dark" for unknown theme', () => {
    expect(getMonacoTheme('custom')).toBe('vs-dark')
  })
})

describe('ThemeProvider', () => {
  it('renders children', () => {
    const { getByText } = renderWithProvider(
      <ThemeProvider>
        <span>child content</span>
      </ThemeProvider>
    )
    expect(getByText('child content')).toBeInTheDocument()
  })

  it('applies CSS custom properties to document root (default dark theme)', () => {
    renderWithProvider(
      <ThemeProvider>
        <div />
      </ThemeProvider>
    )
    const root = document.documentElement
    // Now loaded from JSON theme files
    expect(root.style.getPropertyValue('--bg')).toBe('#1e1e1e')
    expect(root.style.getPropertyValue('--fg')).toBe('#d4d4d4')
    expect(root.style.getPropertyValue('--accent-color')).toBe('#007acc')
  })

  it('sets data-theme attribute on document root', () => {
    renderWithProvider(
      <ThemeProvider>
        <div />
      </ThemeProvider>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})

describe('Theme presets', () => {
  it('LIGHT_THEME has all required fields', () => {
    expect(LIGHT_THEME.background).toBeDefined()
    expect(LIGHT_THEME.foreground).toBeDefined()
    expect(LIGHT_THEME.accent).toBeDefined()
    expect(LIGHT_THEME.editorBackground).toBeDefined()
    expect(LIGHT_THEME.sidebarBackground).toBeDefined()
  })

  it('DARK_THEME has all required fields', () => {
    expect(DARK_THEME.background).toBeDefined()
    expect(DARK_THEME.foreground).toBeDefined()
    expect(DARK_THEME.accent).toBeDefined()
    expect(DARK_THEME.editorBackground).toBeDefined()
    expect(DARK_THEME.sidebarBackground).toBeDefined()
  })

  it('LIGHT_THEME and DARK_THEME have different backgrounds', () => {
    expect(LIGHT_THEME.background).not.toBe(DARK_THEME.background)
  })
})

describe('getThemeVars', () => {
  it('returns dark theme vars for "dark"', () => {
    const vars = getThemeVars('dark')
    expect(vars['--bg']).toBe('#1e1e1e')
  })

  it('returns light theme vars for "light"', () => {
    const vars = getThemeVars('light')
    expect(vars['--bg']).toBe('#ffffff')
  })

  it('returns monokai theme vars for "monokai"', () => {
    const vars = getThemeVars('monokai')
    expect(vars['--bg']).toBe('#272822')
  })

  it('returns solarized theme vars for "solarized"', () => {
    const vars = getThemeVars('solarized')
    expect(vars['--bg']).toBe('#002b36')
  })

  it('falls back to dark theme for unknown name', () => {
    const vars = getThemeVars('nonexistent')
    expect(vars['--bg']).toBe('#1e1e1e')
  })
})

describe('AVAILABLE_THEMES', () => {
  it('contains all 4 built-in themes', () => {
    expect(AVAILABLE_THEMES).toEqual(['dark', 'light', 'monokai', 'solarized'])
  })
})
