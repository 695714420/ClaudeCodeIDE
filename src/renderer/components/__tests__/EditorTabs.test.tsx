import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorTabs, detectLanguage } from '../EditorTabs'
import {
  AppState,
  AppAction,
  appReducer,
  initialState
} from '../../store/AppContext'

// --- detectLanguage tests ---

describe('detectLanguage', () => {
  it('detects TypeScript from .ts extension', () => {
    expect(detectLanguage('/src/index.ts')).toBe('typescript')
  })

  it('detects TypeScript from .tsx extension', () => {
    expect(detectLanguage('App.tsx')).toBe('typescript')
  })

  it('detects JavaScript from .js extension', () => {
    expect(detectLanguage('main.js')).toBe('javascript')
  })

  it('detects Python from .py extension', () => {
    expect(detectLanguage('script.py')).toBe('python')
  })

  it('detects Java from .java extension', () => {
    expect(detectLanguage('Main.java')).toBe('java')
  })

  it('detects Go from .go extension', () => {
    expect(detectLanguage('main.go')).toBe('go')
  })

  it('detects PHP from .php extension', () => {
    expect(detectLanguage('index.php')).toBe('php')
  })

  it('detects C++ from .cpp extension', () => {
    expect(detectLanguage('main.cpp')).toBe('cpp')
  })

  it('returns plaintext for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext')
  })

  it('returns plaintext for files without extension', () => {
    expect(detectLanguage('Makefile')).toBe('plaintext')
  })

  it('is case-insensitive for extensions', () => {
    expect(detectLanguage('file.PY')).toBe('python')
    expect(detectLanguage('file.Ts')).toBe('typescript')
  })
})

// --- Test helper: custom context wrapper ---

const AppStateContext = React.createContext<AppState | undefined>(undefined)
const AppDispatchContext = React.createContext<React.Dispatch<AppAction> | undefined>(undefined)

function TestAppProvider({
  children,
  stateOverride,
  dispatchOverride
}: {
  children: React.ReactNode
  stateOverride?: Partial<AppState>
  dispatchOverride?: React.Dispatch<AppAction>
}): JSX.Element {
  const mergedState: AppState = {
    ...initialState,
    ...stateOverride,
    editor: {
      ...initialState.editor,
      ...(stateOverride?.editor || {})
    }
  }

  const mockDispatch = dispatchOverride || jest.fn()

  return (
    <AppStateContext.Provider value={mergedState}>
      <AppDispatchContext.Provider value={mockDispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

// We need to mock the useAppState and useAppDispatch hooks
jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext')
  let mockState: AppState = actual.initialState
  let mockDispatch: jest.Mock = jest.fn()

  return {
    ...actual,
    useAppState: (): AppState => mockState,
    useAppDispatch: (): jest.Mock => mockDispatch,
    __setMockState: (state: AppState): void => {
      mockState = state
    },
    __setMockDispatch: (dispatch: jest.Mock): void => {
      mockDispatch = dispatch
    }
  }
})

// Access the mock setters
const mockModule = jest.requireMock('../../store/AppContext') as {
  __setMockState: (state: AppState) => void
  __setMockDispatch: (dispatch: jest.Mock) => void
  initialState: AppState
}

describe('EditorTabs', () => {
  let mockDispatch: jest.Mock

  beforeEach(() => {
    mockDispatch = jest.fn()
    mockModule.__setMockDispatch(mockDispatch)
  })

  it('renders empty when no files are open', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: { ...initialState.editor, openFiles: {}, activeFilePath: null }
    })

    render(<EditorTabs />)
    const tabs = screen.getByTestId('editor-tabs')
    expect(tabs).toBeInTheDocument()
    expect(tabs).toHaveClass('empty')
  })

  it('renders tabs for open files', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/index.ts': { path: '/src/index.ts', content: 'code', language: 'typescript', isDirty: false },
          '/src/app.py': { path: '/src/app.py', content: 'print()', language: 'python', isDirty: false }
        },
        activeFilePath: '/src/index.ts'
      }
    })

    render(<EditorTabs />)
    expect(screen.getByTestId('editor-tab-index.ts')).toBeInTheDocument()
    expect(screen.getByTestId('editor-tab-app.py')).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false },
          '/src/b.ts': { path: '/src/b.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/b.ts'
      }
    })

    render(<EditorTabs />)
    expect(screen.getByTestId('editor-tab-a.ts')).not.toHaveClass('active')
    expect(screen.getByTestId('editor-tab-b.ts')).toHaveClass('active')
  })

  it('dispatches SET_ACTIVE_FILE when clicking a tab', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false },
          '/src/b.ts': { path: '/src/b.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/a.ts'
      }
    })

    render(<EditorTabs />)
    fireEvent.click(screen.getByTestId('editor-tab-b.ts'))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_FILE',
      payload: '/src/b.ts'
    })
  })

  it('dispatches CLOSE_FILE when clicking the close button', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/a.ts'
      }
    })

    render(<EditorTabs />)
    fireEvent.click(screen.getByTestId('close-tab-a.ts'))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'CLOSE_FILE',
      payload: '/src/a.ts'
    })
  })

  it('close button click does not trigger tab switch', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/a.ts'
      }
    })

    render(<EditorTabs />)
    fireEvent.click(screen.getByTestId('close-tab-a.ts'))

    // Should only have CLOSE_FILE, not SET_ACTIVE_FILE
    const calls = mockDispatch.mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0][0].type).toBe('CLOSE_FILE')
  })

  it('shows dirty indicator for modified files', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: true }
        },
        activeFilePath: '/src/a.ts'
      }
    })

    render(<EditorTabs />)
    expect(screen.getByTestId('dirty-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('editor-tab-a.ts')).toHaveClass('dirty')
  })

  it('has correct aria attributes', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/a.ts'
      }
    })

    render(<EditorTabs />)
    const tabList = screen.getByRole('tablist')
    expect(tabList).toBeInTheDocument()

    const tab = screen.getByRole('tab')
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-label', 'a.ts')
  })

  it('shows git status indicator for modified files', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/a.ts'
      },
      git: { ...initialState.git, fileStatuses: { '/src/a.ts': 'modified' } }
    })

    render(<EditorTabs />)
    const indicator = screen.getByTestId('tab-git-status-a.ts')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveTextContent('M')
    expect(indicator).toHaveClass('git-modified')
  })

  it('shows git status indicator for added files', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/b.ts': { path: '/src/b.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/b.ts'
      },
      git: { ...initialState.git, fileStatuses: { '/src/b.ts': 'added' } }
    })

    render(<EditorTabs />)
    const indicator = screen.getByTestId('tab-git-status-b.ts')
    expect(indicator).toHaveTextContent('A')
    expect(indicator).toHaveClass('git-added')
  })

  it('does not show git status indicator when file has no status', () => {
    mockModule.__setMockState({
      ...initialState,
      editor: {
        ...initialState.editor,
        openFiles: {
          '/src/a.ts': { path: '/src/a.ts', content: '', language: 'typescript', isDirty: false }
        },
        activeFilePath: '/src/a.ts'
      },
      git: { ...initialState.git, fileStatuses: {} }
    })

    render(<EditorTabs />)
    expect(screen.queryByTestId('tab-git-status-a.ts')).not.toBeInTheDocument()
  })
})
