import React, { useCallback, useState, useEffect, useRef } from 'react'
import { AppProvider, useAppState, useAppDispatch } from '../store/AppContext'
import { ThemeProvider } from '../theme/ThemeProvider'
import { Layout } from '../components/Layout'
import { NavBar } from '../components/NavBar'
import { StatusBar } from '../components/StatusBar'
import { FileExplorer } from '../components/FileExplorer'
import { SearchPanel } from '../components/SearchPanel'
import { CodeEditor } from '../components/CodeEditor'
import { EditorTabs } from '../components/EditorTabs'
import { Breadcrumb } from '../components/Breadcrumb'
import { AIChatPanelConnected } from '../components/AIChatPanel'
import { BuddyPet } from '../components/BuddyPet'
import { SettingsModal } from '../components/SettingsModal'
import { ToastContainer, showToast } from '../components/Toast'
import { useFileManager } from '../hooks/useFileManager'
import { useFileListCache } from '../hooks/useFileListCache'
import { QuickOpen } from '../components/QuickOpen'
import { CommandPalette } from '../components/CommandPalette'
import type { Command } from '../components/CommandPalette'
import { t } from '../i18n'
import type { Lang } from '../i18n'
import type { FileTreeNode, CursorPosition, CodeSelection } from '../../shared/types'
import '../components/SidebarTabs.css'

type SidebarTab = 'files' | 'search'

function AppContent(): JSX.Element {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { openFile } = useFileManager()
  const [showSettings, setShowSettings] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const settingsInitializedRef = useRef(false)
  const lang = (state.settings.language ?? 'en') as Lang

  // Load saved settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then((saved: unknown) => {
      if (saved && typeof saved === 'object') {
        dispatch({ type: 'UPDATE_SETTINGS', payload: saved as Record<string, unknown> })
      }
      setSettingsLoaded(true)
    }).catch(() => setSettingsLoaded(true))
  }, [dispatch])

  // Auto-save settings whenever they change (skip the first render after load)
  useEffect(() => {
    if (!settingsLoaded) return
    // Skip the first trigger right after settingsLoaded becomes true
    // because state.settings hasn't been updated with loaded values yet
    if (!settingsInitializedRef.current) {
      settingsInitializedRef.current = true
      return
    }
    window.electronAPI.saveSettings(state.settings).catch(() => {})
  }, [state.settings, settingsLoaded])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ctrl+`: Toggle terminal
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === '`') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_TERMINAL' })
      }
      // Ctrl+S: Save file
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 's') {
        e.preventDefault()
        handleFileAction('save')
      }
      // Ctrl+Shift+P: Command Palette
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.key === 'P') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_COMMAND_PALETTE' })
      }
      // Ctrl+P: Quick Open (only if Shift is NOT held)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'p') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_QUICK_OPEN' })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, handleFileAction])

  // Auto-save dirty files after a delay
  useEffect(() => {
    if (state.settings.autoSave === 'off') return
    const delay = state.settings.autoSave === 'afterDelay' ? 1000 : 0
    const { openFiles } = state.editor
    const dirtyFiles = Object.values(openFiles).filter(f => f.isDirty)
    if (dirtyFiles.length === 0) return

    const timer = setTimeout(() => {
      dirtyFiles.forEach(f => {
        window.electronAPI.writeFile(f.path, f.content)
          .then(() => dispatch({ type: 'SET_FILE_DIRTY', payload: { path: f.path, isDirty: false } }))
          .catch(() => {})
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [state.editor.openFiles, state.settings.autoSave, dispatch])

  const activeFile = state.editor.activeFilePath
    ? state.editor.openFiles[state.editor.activeFilePath]
    : null

  // NavBar handlers
  const handleFileAction = useCallback(
    async (action: 'new' | 'open' | 'save' | 'saveAs') => {
      if (action === 'open') {
        const folder = await window.electronAPI.openFolderDialog()
        if (folder) {
          setRootPath(folder)
          dispatch({ type: 'SET_WORKSPACE_PATH', payload: folder })
          try {
            const tree = await window.electronAPI.readDirectory(folder) as FileTreeNode[]
            setFileTree(tree)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            showToast('error', t('fileError.openFolderFailed', lang, msg))
          }
        }
      } else if (action === 'save') {
        const { activeFilePath, openFiles } = state.editor
        if (activeFilePath && openFiles[activeFilePath] && openFiles[activeFilePath].isDirty) {
          try {
            await window.electronAPI.writeFile(activeFilePath, openFiles[activeFilePath].content)
            dispatch({ type: 'SET_FILE_DIRTY', payload: { path: activeFilePath, isDirty: false } })
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            showToast('error', t('fileError.writeFailed', lang, msg))
          }
        }
      }
    },
    [dispatch, lang, state.editor]
  )

  const handleEditAction = useCallback(
    (_action: 'undo' | 'redo' | 'copy' | 'paste') => {
      // Edit actions handled via Monaco in future tasks
    },
    []
  )

  const handleViewAction = useCallback(
    (_action: 'toggleTheme' | 'toggleSidebar') => {
      // Theme toggle handled in future tasks
    },
    []
  )

  // Editor handlers
  const handleEditorChange = useCallback(
    (content: string) => {
      if (state.editor.activeFilePath) {
        dispatch({
          type: 'UPDATE_FILE_CONTENT',
          payload: { path: state.editor.activeFilePath, content }
        })
      }
    },
    [state.editor.activeFilePath, dispatch]
  )

  const handleSelectionChange = useCallback(
    (selection: CodeSelection) => {
      dispatch({ type: 'SET_SELECTION', payload: selection.text ? selection : null })
    },
    [dispatch]
  )

  const handleCursorChange = useCallback(
    (position: CursorPosition) => {
      dispatch({ type: 'SET_CURSOR_POSITION', payload: position })
    },
    [dispatch]
  )

  const handleSendToChat = useCallback(
    (text: string) => {
      dispatch({ type: 'SEND_TO_CHAT', payload: text })
      // Ensure the chat panel is visible
      if (!state.layout.rightPanelVisible) {
        dispatch({ type: 'TOGGLE_RIGHT_PANEL' })
      }
    },
    [dispatch, state.layout.rightPanelVisible]
  )

  // FileExplorer handlers (stubs — tree loading via IPC in future)
  const handleFileSelect = useCallback(
    (filePath: string) => {
      openFile(filePath)
    },
    [openFile]
  )

  const [fileTree, setFileTree] = useState<FileTreeNode[]>([])
  const [rootPath, setRootPath] = useState('.')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files')

  // File list cache for QuickOpen
  const fileList = useFileListCache(rootPath)

  const handleSearchFileOpen = useCallback(
    (filePath: string, line?: number) => {
      openFile(filePath)
      // TODO: jump to line when supported
      void line
    },
    [openFile]
  )

  // Load file tree on mount
  useEffect(() => {
    const loadTree = async (): Promise<void> => {
      try {
        const tree = await window.electronAPI.readDirectory(rootPath) as FileTreeNode[]
        setFileTree(tree)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        showToast('error', t('fileError.loadTreeFailed', lang, msg))
      }
    }
    loadTree()
  }, [rootPath, lang])

  // Build command list for CommandPalette
  const commands: Command[] = React.useMemo(() => [
    {
      id: 'toggleSidebar',
      label: t('menu.toggleSidebar', lang),
      shortcut: 'Ctrl+B',
      action: () => dispatch({ type: 'TOGGLE_LEFT_PANEL' })
    },
    {
      id: 'toggleClaudeCode',
      label: t('menu.toggleClaudeCode', lang),
      action: () => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })
    },
    {
      id: 'toggleTerminal',
      label: t('terminal.title', lang),
      shortcut: 'Ctrl+`',
      action: () => dispatch({ type: 'TOGGLE_TERMINAL' })
    },
    {
      id: 'quickOpen',
      label: t('quickOpen.placeholder', lang),
      shortcut: 'Ctrl+P',
      action: () => dispatch({ type: 'SET_QUICK_OPEN_VISIBLE', payload: true })
    },
    {
      id: 'newFile',
      label: t('menu.new', lang),
      action: () => handleFileAction('new')
    },
    {
      id: 'openFolder',
      label: t('menu.open', lang),
      action: () => handleFileAction('open')
    },
    {
      id: 'saveFile',
      label: t('menu.save', lang),
      shortcut: 'Ctrl+S',
      action: () => handleFileAction('save')
    },
    {
      id: 'preferences',
      label: t('menu.preferences', lang),
      action: () => setShowSettings(true)
    },
    {
      id: 'viewFiles',
      label: t('sidebar.files', lang),
      action: () => setSidebarTab('files')
    },
    {
      id: 'viewSearch',
      label: t('sidebar.search', lang),
      action: () => setSidebarTab('search')
    }
  ], [lang, dispatch, handleFileAction])

  return (
    <div className="app" data-testid="app">
      <NavBar
        onFileAction={handleFileAction}
        onEditAction={handleEditAction}
        onViewAction={handleViewAction}
        onOpenSettings={() => setShowSettings(true)}
      />
      <Layout
        left={
          <div className="sidebar-container" data-testid="sidebar-container">
            <div className="sidebar-tabs" data-testid="sidebar-tabs" role="tablist">
              <button
                className={`sidebar-tab${sidebarTab === 'files' ? ' active' : ''}`}
                onClick={() => setSidebarTab('files')}
                data-testid="sidebar-tab-files"
                role="tab"
                aria-selected={sidebarTab === 'files'}
                aria-controls="sidebar-panel-files"
                title={t('sidebar.files', lang)}
              >
                📁 {t('sidebar.files', lang)}
              </button>
              <button
                className={`sidebar-tab${sidebarTab === 'search' ? ' active' : ''}`}
                onClick={() => setSidebarTab('search')}
                data-testid="sidebar-tab-search"
                role="tab"
                aria-selected={sidebarTab === 'search'}
                aria-controls="sidebar-panel-search"
                title={t('sidebar.search', lang)}
              >
                🔍 {t('sidebar.search', lang)}
              </button>
            </div>
            <div className="sidebar-content">
              {sidebarTab === 'files' ? (
                <div id="sidebar-panel-files" role="tabpanel" style={{ height: '100%' }}>
                  <FileExplorer
                    rootPath={rootPath}
                    fileTree={fileTree}
                    onFileSelect={handleFileSelect}
                    onFileCreate={() => {}}
                    onFolderCreate={() => {}}
                    onFileDelete={() => {}}
                    onFileRename={() => {}}
                    onLoadChildren={async (dirPath) => {
                      const children = await window.electronAPI.readDirectoryShallow(dirPath)
                      return children as import('../../shared/types').FileTreeNode[]
                    }}
                    gitStatuses={state.git.fileStatuses}
                    lang={lang}
                  />
                </div>
              ) : (
                <div id="sidebar-panel-search" role="tabpanel" style={{ height: '100%' }}>
                  <SearchPanel rootPath={rootPath} onFileOpen={handleSearchFileOpen} />
                </div>
              )}
            </div>
          </div>
        }
        center={
          <div className="editor-area" data-testid="editor-area">
            <EditorTabs />
            {activeFile && (
              <Breadcrumb filePath={activeFile.path} rootPath={rootPath} />
            )}
            {activeFile ? (
              <CodeEditor
                filePath={activeFile.path}
                content={activeFile.content}
                language={activeFile.language}
                theme={state.settings.theme === 'dark' ? 'dark' : 'light'}
                fontSize={state.settings.fontSize}
                tabSize={state.settings.tabSize}
                wordWrap={state.settings.wordWrap}
                onChange={handleEditorChange}
                onSelectionChange={handleSelectionChange}
                onCursorChange={handleCursorChange}
                onSendToChat={handleSendToChat}
              />
            ) : (
              <div className="editor-placeholder" data-testid="editor-placeholder">
                <p>{t('editor.placeholder', lang)}</p>
              </div>
            )}
          </div>
        }
        right={<AIChatPanelConnected />}
      />
      <StatusBar />
      {state.settings.buddyEnabled && <BuddyPet />}
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <QuickOpen
        visible={state.layout.quickOpenVisible}
        onClose={() => dispatch({ type: 'SET_QUICK_OPEN_VISIBLE', payload: false })}
        onFileSelect={(filePath) => { openFile(filePath); dispatch({ type: 'SET_QUICK_OPEN_VISIBLE', payload: false }) }}
        fileList={fileList}
        recentFiles={Object.keys(state.editor.openFiles)}
        rootPath={rootPath}
        lang={lang}
      />
      <CommandPalette
        visible={state.layout.commandPaletteVisible}
        onClose={() => dispatch({ type: 'SET_COMMAND_PALETTE_VISIBLE', payload: false })}
        commands={commands}
        lang={lang}
      />
      <ToastContainer />
    </div>
  )
}

function App(): JSX.Element {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AppProvider>
  )
}

export default App
