import React, { createContext, useContext, useReducer } from 'react'
import type {
  ApiResult,
  CodeSelection,
  CursorPosition,
  RequestType,
  UserSettings
} from '../../shared/types'
import { DEFAULT_USER_SETTINGS } from '../../shared/constants'

// --- FileState (using Record instead of Map for reducer compatibility) ---

export interface FileState {
  path: string
  content: string
  language: string
  isDirty: boolean
}

// --- AppState ---

export interface AppState {
  layout: {
    leftPanelVisible: boolean
    rightPanelVisible: boolean
    leftPanelWidth: number
    rightPanelWidth: number
    terminalVisible: boolean
    terminalHeight: number
    quickOpenVisible: boolean
    commandPaletteVisible: boolean
  }
  editor: {
    openFiles: Record<string, FileState>
    activeFilePath: string | null
    currentSelection: CodeSelection | null
    cursorPosition: CursorPosition
  }
  cli: {
    status: 'connected' | 'disconnected'
    version: string | null
    modelName: string | null
    isLoading: boolean
    currentRequestType: RequestType | null
    lastResult: ApiResult | null
    streamingText: string
    pendingChatText: string | null
    activeBackend: string
  }
  network: {
    isOnline: boolean
  }
  workspace: {
    rootPath: string
  }
  git: {
    branch: string
    isRepo: boolean
    fileStatuses: Record<string, string>
  }
  settings: UserSettings
}

// --- Initial State ---

export const initialState: AppState = {
  layout: {
    leftPanelVisible: true,
    rightPanelVisible: true, // Show chat panel by default
    leftPanelWidth: 250,
    rightPanelWidth: 420,
    terminalVisible: false,
    terminalHeight: 200,
    quickOpenVisible: false,
    commandPaletteVisible: false
  },
  editor: {
    openFiles: {},
    activeFilePath: null,
    currentSelection: null,
    cursorPosition: { line: 1, column: 1 }
  },
  cli: {
    status: 'disconnected',
    version: null,
    modelName: null,
    isLoading: false,
    currentRequestType: null,
    lastResult: null,
    streamingText: '',
    pendingChatText: null,
    activeBackend: 'claude'
  },
  network: {
    isOnline: true
  },
  workspace: {
    rootPath: '.'
  },
  git: {
    branch: '',
    isRepo: false,
    fileStatuses: {}
  },
  settings: { ...DEFAULT_USER_SETTINGS }
}

// --- Action Types ---

export type AppAction =
  // Layout actions
  | { type: 'TOGGLE_LEFT_PANEL' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'SET_LEFT_PANEL_WIDTH'; payload: number }
  | { type: 'SET_RIGHT_PANEL_WIDTH'; payload: number }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'SET_TERMINAL_HEIGHT'; payload: number }
  | { type: 'TOGGLE_QUICK_OPEN' }
  | { type: 'SET_QUICK_OPEN_VISIBLE'; payload: boolean }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'SET_COMMAND_PALETTE_VISIBLE'; payload: boolean }
  // Editor actions
  | { type: 'OPEN_FILE'; payload: FileState }
  | { type: 'CLOSE_FILE'; payload: string }
  | { type: 'SET_ACTIVE_FILE'; payload: string | null }
  | { type: 'UPDATE_FILE_CONTENT'; payload: { path: string; content: string } }
  | { type: 'SET_FILE_DIRTY'; payload: { path: string; isDirty: boolean } }
  | { type: 'SET_SELECTION'; payload: CodeSelection | null }
  | { type: 'SET_CURSOR_POSITION'; payload: CursorPosition }
  // CLI actions
  | { type: 'SET_CLI_STATUS'; payload: { status: 'connected' | 'disconnected'; version?: string } }
  | { type: 'SET_CLI_MODEL'; payload: string }
  | { type: 'APPEND_STREAMING_TEXT'; payload: string }
  | { type: 'CLEAR_STREAMING_TEXT' }
  | { type: 'SET_CLI_LOADING'; payload: { isLoading: boolean; requestType: RequestType | null } }
  | { type: 'SET_CLI_RESULT'; payload: ApiResult | null }
  | { type: 'SEND_TO_CHAT'; payload: string }
  | { type: 'CLEAR_PENDING_CHAT' }
  | { type: 'SET_ACTIVE_BACKEND'; payload: string }
  // Network actions
  | { type: 'SET_NETWORK_STATUS'; payload: boolean }
  // Workspace actions
  | { type: 'SET_WORKSPACE_PATH'; payload: string }
  // Git actions
  | { type: 'SET_GIT_BRANCH'; payload: string }
  | { type: 'SET_GIT_IS_REPO'; payload: boolean }
  | { type: 'SET_GIT_FILE_STATUSES'; payload: Record<string, string> }
  // Settings actions
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }

// --- Reducer ---

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Layout
    case 'TOGGLE_LEFT_PANEL':
      return {
        ...state,
        layout: { ...state.layout, leftPanelVisible: !state.layout.leftPanelVisible }
      }
    case 'TOGGLE_RIGHT_PANEL':
      return {
        ...state,
        layout: { ...state.layout, rightPanelVisible: !state.layout.rightPanelVisible }
      }
    case 'SET_LEFT_PANEL_WIDTH':
      return {
        ...state,
        layout: { ...state.layout, leftPanelWidth: action.payload }
      }
    case 'SET_RIGHT_PANEL_WIDTH':
      return {
        ...state,
        layout: { ...state.layout, rightPanelWidth: action.payload }
      }
    case 'TOGGLE_TERMINAL':
      return {
        ...state,
        layout: { ...state.layout, terminalVisible: !state.layout.terminalVisible }
      }
    case 'SET_TERMINAL_HEIGHT':
      return {
        ...state,
        layout: { ...state.layout, terminalHeight: action.payload }
      }
    case 'TOGGLE_QUICK_OPEN':
      return {
        ...state,
        layout: { ...state.layout, quickOpenVisible: !state.layout.quickOpenVisible }
      }
    case 'SET_QUICK_OPEN_VISIBLE':
      return {
        ...state,
        layout: { ...state.layout, quickOpenVisible: action.payload }
      }
    case 'TOGGLE_COMMAND_PALETTE':
      return {
        ...state,
        layout: { ...state.layout, commandPaletteVisible: !state.layout.commandPaletteVisible }
      }
    case 'SET_COMMAND_PALETTE_VISIBLE':
      return {
        ...state,
        layout: { ...state.layout, commandPaletteVisible: action.payload }
      }

    // Editor
    case 'OPEN_FILE':
      return {
        ...state,
        editor: {
          ...state.editor,
          openFiles: { ...state.editor.openFiles, [action.payload.path]: action.payload },
          activeFilePath: action.payload.path
        }
      }
    case 'CLOSE_FILE': {
      const { [action.payload]: _, ...remaining } = state.editor.openFiles
      const paths = Object.keys(remaining)
      const newActive =
        state.editor.activeFilePath === action.payload
          ? paths.length > 0
            ? paths[paths.length - 1]
            : null
          : state.editor.activeFilePath
      return {
        ...state,
        editor: { ...state.editor, openFiles: remaining, activeFilePath: newActive }
      }
    }
    case 'SET_ACTIVE_FILE':
      return {
        ...state,
        editor: { ...state.editor, activeFilePath: action.payload }
      }
    case 'UPDATE_FILE_CONTENT': {
      const file = state.editor.openFiles[action.payload.path]
      if (!file) return state
      return {
        ...state,
        editor: {
          ...state.editor,
          openFiles: {
            ...state.editor.openFiles,
            [action.payload.path]: { ...file, content: action.payload.content, isDirty: true }
          }
        }
      }
    }
    case 'SET_FILE_DIRTY': {
      const file = state.editor.openFiles[action.payload.path]
      if (!file) return state
      return {
        ...state,
        editor: {
          ...state.editor,
          openFiles: {
            ...state.editor.openFiles,
            [action.payload.path]: { ...file, isDirty: action.payload.isDirty }
          }
        }
      }
    }
    case 'SET_SELECTION':
      return {
        ...state,
        editor: { ...state.editor, currentSelection: action.payload }
      }
    case 'SET_CURSOR_POSITION':
      return {
        ...state,
        editor: { ...state.editor, cursorPosition: action.payload }
      }

    // CLI
    case 'SET_CLI_STATUS':
      return {
        ...state,
        cli: {
          ...state.cli,
          status: action.payload.status,
          ...(action.payload.version !== undefined ? { version: action.payload.version } : {})
        }
      }
    case 'SET_CLI_MODEL':
      return {
        ...state,
        cli: { ...state.cli, modelName: action.payload }
      }
    case 'APPEND_STREAMING_TEXT':
      return {
        ...state,
        cli: { ...state.cli, streamingText: state.cli.streamingText + action.payload }
      }
    case 'CLEAR_STREAMING_TEXT':
      return {
        ...state,
        cli: { ...state.cli, streamingText: '' }
      }
    case 'SET_CLI_LOADING':
      return {
        ...state,
        cli: {
          ...state.cli,
          isLoading: action.payload.isLoading,
          currentRequestType: action.payload.requestType
        }
      }
    case 'SET_CLI_RESULT':
      return {
        ...state,
        cli: { ...state.cli, lastResult: action.payload, isLoading: false, currentRequestType: null }
      }
    case 'SEND_TO_CHAT':
      return {
        ...state,
        cli: { ...state.cli, pendingChatText: action.payload }
      }
    case 'CLEAR_PENDING_CHAT':
      return {
        ...state,
        cli: { ...state.cli, pendingChatText: null }
      }
    case 'SET_ACTIVE_BACKEND':
      return {
        ...state,
        cli: { ...state.cli, activeBackend: action.payload }
      }

    // Network
    case 'SET_NETWORK_STATUS':
      return {
        ...state,
        network: { ...state.network, isOnline: action.payload }
      }

    // Workspace
    case 'SET_WORKSPACE_PATH':
      return {
        ...state,
        workspace: { ...state.workspace, rootPath: action.payload }
      }

    // Git
    case 'SET_GIT_BRANCH':
      return {
        ...state,
        git: { ...state.git, branch: action.payload }
      }
    case 'SET_GIT_IS_REPO':
      return {
        ...state,
        git: { ...state.git, isRepo: action.payload }
      }
    case 'SET_GIT_FILE_STATUSES':
      return {
        ...state,
        git: { ...state.git, fileStatuses: action.payload }
      }

    // Settings
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      }

    default:
      return state
  }
}

// --- Contexts ---

const AppStateContext = createContext<AppState | undefined>(undefined)
const AppDispatchContext = createContext<React.Dispatch<AppAction> | undefined>(undefined)

// --- Provider ---

export function AppProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

// --- Hooks ---

export function useAppState(): AppState {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return context
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  const context = useContext(AppDispatchContext)
  if (context === undefined) {
    throw new Error('useAppDispatch must be used within an AppProvider')
  }
  return context
}
