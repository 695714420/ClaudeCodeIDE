import type { DefaultKeybindings, UserSettings } from './types'

// ============================================================
// ClaudeCode IDE — Constants
// ============================================================

// --- Default Keybindings ---

export const DEFAULT_KEYBINDINGS: DefaultKeybindings = {
  generateCode: 'Ctrl+Shift+G',
  optimizeCode: 'Ctrl+Shift+O',
  fixBug: 'Ctrl+Shift+F',
  explainCode: 'Ctrl+Shift+E',
  formatCode: 'Ctrl+Shift+L',
  toggleRightPanel: 'Ctrl+B',
  toggleLeftPanel: 'Ctrl+Shift+B',
  toggleTerminal: 'Ctrl+`'
}

// --- Default User Settings ---

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  autoSave: 'off',
  encoding: 'UTF-8',
  keybindings: { ...DEFAULT_KEYBINDINGS },
  language: 'en',
  buddyEnabled: false,
  selectedBackend: 'claude'
}

// --- Font Size Constraints ---

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 20

// --- IPC Channel Names ---

export const IPC_CHANNELS = {
  // File system
  FILE_READ_DIRECTORY: 'file:readDirectory',
  FILE_CREATE: 'file:create',
  FILE_CREATE_DIRECTORY: 'file:createDirectory',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_RENAME: 'file:rename',
  FILE_READ_DIRECTORY_SHALLOW: 'file:readDirectoryShallow',
  FILE_LIST_ALL: 'file:listAll',
  FILE_WATCH: 'file:watch',
  FILE_CHANGE_EVENT: 'file:changeEvent',

  // Cache / history
  CACHE_SAVE_HISTORY: 'cache:saveHistory',
  CACHE_GET_HISTORY: 'cache:getHistory',
  CACHE_DELETE_HISTORY: 'cache:deleteHistory',
  CACHE_CLEAR_HISTORY: 'cache:clearHistory',
  CACHE_SAVE_SNIPPET: 'cache:saveSnippet',
  CACHE_GET_SNIPPETS: 'cache:getSnippets',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',

  // Dialog
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',

  // Sessions
  SESSIONS_SAVE: 'sessions:save',
  SESSIONS_LOAD: 'sessions:load',

  // Buddy
  BUDDY_GET_USER_ID: 'buddy:getUserId',

  // CLI
  CLI_EXECUTE: 'cli:execute',
  CLI_STREAM_EVENT: 'cli:stream-event',
  CLI_CANCEL: 'cli:cancel',
  CLI_CHECK_STATUS: 'cli:check-status',

  // Backend
  BACKEND_LIST: 'backend:list',
  BACKEND_CHECK_STATUS: 'backend:check-status',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // Search
  SEARCH_FILES: 'search:files',
  SEARCH_REPLACE: 'search:replace',

  // Git
  GIT_IS_REPO: 'git:isRepo',
  GIT_BRANCH: 'git:branch',
  GIT_STATUS: 'git:status',
  GIT_DIFF: 'git:diff',
  GIT_STAGE: 'git:stage',
  GIT_COMMIT: 'git:commit',
  GIT_PUSH: 'git:push',
  GIT_PULL: 'git:pull',

  // Window
  WINDOW_NEW: 'window:new'
} as const

// --- Default Ignore Patterns ---

export const DEFAULT_IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  '.DS_Store',
  'out',
  'dist',
  'release',
  '.next',
  '__pycache__',
  '.venv',
  '.cache',
  '.parcel-cache',
  'coverage',
  '.nyc_output',
  'thumbs.db'
]

// --- CLI Timeout ---

export const CLI_TIMEOUT_MS = 120_000
