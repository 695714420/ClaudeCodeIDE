import React from 'react'
import { render, screen } from '@testing-library/react'
import { StatusBar } from '../StatusBar'
import { AppProvider, useAppDispatch, AppAction } from '../../store/AppContext'

function DispatchHelper({
  actions,
  children
}: {
  actions: AppAction[]
  children: React.ReactNode
}): JSX.Element {
  const dispatch = useAppDispatch()
  React.useEffect(() => {
    actions.forEach((a) => dispatch(a))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>
}

function renderStatusBar(actions: AppAction[] = []): void {
  render(
    <AppProvider>
      <DispatchHelper actions={actions}>
        <StatusBar />
      </DispatchHelper>
    </AppProvider>
  )
}

describe('StatusBar Component', () => {
  describe('Rendering', () => {
    it('should render the status bar', () => {
      renderStatusBar()
      expect(screen.getByTestId('statusbar')).toBeInTheDocument()
    })

    it('should have correct ARIA attributes', () => {
      renderStatusBar()
      const bar = screen.getByTestId('statusbar')
      expect(bar).toHaveAttribute('role', 'status')
      expect(bar).toHaveAttribute('aria-label', 'Status bar')
    })

    it('should render left and right sections', () => {
      renderStatusBar()
      expect(screen.getByTestId('statusbar-left')).toBeInTheDocument()
      expect(screen.getByTestId('statusbar-right')).toBeInTheDocument()
    })
  })

  describe('CLI Status', () => {
    it('should show backend name with "Disconnected" by default', () => {
      renderStatusBar()
      const cliStatus = screen.getByTestId('statusbar-cli-status')
      expect(cliStatus).toHaveTextContent('Claude Code | CLI: Disconnected')
    })

    it('should show backend name with "Connected" when CLI is connected', () => {
      renderStatusBar([{ type: 'SET_CLI_STATUS', payload: { status: 'connected' } }])
      const cliStatus = screen.getByTestId('statusbar-cli-status')
      expect(cliStatus).toHaveTextContent('Claude Code | CLI: Connected')
    })

    it('should show version when available', () => {
      renderStatusBar([{ type: 'SET_CLI_STATUS', payload: { status: 'connected', version: '2.1.90' } }])
      const cliStatus = screen.getByTestId('statusbar-cli-status')
      expect(cliStatus).toHaveTextContent('v2.1.90')
    })

    it('should have connected class when CLI is connected', () => {
      renderStatusBar([{ type: 'SET_CLI_STATUS', payload: { status: 'connected' } }])
      const cliStatus = screen.getByTestId('statusbar-cli-status')
      expect(cliStatus).toHaveClass('connected')
    })

    it('should have disconnected class when CLI is disconnected', () => {
      renderStatusBar()
      const cliStatus = screen.getByTestId('statusbar-cli-status')
      expect(cliStatus).toHaveClass('disconnected')
    })

    it('should show Codex backend name when activeBackend is codex', () => {
      renderStatusBar([{ type: 'SET_ACTIVE_BACKEND', payload: 'codex' }])
      const cliStatus = screen.getByTestId('statusbar-cli-status')
      expect(cliStatus).toHaveTextContent('Codex | CLI: Disconnected')
    })
  })

  describe('Network Status', () => {
    it('should show "Online" by default', () => {
      renderStatusBar()
      expect(screen.getByTestId('statusbar-network-status')).toHaveTextContent('Online')
    })

    it('should show "Offline" when network is offline', () => {
      renderStatusBar([{ type: 'SET_NETWORK_STATUS', payload: false }])
      expect(screen.getByTestId('statusbar-network-status')).toHaveTextContent('Offline')
    })
  })

  describe('Loading Status', () => {
    it('should not show loading indicator by default', () => {
      renderStatusBar()
      expect(screen.queryByTestId('statusbar-loading')).not.toBeInTheDocument()
    })

    it('should show loading indicator when CLI is loading', () => {
      renderStatusBar([
        { type: 'SET_CLI_LOADING', payload: { isLoading: true, requestType: 'generate' } }
      ])
      expect(screen.getByTestId('statusbar-loading')).toHaveTextContent('Loading...')
    })
  })

  describe('Current Language', () => {
    it('should show "Plain Text" when no file is open', () => {
      renderStatusBar()
      expect(screen.getByTestId('statusbar-language')).toHaveTextContent('Plain Text')
    })

    it('should show the language of the active file', () => {
      renderStatusBar([
        { type: 'OPEN_FILE', payload: { path: '/test/app.ts', content: '', language: 'TypeScript', isDirty: false } }
      ])
      expect(screen.getByTestId('statusbar-language')).toHaveTextContent('TypeScript')
    })
  })

  describe('Cursor Position', () => {
    it('should show default cursor position Ln 1, Col 1', () => {
      renderStatusBar()
      expect(screen.getByTestId('statusbar-cursor-position')).toHaveTextContent('Ln 1, Col 1')
    })

    it('should show updated cursor position', () => {
      renderStatusBar([{ type: 'SET_CURSOR_POSITION', payload: { line: 42, column: 15 } }])
      expect(screen.getByTestId('statusbar-cursor-position')).toHaveTextContent('Ln 42, Col 15')
    })
  })

  describe('Combined States', () => {
    it('should display all status indicators simultaneously', () => {
      renderStatusBar([
        { type: 'SET_CLI_STATUS', payload: { status: 'connected', version: '2.1.90' } },
        { type: 'SET_NETWORK_STATUS', payload: true },
        { type: 'SET_CLI_LOADING', payload: { isLoading: true, requestType: 'optimize' } },
        { type: 'OPEN_FILE', payload: { path: '/test/index.js', content: '', language: 'JavaScript', isDirty: false } },
        { type: 'SET_CURSOR_POSITION', payload: { line: 100, column: 25 } }
      ])

      expect(screen.getByTestId('statusbar-cli-status')).toHaveTextContent('Claude Code | CLI: Connected')
      expect(screen.getByTestId('statusbar-network-status')).toHaveTextContent('Online')
      expect(screen.getByTestId('statusbar-loading')).toHaveTextContent('Loading...')
      expect(screen.getByTestId('statusbar-language')).toHaveTextContent('JavaScript')
      expect(screen.getByTestId('statusbar-cursor-position')).toHaveTextContent('Ln 100, Col 25')
    })
  })
})
