import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import type { HistoryRecord, CodeSnippet, CliStreamEvent, BackendMeta } from '../shared/types'
import type { IpcResult } from '../main/utils/ipcWrapper'

/**
 * Unwraps an IpcResult response: returns data on success, throws on failure.
 */
function unwrapResult<T>(result: IpcResult<T>): T {
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

const electronAPI = {
  // File system operations
  readDirectory: async (dirPath: string): Promise<unknown> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_DIRECTORY, dirPath)),
  readDirectoryShallow: async (dirPath: string, ignorePatterns?: string[]): Promise<unknown> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_READ_DIRECTORY_SHALLOW, dirPath, ignorePatterns)),
  readFile: async (filePath: string): Promise<string> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath)),
  writeFile: async (filePath: string, content: string): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_WRITE, filePath, content)),
  createFile: async (filePath: string, content?: string): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_CREATE, filePath, content)),
  createDirectory: async (dirPath: string): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_CREATE_DIRECTORY, dirPath)),
  deleteFile: async (filePath: string): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, filePath)),
  renameFile: async (oldPath: string, newPath: string): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_RENAME, oldPath, newPath)),
  watchDirectory: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_WATCH, dirPath),
  listAllFiles: async (dirPath: string): Promise<string[]> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST_ALL, dirPath)),
  onFileChange: (callback: (event: unknown) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.FILE_CHANGE_EVENT, (_event, data) => callback(data))
  },

  // CLI operations
  executeCli: (prompt: string, cwd: string, backendId?: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLI_EXECUTE, prompt, cwd, backendId),
  cancelCli: (backendId?: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLI_CANCEL, backendId),
  checkCliStatus: (backendId?: string): Promise<{ available: boolean; version?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLI_CHECK_STATUS, backendId),
  onCliStreamEvent: (callback: (event: CliStreamEvent) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.CLI_STREAM_EVENT, (_event, data) => callback(data))
  },
  removeCliStreamListener: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.CLI_STREAM_EVENT)
  },

  // Backend operations
  listBackends: (): Promise<BackendMeta[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKEND_LIST),
  checkBackendStatus: (backendId: string): Promise<{ available: boolean; version?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.BACKEND_CHECK_STATUS, backendId),

  // Cache management
  saveHistoryRecord: async (record: HistoryRecord): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.CACHE_SAVE_HISTORY, record)),
  getHistoryRecords: async (query?: string): Promise<HistoryRecord[]> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.CACHE_GET_HISTORY, query)),
  deleteHistoryRecord: async (id: string): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.CACHE_DELETE_HISTORY, id)),
  clearHistory: async (): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.CACHE_CLEAR_HISTORY)),
  saveCodeSnippet: async (snippet: CodeSnippet): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.CACHE_SAVE_SNIPPET, snippet)),
  getCodeSnippets: async (): Promise<CodeSnippet[]> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.CACHE_GET_SNIPPETS)),

  // Settings
  getSettings: async (): Promise<unknown> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET)),
  saveSettings: async (settings: unknown): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings)),

  // Dialog
  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FOLDER),

  // Sessions
  saveSessions: async (sessions: unknown): Promise<void> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_SAVE, sessions)),
  loadSessions: async (): Promise<unknown> =>
    unwrapResult(await ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_LOAD)),

  // Buddy
  getBuddyUserId: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.BUDDY_GET_USER_ID),

  // Terminal
  terminalCreate: (cwd: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, cwd),
  terminalWrite: (id: string, data: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, id, data),
  terminalClose: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CLOSE, id),
  onTerminalData: (callback: (id: string, data: string) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, (_event, id, data) => callback(id, data))
  },
  onTerminalExit: (callback: (id: string, code: number | null) => void): void => {
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, (_event, id, code) => callback(id, code))
  },
  removeTerminalListeners: (): void => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.TERMINAL_DATA)
    ipcRenderer.removeAllListeners(IPC_CHANNELS.TERMINAL_EXIT)
  },

  // Search
  searchFiles: (options: {
    query: string
    rootPath: string
    isRegex: boolean
    caseSensitive: boolean
    includePattern?: string
    maxResults?: number
  }): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_FILES, options),
  searchReplace: (options: {
    query: string
    rootPath: string
    isRegex: boolean
    caseSensitive: boolean
    includePattern?: string
  }, replacement: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_REPLACE, options, replacement),

  // Git
  gitIsRepo: (dirPath: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_IS_REPO, dirPath),
  gitBranch: (dirPath: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCH, dirPath),
  gitStatus: (dirPath: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, dirPath),
  gitDiff: (filePath: string, cwd: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_DIFF, filePath, cwd),
  gitStage: (filePaths: string[], cwd: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE, filePaths, cwd),
  gitCommit: (cwd: string, message: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, cwd, message),
  gitPush: (cwd: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_PUSH, cwd),
  gitPull: (cwd: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_PULL, cwd),

  // Window
  newWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_NEW),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
