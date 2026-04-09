import React, { useEffect, useMemo } from 'react'
import { useAppState } from '../store/AppContext'
import type { ThemeColors } from '../../shared/types'

import darkTheme from './themes/dark.json'
import lightTheme from './themes/light.json'
import monokaiTheme from './themes/monokai.json'
import solarizedTheme from './themes/solarized.json'

// --- Theme registry ---

export type ThemeVars = Record<string, string>

const builtinThemes: Record<string, ThemeVars> = {
  dark: darkTheme,
  light: lightTheme,
  monokai: monokaiTheme,
  solarized: solarizedTheme
}

export const AVAILABLE_THEMES = ['dark', 'light', 'monokai', 'solarized'] as const

export function getThemeVars(themeName: string): ThemeVars {
  return builtinThemes[themeName] ?? builtinThemes['dark']
}

// --- Legacy helpers (kept for backward compat) ---

export const LIGHT_THEME: ThemeColors = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  accent: '#0078d4',
  editorBackground: '#ffffff',
  sidebarBackground: '#f3f3f3'
}

export const DARK_THEME: ThemeColors = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  accent: '#569cd6',
  editorBackground: '#1e1e1e',
  sidebarBackground: '#252526'
}

export function getThemeColors(theme: string, customColors?: ThemeColors): ThemeColors {
  if (customColors) return customColors
  return theme === 'light' ? LIGHT_THEME : DARK_THEME
}

export function getMonacoTheme(theme: string): string {
  return theme === 'light' ? 'vs' : 'vs-dark'
}

function applyThemeToDocument(vars: ThemeVars): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { settings } = useAppState()

  const vars = useMemo(() => getThemeVars(settings.theme), [settings.theme])

  useEffect(() => {
    applyThemeToDocument(vars)
  }, [vars])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  return <>{children}</>
}
