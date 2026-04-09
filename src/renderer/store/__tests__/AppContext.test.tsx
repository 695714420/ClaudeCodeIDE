import React from 'react'
import { render, screen, act } from '@testing-library/react'
import {
  appReducer,
  initialState,
  AppProvider,
  useAppState,
  useAppDispatch,
  AppState,
  AppAction,
  FileState
} from '../AppContext'

// ============================================================
// Unit Tests — appReducer
// ============================================================

describe('appReducer', () => {
  // --- Initial state ---

  it('should have correct default values', () => {
    expect(initialState.layout.leftPanelVisible).toBe(true)
    expect(initialState.layout.rightPanelVisible).toBe(true)
    expect(initialState.layout.leftPanelWidth).toBe(250)
    expect(initialState.layout.rightPanelWidth).toBe(420)
    expect(initialState.layout.terminalVisible).toBe(false)
    expect(initialState.layout.terminalHeight).toBe(200)
    expect(initialState.editor.openFiles).toEqual({})
    expect(initialState.editor.activeFilePath).toBeNull()
    expect(initialState.editor.currentSelection).toBeNull()
    expect(initialState.editor.cursorPosition).toEqual({ line: 1, column: 1 })
    expect(initialState.cli.status).toBe('disconnected')
    expect(initialState.cli.version).toBeNull()
    expect(initialState.cli.modelName).toBeNull()
    expect(initialState.cli.isLoading).toBe(false)
    expect(initialState.cli.currentRequestType).toBeNull()
    expect(initialState.cli.lastResult).toBeNull()
    expect(initialState.cli.streamingText).toBe('')
    expect(initialState.network.isOnline).toBe(true)
    expect(initialState.git.branch).toBe('')
    expect(initialState.git.isRepo).toBe(false)
    expect(initialState.git.fileStatuses).toEqual({})
    expect(initialState.settings.theme).toBe('dark')
    expect(initialState.settings.fontSize).toBe(14)
  })

  // --- Layout actions ---

  describe('layout actions', () => {
    it('TOGGLE_LEFT_PANEL toggles leftPanelVisible', () => {
      const state = appReducer(initialState, { type: 'TOGGLE_LEFT_PANEL' })
      expect(state.layout.leftPanelVisible).toBe(false)

      const state2 = appReducer(state, { type: 'TOGGLE_LEFT_PANEL' })
      expect(state2.layout.leftPanelVisible).toBe(true)
    })

    it('TOGGLE_RIGHT_PANEL toggles rightPanelVisible', () => {
      const state = appReducer(initialState, { type: 'TOGGLE_RIGHT_PANEL' })
      expect(state.layout.rightPanelVisible).toBe(false)

      const state2 = appReducer(state, { type: 'TOGGLE_RIGHT_PANEL' })
      expect(state2.layout.rightPanelVisible).toBe(true)
    })

    it('SET_LEFT_PANEL_WIDTH updates width', () => {
      const state = appReducer(initialState, { type: 'SET_LEFT_PANEL_WIDTH', payload: 300 })
      expect(state.layout.leftPanelWidth).toBe(300)
    })

    it('SET_RIGHT_PANEL_WIDTH updates width', () => {
      const state = appReducer(initialState, { type: 'SET_RIGHT_PANEL_WIDTH', payload: 400 })
      expect(state.layout.rightPanelWidth).toBe(400)
    })

    it('TOGGLE_TERMINAL toggles terminalVisible', () => {
      expect(initialState.layout.terminalVisible).toBe(false)
      const state = appReducer(initialState, { type: 'TOGGLE_TERMINAL' })
      expect(state.layout.terminalVisible).toBe(true)

      const state2 = appReducer(state, { type: 'TOGGLE_TERMINAL' })
      expect(state2.layout.terminalVisible).toBe(false)
    })

    it('SET_TERMINAL_HEIGHT updates terminalHeight', () => {
      expect(initialState.layout.terminalHeight).toBe(200)
      const state = appReducer(initialState, { type: 'SET_TERMINAL_HEIGHT', payload: 350 })
      expect(state.layout.terminalHeight).toBe(350)
    })
  })

  // --- Editor actions ---

  describe('editor actions', () => {
    const testFile: FileState = {
      path: '/src/test.ts',
      content: 'console.log("hello")',
      language: 'typescript',
      isDirty: false
    }

    it('OPEN_FILE adds file and sets it active', () => {
      const state = appReducer(initialState, { type: 'OPEN_FILE', payload: testFile })
      expect(state.editor.openFiles['/src/test.ts']).toEqual(testFile)
      expect(state.editor.activeFilePath).toBe('/src/test.ts')
    })

    it('CLOSE_FILE removes file and updates activeFilePath', () => {
      let state = appReducer(initialState, { type: 'OPEN_FILE', payload: testFile })
      state = appReducer(state, { type: 'CLOSE_FILE', payload: '/src/test.ts' })
      expect(state.editor.openFiles['/src/test.ts']).toBeUndefined()
      expect(state.editor.activeFilePath).toBeNull()
    })

    it('CLOSE_FILE switches active to last remaining file', () => {
      const file2: FileState = { path: '/src/b.ts', content: '', language: 'typescript', isDirty: false }
      let state = appReducer(initialState, { type: 'OPEN_FILE', payload: testFile })
      state = appReducer(state, { type: 'OPEN_FILE', payload: file2 })
      // active is now file2; close file2 → active should fall back to testFile
      state = appReducer(state, { type: 'CLOSE_FILE', payload: '/src/b.ts' })
      expect(state.editor.activeFilePath).toBe('/src/test.ts')
    })

    it('CLOSE_FILE does not change active if closed file is not active', () => {
      const file2: FileState = { path: '/src/b.ts', content: '', language: 'typescript', isDirty: false }
      let state = appReducer(initialState, { type: 'OPEN_FILE', payload: testFile })
      state = appReducer(state, { type: 'OPEN_FILE', payload: file2 })
      // active is file2; close testFile → active stays file2
      state = appReducer(state, { type: 'CLOSE_FILE', payload: '/src/test.ts' })
      expect(state.editor.activeFilePath).toBe('/src/b.ts')
    })

    it('SET_ACTIVE_FILE updates activeFilePath', () => {
      const state = appReducer(initialState, { type: 'SET_ACTIVE_FILE', payload: '/foo.ts' })
      expect(state.editor.activeFilePath).toBe('/foo.ts')
    })

    it('UPDATE_FILE_CONTENT updates content and marks dirty', () => {
      let state = appReducer(initialState, { type: 'OPEN_FILE', payload: testFile })
      state = appReducer(state, {
        type: 'UPDATE_FILE_CONTENT',
        payload: { path: '/src/test.ts', content: 'new content' }
      })
      expect(state.editor.openFiles['/src/test.ts'].content).toBe('new content')
      expect(state.editor.openFiles['/src/test.ts'].isDirty).toBe(true)
    })

    it('UPDATE_FILE_CONTENT is no-op for unknown path', () => {
      const state = appReducer(initialState, {
        type: 'UPDATE_FILE_CONTENT',
        payload: { path: '/unknown.ts', content: 'x' }
      })
      expect(state).toBe(initialState)
    })

    it('SET_FILE_DIRTY updates isDirty flag', () => {
      let state = appReducer(initialState, { type: 'OPEN_FILE', payload: testFile })
      state = appReducer(state, {
        type: 'SET_FILE_DIRTY',
        payload: { path: '/src/test.ts', isDirty: true }
      })
      expect(state.editor.openFiles['/src/test.ts'].isDirty).toBe(true)
    })

    it('SET_FILE_DIRTY is no-op for unknown path', () => {
      const state = appReducer(initialState, {
        type: 'SET_FILE_DIRTY',
        payload: { path: '/unknown.ts', isDirty: true }
      })
      expect(state).toBe(initialState)
    })

    it('SET_SELECTION updates currentSelection', () => {
      const selection = { text: 'hello', startLine: 1, startColumn: 1, endLine: 1, endColumn: 6 }
      const state = appReducer(initialState, { type: 'SET_SELECTION', payload: selection })
      expect(state.editor.currentSelection).toEqual(selection)
    })

    it('SET_SELECTION can clear selection', () => {
      const state = appReducer(initialState, { type: 'SET_SELECTION', payload: null })
      expect(state.editor.currentSelection).toBeNull()
    })

    it('SET_CURSOR_POSITION updates cursorPosition', () => {
      const state = appReducer(initialState, {
        type: 'SET_CURSOR_POSITION',
        payload: { line: 10, column: 5 }
      })
      expect(state.editor.cursorPosition).toEqual({ line: 10, column: 5 })
    })
  })

  // --- CLI actions ---

  describe('cli actions', () => {
    it('SET_CLI_STATUS updates status', () => {
      const state = appReducer(initialState, {
        type: 'SET_CLI_STATUS',
        payload: { status: 'connected' }
      })
      expect(state.cli.status).toBe('connected')
    })

    it('SET_CLI_STATUS updates status and version', () => {
      const state = appReducer(initialState, {
        type: 'SET_CLI_STATUS',
        payload: { status: 'connected', version: '2.1.90' }
      })
      expect(state.cli.status).toBe('connected')
      expect(state.cli.version).toBe('2.1.90')
    })

    it('SET_CLI_STATUS without version does not clear existing version', () => {
      const stateWithVersion = appReducer(initialState, {
        type: 'SET_CLI_STATUS',
        payload: { status: 'connected', version: '2.1.90' }
      })
      const state = appReducer(stateWithVersion, {
        type: 'SET_CLI_STATUS',
        payload: { status: 'disconnected' }
      })
      expect(state.cli.status).toBe('disconnected')
      expect(state.cli.version).toBe('2.1.90')
    })

    it('SET_CLI_MODEL updates modelName', () => {
      const state = appReducer(initialState, {
        type: 'SET_CLI_MODEL',
        payload: 'claude-3-opus'
      })
      expect(state.cli.modelName).toBe('claude-3-opus')
    })

    it('APPEND_STREAMING_TEXT appends to streamingText', () => {
      let state = appReducer(initialState, {
        type: 'APPEND_STREAMING_TEXT',
        payload: 'Hello '
      })
      state = appReducer(state, {
        type: 'APPEND_STREAMING_TEXT',
        payload: 'World'
      })
      expect(state.cli.streamingText).toBe('Hello World')
    })

    it('CLEAR_STREAMING_TEXT resets streamingText', () => {
      let state = appReducer(initialState, {
        type: 'APPEND_STREAMING_TEXT',
        payload: 'some text'
      })
      state = appReducer(state, { type: 'CLEAR_STREAMING_TEXT' })
      expect(state.cli.streamingText).toBe('')
    })

    it('SET_CLI_LOADING updates isLoading and currentRequestType', () => {
      const state = appReducer(initialState, {
        type: 'SET_CLI_LOADING',
        payload: { isLoading: true, requestType: 'generate' }
      })
      expect(state.cli.isLoading).toBe(true)
      expect(state.cli.currentRequestType).toBe('generate')
    })

    it('SET_CLI_RESULT sets result and clears loading', () => {
      const loadingState = appReducer(initialState, {
        type: 'SET_CLI_LOADING',
        payload: { isLoading: true, requestType: 'optimize' }
      })
      const result = {
        id: '1',
        type: 'optimize' as const,
        success: true,
        content: 'optimized code',
        timestamp: Date.now()
      }
      const state = appReducer(loadingState, { type: 'SET_CLI_RESULT', payload: result })
      expect(state.cli.lastResult).toEqual(result)
      expect(state.cli.isLoading).toBe(false)
      expect(state.cli.currentRequestType).toBeNull()
    })

    it('SET_CLI_RESULT can clear result', () => {
      const state = appReducer(initialState, { type: 'SET_CLI_RESULT', payload: null })
      expect(state.cli.lastResult).toBeNull()
    })
  })

  // --- Network actions ---

  describe('network actions', () => {
    it('SET_NETWORK_STATUS updates isOnline', () => {
      const state = appReducer(initialState, { type: 'SET_NETWORK_STATUS', payload: false })
      expect(state.network.isOnline).toBe(false)
    })
  })

  // --- Settings actions ---

  describe('settings actions', () => {
    it('UPDATE_SETTINGS merges partial settings', () => {
      const state = appReducer(initialState, {
        type: 'UPDATE_SETTINGS',
        payload: { theme: 'light', fontSize: 16 }
      })
      expect(state.settings.theme).toBe('light')
      expect(state.settings.fontSize).toBe(16)
      // other settings unchanged
      expect(state.settings.encoding).toBe('UTF-8')
    })
  })

  // --- Unknown action ---

  it('returns same state for unknown action', () => {
    const state = appReducer(initialState, { type: 'UNKNOWN' } as unknown as AppAction)
    expect(state).toBe(initialState)
  })
})

// ============================================================
// Unit Tests — AppProvider, useAppState, useAppDispatch
// ============================================================

describe('AppProvider and hooks', () => {
  function TestConsumer(): JSX.Element {
    const state = useAppState()
    const dispatch = useAppDispatch()
    return (
      <div>
        <span data-testid="left-visible">{String(state.layout.leftPanelVisible)}</span>
        <span data-testid="right-visible">{String(state.layout.rightPanelVisible)}</span>
        <button onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}>toggle</button>
      </div>
    )
  }

  it('provides initial state to consumers', () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    )
    expect(screen.getByTestId('left-visible').textContent).toBe('true')
    expect(screen.getByTestId('right-visible').textContent).toBe('true')
  })

  it('dispatches actions and updates state', () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>
    )
    act(() => {
      screen.getByText('toggle').click()
    })
    expect(screen.getByTestId('right-visible').textContent).toBe('false')
  })

  it('useAppState throws outside provider', () => {
    function Bad(): JSX.Element {
      useAppState()
      return <div />
    }
    expect(() => render(<Bad />)).toThrow('useAppState must be used within an AppProvider')
  })

  it('useAppDispatch throws outside provider', () => {
    function Bad(): JSX.Element {
      useAppDispatch()
      return <div />
    }
    expect(() => render(<Bad />)).toThrow('useAppDispatch must be used within an AppProvider')
  })
})
