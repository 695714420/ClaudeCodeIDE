import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Layout } from '../Layout'
import { AppProvider, useAppDispatch, useAppState } from '../../store/AppContext'

// Mock TerminalPanel to avoid electronAPI dependency in tests
jest.mock('../TerminalPanel', () => ({
  TerminalPanel: ({ visible, onToggle }: { cwd: string; visible: boolean; onToggle: () => void }) =>
    visible ? (
      <div data-testid="mock-terminal-panel">
        <button data-testid="mock-terminal-toggle" onClick={onToggle}>Toggle</button>
      </div>
    ) : null
}))

// Helper to render Layout within AppProvider
function renderLayout(
  slots: { left?: React.ReactNode; center: React.ReactNode; right?: React.ReactNode } = {
    left: <div>Left Content</div>,
    center: <div>Center Content</div>,
    right: <div>Right Content</div>
  }
): ReturnType<typeof render> {
  return render(
    <AppProvider>
      <Layout {...slots} />
    </AppProvider>
  )
}

// Helper component to dispatch actions from within the provider
function DispatchHelper({
  action,
  children
}: {
  action?: Parameters<ReturnType<typeof useAppDispatch>>[0]
  children: React.ReactNode
}): JSX.Element {
  const dispatch = useAppDispatch()
  React.useEffect(() => {
    if (action) dispatch(action)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children}</>
}

// Helper component to read state
function StateReader({ onState }: { onState: (s: ReturnType<typeof useAppState>) => void }): null {
  const state = useAppState()
  React.useEffect(() => {
    onState(state)
  })
  return null
}

describe('Layout Component', () => {
  describe('Rendering (Req 3.1)', () => {
    it('should render three-column layout container', () => {
      renderLayout()
      expect(screen.getByTestId('layout-container')).toBeInTheDocument()
      expect(screen.getByTestId('layout-panel-left')).toBeInTheDocument()
      expect(screen.getByTestId('layout-panel-center')).toBeInTheDocument()
      expect(screen.getByTestId('layout-panel-right')).toBeInTheDocument()
    })

    it('should render slot content in correct panels', () => {
      renderLayout({
        left: <div>File Explorer</div>,
        center: <div>Code Editor</div>,
        right: <div>ClaudeCode Panel</div>
      })
      expect(screen.getByText('File Explorer')).toBeInTheDocument()
      expect(screen.getByText('Code Editor')).toBeInTheDocument()
      expect(screen.getByText('ClaudeCode Panel')).toBeInTheDocument()
    })

    it('should render center panel even without left/right content', () => {
      renderLayout({ center: <div>Only Center</div> })
      expect(screen.getByText('Only Center')).toBeInTheDocument()
      expect(screen.getByTestId('layout-panel-center')).toBeInTheDocument()
    })
  })

  describe('Panel Visibility (Req 3.3)', () => {
    it('should show left panel by default (leftPanelVisible=true)', () => {
      renderLayout()
      const leftPanel = screen.getByTestId('layout-panel-left')
      expect(leftPanel).not.toHaveClass('hidden')
    })

    it('should show right panel by default (rightPanelVisible=true)', () => {
      renderLayout()
      const rightPanel = screen.getByTestId('layout-panel-right')
      expect(rightPanel).not.toHaveClass('hidden')
    })

    it('should hide left panel when TOGGLE_LEFT_PANEL is dispatched', () => {
      render(
        <AppProvider>
          <DispatchHelper action={{ type: 'TOGGLE_LEFT_PANEL' }}>
            <Layout
              left={<div>Left</div>}
              center={<div>Center</div>}
              right={<div>Right</div>}
            />
          </DispatchHelper>
        </AppProvider>
      )
      const leftPanel = screen.getByTestId('layout-panel-left')
      expect(leftPanel).toHaveClass('hidden')
    })

    it('should hide right panel when TOGGLE_RIGHT_PANEL is dispatched', () => {
      render(
        <AppProvider>
          <DispatchHelper action={{ type: 'TOGGLE_RIGHT_PANEL' }}>
            <Layout
              left={<div>Left</div>}
              center={<div>Center</div>}
              right={<div>Right</div>}
            />
          </DispatchHelper>
        </AppProvider>
      )
      const rightPanel = screen.getByTestId('layout-panel-right')
      expect(rightPanel).toHaveClass('hidden')
    })

    it('should not show resize handles for hidden panels', () => {
      render(
        <AppProvider>
          <DispatchHelper action={{ type: 'TOGGLE_RIGHT_PANEL' }}>
            <Layout
              left={<div>Left</div>}
              center={<div>Center</div>}
              right={<div>Right</div>}
            />
          </DispatchHelper>
        </AppProvider>
      )
      // Left is visible by default, so left handle should exist
      expect(screen.getByTestId('resize-handle-left')).toBeInTheDocument()
      // Right is now hidden (toggled from default true), so right handle should not exist
      expect(screen.queryByTestId('resize-handle-right')).not.toBeInTheDocument()
    })
  })

  describe('Panel Width', () => {
    it('should apply leftPanelWidth from state', () => {
      renderLayout()
      const leftPanel = screen.getByTestId('layout-panel-left')
      // Default leftPanelWidth is 250
      expect(leftPanel.style.width).toBe('250px')
    })

    it('should apply rightPanelWidth from state when visible', () => {
      renderLayout()
      const rightPanel = screen.getByTestId('layout-panel-right')
      // Default rightPanelWidth is 420
      expect(rightPanel.style.width).toBe('420px')
    })
  })

  describe('Drag to Resize', () => {
    it('should show resize handles with correct aria attributes', () => {
      renderLayout()
      const leftHandle = screen.getByTestId('resize-handle-left')
      const rightHandle = screen.getByTestId('resize-handle-right')

      expect(leftHandle).toHaveAttribute('role', 'separator')
      expect(leftHandle).toHaveAttribute('aria-orientation', 'vertical')
      expect(rightHandle).toHaveAttribute('role', 'separator')
      expect(rightHandle).toHaveAttribute('aria-orientation', 'vertical')
    })

    it('should add dragging class on mousedown of left handle', () => {
      renderLayout()
      const leftHandle = screen.getByTestId('resize-handle-left')

      fireEvent.mouseDown(leftHandle)
      expect(leftHandle).toHaveClass('dragging')
    })

    it('should dispatch SET_LEFT_PANEL_WIDTH on drag', () => {
      let capturedState: ReturnType<typeof useAppState> | null = null

      render(
        <AppProvider>
          <Layout
            left={<div>Left</div>}
            center={<div>Center</div>}
            right={<div>Right</div>}
          />
          <StateReader onState={(s) => { capturedState = s }} />
        </AppProvider>
      )

      const leftHandle = screen.getByTestId('resize-handle-left')
      const container = screen.getByTestId('layout-container')

      // Mock getBoundingClientRect and clientWidth
      jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 1366,
        top: 0,
        bottom: 768,
        width: 1366,
        height: 768,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      Object.defineProperty(container, 'clientWidth', { value: 1366, configurable: true })

      fireEvent.mouseDown(leftHandle)

      act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }))
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'))
      })

      expect(capturedState!.layout.leftPanelWidth).toBe(300)
    })

    it('should clamp panel width to minimum', () => {
      let capturedState: ReturnType<typeof useAppState> | null = null

      render(
        <AppProvider>
          <Layout
            left={<div>Left</div>}
            center={<div>Center</div>}
            right={<div>Right</div>}
          />
          <StateReader onState={(s) => { capturedState = s }} />
        </AppProvider>
      )

      const leftHandle = screen.getByTestId('resize-handle-left')
      const container = screen.getByTestId('layout-container')

      jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 1366,
        top: 0,
        bottom: 768,
        width: 1366,
        height: 768,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })

      fireEvent.mouseDown(leftHandle)

      act(() => {
        document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50 }))
      })

      act(() => {
        document.dispatchEvent(new MouseEvent('mouseup'))
      })

      // Should be clamped to MIN_PANEL_WIDTH (150)
      expect(capturedState!.layout.leftPanelWidth).toBe(150)
    })
  })

  describe('Minimum Resolution (Req 3.4)', () => {
    it('should set min-width of 1366px on container', () => {
      renderLayout()
      const container = screen.getByTestId('layout-container')
      // CSS is mocked by identity-obj-proxy, so we check the class is applied
      expect(container).toHaveClass('layout-container')
    })
  })

  describe('Terminal Panel', () => {
    it('should render terminal area in center panel (hidden by default)', () => {
      renderLayout()
      const terminalArea = screen.getByTestId('layout-terminal-area')
      expect(terminalArea).toBeInTheDocument()
      expect(terminalArea).toHaveClass('hidden')
    })

    it('should render editor area inside center panel', () => {
      renderLayout()
      expect(screen.getByTestId('layout-center-editor')).toBeInTheDocument()
    })

    it('should not show terminal resize handle when terminal is hidden', () => {
      renderLayout()
      expect(screen.queryByTestId('resize-handle-terminal')).not.toBeInTheDocument()
    })
  })
})
