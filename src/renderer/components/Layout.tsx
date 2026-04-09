import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../store/AppContext'
import { TerminalPanel } from './TerminalPanel'
import './Layout.css'

const MIN_PANEL_WIDTH = 150
const MAX_PANEL_WIDTH_RATIO = 0.4 // max 40% of container width
const MIN_TERMINAL_HEIGHT = 80
const MAX_TERMINAL_HEIGHT_RATIO = 0.7 // max 70% of center height

export interface LayoutSlots {
  left?: React.ReactNode
  center: React.ReactNode
  right?: React.ReactNode
}

export function Layout({ left, center, right }: LayoutSlots): JSX.Element {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { leftPanelVisible, rightPanelVisible, leftPanelWidth, rightPanelWidth, terminalVisible, terminalHeight } = state.layout

  const containerRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<'left' | 'right' | 'terminal' | null>(null)

  const clampWidth = useCallback(
    (width: number): number => {
      const containerWidth = containerRef.current?.clientWidth || 1366
      const maxWidth = Math.floor(containerWidth * MAX_PANEL_WIDTH_RATIO)
      return Math.max(MIN_PANEL_WIDTH, Math.min(width, maxWidth))
    },
    []
  )

  const handleMouseDown = useCallback(
    (side: 'left' | 'right' | 'terminal') => (e: React.MouseEvent) => {
      e.preventDefault()
      setDragging(side)
    },
    []
  )

  const clampTerminalHeight = useCallback(
    (height: number): number => {
      const centerHeight = centerRef.current?.clientHeight || 600
      const maxHeight = Math.floor(centerHeight * MAX_TERMINAL_HEIGHT_RATIO)
      return Math.max(MIN_TERMINAL_HEIGHT, Math.min(height, maxHeight))
    },
    []
  )

  const toggleTerminal = useCallback(() => {
    dispatch({ type: 'TOGGLE_TERMINAL' })
  }, [dispatch])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent): void => {
      if (dragging === 'terminal') {
        if (!centerRef.current) return
        const centerRect = centerRef.current.getBoundingClientRect()
        const newHeight = clampTerminalHeight(centerRect.bottom - e.clientY)
        dispatch({ type: 'SET_TERMINAL_HEIGHT', payload: newHeight })
        return
      }

      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()

      if (dragging === 'left') {
        const newWidth = clampWidth(e.clientX - rect.left)
        dispatch({ type: 'SET_LEFT_PANEL_WIDTH', payload: newWidth })
      } else {
        const newWidth = clampWidth(rect.right - e.clientX)
        dispatch({ type: 'SET_RIGHT_PANEL_WIDTH', payload: newWidth })
      }
    }

    const handleMouseUp = (): void => {
      setDragging(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, clampWidth, clampTerminalHeight, dispatch])

  return (
    <div className="layout-container" ref={containerRef} data-testid="layout-container">
      {/* Left Panel */}
      <div
        className={`layout-panel-left${leftPanelVisible ? '' : ' hidden'}`}
        style={{ width: leftPanelVisible ? leftPanelWidth : 0 }}
        data-testid="layout-panel-left"
      >
        {left}
      </div>

      {/* Left resize handle */}
      {leftPanelVisible && (
        <div
          className={`layout-resize-handle${dragging === 'left' ? ' dragging' : ''}`}
          onMouseDown={handleMouseDown('left')}
          data-testid="resize-handle-left"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize left panel"
        />
      )}

      {/* Center Panel */}
      <div className="layout-panel-center" data-testid="layout-panel-center" ref={centerRef}>
        <div
          className="layout-center-editor"
          style={terminalVisible ? { height: `calc(100% - ${terminalHeight + 4}px)` } : undefined}
          data-testid="layout-center-editor"
        >
          {center}
        </div>

        {/* Horizontal resize handle for terminal */}
        {terminalVisible && (
          <div
            className={`layout-horizontal-resize-handle${dragging === 'terminal' ? ' dragging' : ''}`}
            onMouseDown={handleMouseDown('terminal')}
            data-testid="resize-handle-terminal"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize terminal panel"
          />
        )}

        {/* Terminal Panel */}
        <div
          className={`layout-terminal-area${terminalVisible ? '' : ' hidden'}`}
          style={{ height: terminalVisible ? terminalHeight : 0 }}
          data-testid="layout-terminal-area"
        >
          <TerminalPanel
            cwd={state.workspace.rootPath}
            visible={terminalVisible}
            onToggle={toggleTerminal}
          />
        </div>
      </div>

      {/* Right resize handle */}
      {rightPanelVisible && (
        <div
          className={`layout-resize-handle${dragging === 'right' ? ' dragging' : ''}`}
          onMouseDown={handleMouseDown('right')}
          data-testid="resize-handle-right"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize right panel"
        />
      )}

      {/* Right Panel */}
      <div
        className={`layout-panel-right${rightPanelVisible ? '' : ' hidden'}`}
        style={{ width: rightPanelVisible ? rightPanelWidth : 0 }}
        data-testid="layout-panel-right"
      >
        {right}
      </div>
    </div>
  )
}
