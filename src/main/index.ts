import { app, BrowserWindow, ipcMain, shell, Menu, dialog, session } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '../shared/constants'
import { FileSystemService } from './services/FileSystemService'
import { ClaudeBackendAdapter } from './services/ClaudeBackendAdapter'
import { CodexBackendAdapter } from './services/CodexBackendAdapter'
import { BackendRegistry } from './services/BackendRegistry'
import { CacheManager } from './services/CacheManager'
import { TerminalService } from './services/TerminalService'
import { SearchService } from './services/SearchService'
import { GitService } from './services/GitService'
import { wrapHandler } from './utils/ipcWrapper'
import type { HistoryRecord, CodeSnippet } from '../shared/types'

const fileSystemService = new FileSystemService()
const backendRegistry = new BackendRegistry()
backendRegistry.register(new ClaudeBackendAdapter())
backendRegistry.register(new CodexBackendAdapter())
const cacheManager = new CacheManager()
const terminalService = new TerminalService()
const searchService = new SearchService()
const gitService = new GitService()

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/**
 * Register IPC handlers for all channels.
 */
function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // --- File system handlers ---
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ_DIRECTORY,
    wrapHandler((dirPath: string) => fileSystemService.readDirectoryShallow(dirPath))
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ_DIRECTORY_SHALLOW,
    wrapHandler((dirPath: string, ignorePatterns?: string[]) =>
      fileSystemService.readDirectoryShallow(dirPath, ignorePatterns)
    )
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_CREATE,
    wrapHandler((filePath: string, content?: string) =>
      fileSystemService.createFile(filePath, content)
    )
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_CREATE_DIRECTORY,
    wrapHandler((dirPath: string) => fileSystemService.createDirectory(dirPath))
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_READ,
    wrapHandler((filePath: string) => fileSystemService.readFile(filePath))
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_WRITE,
    wrapHandler((filePath: string, content: string) =>
      fileSystemService.writeFile(filePath, content)
    )
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_DELETE,
    wrapHandler((filePath: string) => fileSystemService.deleteFile(filePath))
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_RENAME,
    wrapHandler((oldPath: string, newPath: string) =>
      fileSystemService.renameFile(oldPath, newPath)
    )
  )
  ipcMain.handle(
    IPC_CHANNELS.FILE_LIST_ALL,
    wrapHandler((dirPath: string) => fileSystemService.listAllFiles(dirPath))
  )
  ipcMain.handle(IPC_CHANNELS.FILE_WATCH, async (_event, dirPath: string) => {
    fileSystemService.watchDirectory(dirPath, (changeEvent) => {
      mainWindow.webContents.send(IPC_CHANNELS.FILE_CHANGE_EVENT, changeEvent)
    })
  })

  // --- CLI handlers (Task 5.1) ---
  ipcMain.handle(IPC_CHANNELS.CLI_EXECUTE, async (_event, prompt: string, cwd: string, backendId?: string) => {
    const adapter = backendId ? backendRegistry.get(backendId) : backendRegistry.getDefault()
    if (!adapter) {
      throw new Error(`Backend not found: ${backendId}`)
    }
    await adapter.execute({ prompt, cwd }, (event) => {
      mainWindow.webContents.send(IPC_CHANNELS.CLI_STREAM_EVENT, event)
    })
  })
  ipcMain.handle(IPC_CHANNELS.CLI_CANCEL, (_event, backendId?: string) => {
    const adapter = backendId ? backendRegistry.get(backendId) : backendRegistry.getDefault()
    if (adapter) {
      adapter.cancel()
    }
  })
  ipcMain.handle(IPC_CHANNELS.CLI_CHECK_STATUS, (_event, backendId?: string) => {
    const adapter = backendId ? backendRegistry.get(backendId) : backendRegistry.getDefault()
    if (!adapter) {
      throw new Error(`Backend not found: ${backendId}`)
    }
    return adapter.checkStatus()
  })

  // --- Backend handlers ---
  ipcMain.handle(IPC_CHANNELS.BACKEND_LIST, () => {
    return backendRegistry.list()
  })
  ipcMain.handle(IPC_CHANNELS.BACKEND_CHECK_STATUS, (_event, backendId: string) => {
    const adapter = backendRegistry.get(backendId)
    if (!adapter) {
      throw new Error(`Backend not found: ${backendId}`)
    }
    return adapter.checkStatus()
  })

  // --- Dialog handlers ---
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FOLDER, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // --- Cache management handlers ---
  ipcMain.handle(
    IPC_CHANNELS.CACHE_SAVE_HISTORY,
    wrapHandler((record: HistoryRecord) => cacheManager.saveHistoryRecord(record))
  )
  ipcMain.handle(
    IPC_CHANNELS.CACHE_GET_HISTORY,
    wrapHandler((query?: string) => cacheManager.getHistoryRecords(query))
  )
  ipcMain.handle(
    IPC_CHANNELS.CACHE_DELETE_HISTORY,
    wrapHandler((id: string) => cacheManager.deleteHistoryRecord(id))
  )
  ipcMain.handle(
    IPC_CHANNELS.CACHE_CLEAR_HISTORY,
    wrapHandler(() => cacheManager.clearHistory())
  )
  ipcMain.handle(
    IPC_CHANNELS.CACHE_SAVE_SNIPPET,
    wrapHandler((snippet: CodeSnippet) => cacheManager.saveCodeSnippet(snippet))
  )
  ipcMain.handle(
    IPC_CHANNELS.CACHE_GET_SNIPPETS,
    wrapHandler(() => cacheManager.getCodeSnippets())
  )

  // --- Settings handlers ---
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    wrapHandler(() => cacheManager.loadSettings())
  )
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE,
    wrapHandler((settings: unknown) => cacheManager.saveSettings(settings))
  )

  // --- Session handlers ---
  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_SAVE,
    wrapHandler((sessions: unknown) => cacheManager.saveSessions(sessions))
  )
  ipcMain.handle(
    IPC_CHANNELS.SESSIONS_LOAD,
    wrapHandler(() => cacheManager.loadSessions())
  )

  // --- Buddy handler ---
  ipcMain.handle(IPC_CHANNELS.BUDDY_GET_USER_ID, async () => {
    try {
      const configPath = join(homedir(), '.claude.json')
      const raw = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(raw)
      return config.oauthAccount?.accountUuid ?? config.userID ?? null
    } catch {
      return null
    }
  })

  // --- Terminal handlers ---
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, cwd: string) => {
    const id = terminalService.create(
      cwd,
      (termId, data) => {
        mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, termId, data)
      },
      (termId, code) => {
        mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, termId, code)
      }
    )
    return id
  })
  ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, (_event, id: string, data: string) => {
    terminalService.write(id, data)
  })
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CLOSE, (_event, id: string) => {
    terminalService.close(id)
  })

  // --- Search handlers ---
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_FILES,
    wrapHandler((options: {
      query: string
      rootPath: string
      isRegex: boolean
      caseSensitive: boolean
      includePattern?: string
      maxResults?: number
    }) => searchService.search(options))
  )
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_REPLACE,
    wrapHandler((options: {
      query: string
      rootPath: string
      isRegex: boolean
      caseSensitive: boolean
      includePattern?: string
    }, replacement: string) => searchService.replaceInFiles(options, replacement))
  )

  // --- Window handlers ---
  ipcMain.handle(IPC_CHANNELS.WINDOW_NEW, () => {
    createWindow()
  })

  // --- Git handlers ---
  ipcMain.handle(
    IPC_CHANNELS.GIT_IS_REPO,
    wrapHandler((dirPath: string) => gitService.isGitRepo(dirPath))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_BRANCH,
    wrapHandler((dirPath: string) => gitService.getCurrentBranch(dirPath))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_STATUS,
    wrapHandler((dirPath: string) => gitService.getStatus(dirPath))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_DIFF,
    wrapHandler((filePath: string, cwd: string) => gitService.getDiff(filePath, cwd))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_STAGE,
    wrapHandler((filePaths: string[], cwd: string) => gitService.stage(filePaths, cwd))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    wrapHandler((cwd: string, message: string) => gitService.commit(cwd, message))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_PUSH,
    wrapHandler((cwd: string) => gitService.push(cwd))
  )
  ipcMain.handle(
    IPC_CHANNELS.GIT_PULL,
    wrapHandler((cwd: string) => gitService.pull(cwd))
  )
}

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  // Set Content Security Policy headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' blob:",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self' data:",
            "connect-src 'self'",
            "worker-src 'self' blob:"
          ].join('; ')
        ]
      }
    })
  })

  mainWindow = createWindow()
  registerIpcHandlers(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      // IPC handlers are already registered globally — no need to re-register
    }
  })
})

app.on('window-all-closed', () => {
  fileSystemService.stopAllWatchers()
  terminalService.closeAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
