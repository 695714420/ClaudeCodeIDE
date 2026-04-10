import { useCallback, useState, useEffect, useRef } from 'react'
import { useAppState, useAppDispatch } from '../store/AppContext'
import type {
  ApiResult,
  HistoryRecord,
  RequestType,
  ErrorMarker,
  CliStreamEvent,
  ResultEventData,
  InitEventData,
  AssistantEventData,
  ErrorEventData,
  BackendMeta
} from '../../shared/types'

// --- Prompt builder helper ---

function buildPrompt(
  type: RequestType,
  params: {
    description?: string
    code?: string
    language?: string
    fileContent?: string
    instruction?: string
    markers?: string
  }
): string {
  const lang = params.language || 'javascript'

  switch (type) {
    case 'generate': {
      let prompt = `Generate ${lang} code for: ${params.description || ''}`
      if (params.fileContent) {
        prompt += `\n\nContext:\n${params.fileContent}`
      }
      return prompt
    }
    case 'optimize':
      return `Optimize this ${lang} code:\n\`\`\`${lang}\n${params.code || ''}\n\`\`\``
    case 'fixBug':
      return `Fix bugs in this ${lang} code:\n\`\`\`${lang}\n${params.code || ''}\n\`\`\``
    case 'explain':
      return `Explain this ${lang} code:\n\`\`\`${lang}\n${params.code || ''}\n\`\`\``
    case 'syntax':
      return `Fix syntax errors:\n\`\`\`${lang}\n${params.code || ''}\n\`\`\`\nErrors:\n${params.markers || ''}`
    case 'custom': {
      let prompt = params.instruction || ''
      if (params.code) {
        const lang = params.language || 'text'
        prompt += `\n\n\`\`\`${lang}\n${params.code}\n\`\`\``
      }
      return prompt
    }
    default:
      return params.instruction || ''
  }
}

// --- Return interface ---

export interface UseAIBackendReturn {
  generate: (description: string) => Promise<void>
  optimize: () => Promise<void>
  fixBug: () => Promise<void>
  explain: () => Promise<void>
  checkSyntax: (errorMarkers: ErrorMarker[]) => Promise<void>
  customRequest: (instruction: string) => Promise<void>
  formatAndOptimize: () => Promise<void>
  cliStatus: { available: boolean; version?: string }
  checkCliStatus: () => Promise<void>
  cancelRequest: () => Promise<void>
  historyRecords: HistoryRecord[]
  searchHistory: (keyword: string) => Promise<void>
  deleteHistoryRecord: (id: string) => Promise<void>
  replayHistory: (record: HistoryRecord) => Promise<void>
  copyResult: () => void
  insertResult: () => void
  replaceResult: () => void
  showDiff: boolean
  streamingText: string
  isStreaming: boolean
  switchBackend: (id: string) => Promise<void>
  backends: BackendMeta[]
}

export function useAIBackend(): UseAIBackendReturn {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const [cliStatus, setCliStatus] = useState<{ available: boolean; version?: string }>({
    available: false
  })
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
  const [showDiff, setShowDiff] = useState(false)
  const [backends, setBackends] = useState<BackendMeta[]>([])

  // Track the last request metadata for history saving
  const lastRequestRef = useRef<{ type: RequestType; instruction: string; code?: string } | null>(null)
  // Derived state from AppContext
  const streamingText = state.cli.streamingText
  const isStreaming = state.cli.isLoading

  // --- Stream event listener ---

  useEffect(() => {
    const handleStreamEvent = (event: CliStreamEvent): void => {
      switch (event.type) {
        case 'init': {
          const initData = event.data as InitEventData
          if (initData?.model) {
            dispatch({ type: 'SET_CLI_MODEL', payload: initData.model })
          }
          break
        }
        case 'assistant': {
          const assistantData = event.data as AssistantEventData
          if (assistantData?.text) {
            dispatch({ type: 'APPEND_STREAMING_TEXT', payload: assistantData.text })
          }
          break
        }
        case 'result': {
          const resultData = event.data as ResultEventData
          // Use streamingText as fallback if result content is empty (common with Codex)
          const content = resultData?.result || state.cli.streamingText || ''
          const result: ApiResult = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: state.cli.currentRequestType || 'custom',
            success: true,
            content,
            timestamp: Date.now()
          }
          dispatch({ type: 'SET_CLI_RESULT', payload: result })
          dispatch({ type: 'SET_CLI_LOADING', payload: { isLoading: false, requestType: null } })
          break
        }
        case 'error': {
          const errorData = event.data as ErrorEventData
          const errorResult: ApiResult = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: state.cli.currentRequestType || 'custom',
            success: false,
            content: '',
            errorExplanation: errorData?.message || '未知错误',
            timestamp: Date.now()
          }
          dispatch({ type: 'SET_CLI_RESULT', payload: errorResult })
          dispatch({ type: 'SET_CLI_LOADING', payload: { isLoading: false, requestType: null } })
          break
        }
        case 'cancelled': {
          const cancelledResult: ApiResult = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: state.cli.currentRequestType || 'custom',
            success: false,
            content: '',
            errorExplanation: '请求已取消',
            timestamp: Date.now()
          }
          dispatch({ type: 'SET_CLI_RESULT', payload: cancelledResult })
          dispatch({ type: 'SET_CLI_LOADING', payload: { isLoading: false, requestType: null } })
          break
        }
      }
    }

    window.electronAPI.onCliStreamEvent(handleStreamEvent)

    return () => {
      window.electronAPI.removeCliStreamListener()
    }
  }, [dispatch, state.cli.currentRequestType])

  // Load history and backends on mount
  useEffect(() => {
    window.electronAPI.getHistoryRecords().then((records) => {
      const valid = Array.isArray(records) ? records.filter(r => r && r.id && r.result) : []
      // Filter by current backend
      const filtered = valid.filter(r => !r.backendId || r.backendId === state.cli.activeBackend)
      setHistoryRecords(filtered)
    }).catch(() => {})

    // Load available backends
    window.electronAPI.listBackends().then(setBackends).catch(() => {})
  }, [state.cli.activeBackend]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync activeBackend when settings are loaded/changed (handles async settings load)
  useEffect(() => {
    const backendId = state.settings.selectedBackend
    if (backendId && backendId !== state.cli.activeBackend) {
      dispatch({ type: 'SET_ACTIVE_BACKEND', payload: backendId })
    }
    // Always check status for the current backend when settings change
    const idToCheck = backendId || state.cli.activeBackend || 'claude'
    window.electronAPI.checkCliStatus(idToCheck).then((result) => {
      setCliStatus(result)
      dispatch({
        type: 'SET_CLI_STATUS',
        payload: {
          status: result.available ? 'connected' : 'disconnected',
          version: result.version
        }
      })
    }).catch(() => {
      setCliStatus({ available: false })
      dispatch({ type: 'SET_CLI_STATUS', payload: { status: 'disconnected' } })
    })
  }, [state.settings.selectedBackend]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save history when a new result arrives
  const prevResultForHistoryRef = useRef(state.cli.lastResult)
  useEffect(() => {
    const result = state.cli.lastResult
    if (result && result !== prevResultForHistoryRef.current && result.success && lastRequestRef.current) {
      const { type, instruction, code } = lastRequestRef.current
      const language = state.editor.activeFilePath && state.editor.openFiles[state.editor.activeFilePath]
        ? state.editor.openFiles[state.editor.activeFilePath].language || 'javascript'
        : 'javascript'
      const record: HistoryRecord = {
        id: result.id,
        type,
        instruction,
        code,
        language,
        result,
        createdAt: Date.now(),
        backendId: state.cli.activeBackend
      }
      window.electronAPI.saveHistoryRecord(record)
        .then(() => window.electronAPI.getHistoryRecords())
        .then((records) => {
          const valid = Array.isArray(records) ? records.filter(r => r && r.id && r.result) : []
          const filtered = valid.filter(r => !r.backendId || r.backendId === state.cli.activeBackend)
          setHistoryRecords(filtered)
        })
        .catch(() => {})
      lastRequestRef.current = null
    }
    prevResultForHistoryRef.current = result
  }, [state.cli.lastResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Helpers ---

  const getCurrentLanguage = useCallback((): string => {
    const { activeFilePath, openFiles } = state.editor
    if (activeFilePath && openFiles[activeFilePath]) {
      return openFiles[activeFilePath].language || 'javascript'
    }
    return 'javascript'
  }, [state.editor])

  const getSelectedCode = useCallback((): string => {
    return state.editor.currentSelection?.text || ''
  }, [state.editor.currentSelection])

  const getActiveFileContent = useCallback((): string => {
    const { activeFilePath, openFiles } = state.editor
    if (activeFilePath && openFiles[activeFilePath]) {
      return openFiles[activeFilePath].content
    }
    return ''
  }, [state.editor])

  // --- CLI status check ---

  const checkCliStatus = useCallback(async (): Promise<void> => {
    try {
      const result = await window.electronAPI.checkCliStatus(state.cli.activeBackend)
      setCliStatus(result)
      dispatch({
        type: 'SET_CLI_STATUS',
        payload: {
          status: result.available ? 'connected' : 'disconnected',
          version: result.version
        }
      })
    } catch {
      setCliStatus({ available: false })
      dispatch({
        type: 'SET_CLI_STATUS',
        payload: { status: 'disconnected' }
      })
    }
  }, [dispatch, state.cli.activeBackend])

  // --- Cancel request ---

  const cancelRequest = useCallback(async (): Promise<void> => {
    await window.electronAPI.cancelCli(state.cli.activeBackend)
  }, [state.cli.activeBackend])

  // --- Switch backend ---

  const switchBackend = useCallback(async (id: string): Promise<void> => {
    dispatch({ type: 'SET_ACTIVE_BACKEND', payload: id })
    dispatch({ type: 'UPDATE_SETTINGS', payload: { selectedBackend: id } })
    // Check status of the new backend
    try {
      const result = await window.electronAPI.checkCliStatus(id)
      setCliStatus(result)
      dispatch({
        type: 'SET_CLI_STATUS',
        payload: {
          status: result.available ? 'connected' : 'disconnected',
          version: result.version
        }
      })
    } catch {
      setCliStatus({ available: false })
      dispatch({ type: 'SET_CLI_STATUS', payload: { status: 'disconnected' } })
    }
  }, [dispatch])

  // --- Core execution flow ---

  const executeFlow = useCallback(
    async (
      type: RequestType,
      instruction: string,
      prompt: string,
      code?: string
    ): Promise<void> => {
      dispatch({ type: 'SET_CLI_LOADING', payload: { isLoading: true, requestType: type } })
      dispatch({ type: 'CLEAR_STREAMING_TEXT' })
      setShowDiff(type === 'optimize' || type === 'fixBug')

      // Store request metadata for history saving (will be picked up by the effect)
      lastRequestRef.current = { type, instruction, code }

      // Use workspace root as CLI working directory
      const cwd = state.workspace.rootPath || '.'

      try {
        await window.electronAPI.executeCli(prompt, cwd, state.cli.activeBackend)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        dispatch({
          type: 'SET_CLI_RESULT',
          payload: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type,
            success: false,
            content: '',
            errorExplanation: message,
            timestamp: Date.now()
          }
        })
        dispatch({ type: 'SET_CLI_LOADING', payload: { isLoading: false, requestType: null } })
      }
    },
    [dispatch, state.workspace.rootPath, state.cli.activeBackend]
  )

  // --- 10.1: Code Generation Flow ---
  const generate = useCallback(
    async (description: string): Promise<void> => {
      const language = getCurrentLanguage()
      const fileContent = getActiveFileContent()
      const prompt = buildPrompt('generate', { description, language, fileContent })
      await executeFlow('generate', description, prompt)
    },
    [executeFlow, getCurrentLanguage, getActiveFileContent]
  )

  // --- 10.2: Code Optimization Flow ---
  const optimize = useCallback(async (): Promise<void> => {
    const code = getSelectedCode()
    if (!code) return
    const language = getCurrentLanguage()
    const prompt = buildPrompt('optimize', { code, language })
    await executeFlow('optimize', '优化选中代码', prompt, code)
  }, [executeFlow, getSelectedCode, getCurrentLanguage])

  // --- 10.3: Bug Fix Flow ---
  const fixBug = useCallback(async (): Promise<void> => {
    const code = getSelectedCode()
    if (!code) return
    const language = getCurrentLanguage()
    const prompt = buildPrompt('fixBug', { code, language })
    await executeFlow('fixBug', '修复选中代码', prompt, code)
  }, [executeFlow, getSelectedCode, getCurrentLanguage])

  // --- 10.4: Code Explanation Flow ---
  const explain = useCallback(async (): Promise<void> => {
    const code = getSelectedCode()
    if (!code) return
    const language = getCurrentLanguage()
    const prompt = buildPrompt('explain', { code, language })
    await executeFlow('explain', '解释选中代码', prompt, code)
  }, [executeFlow, getSelectedCode, getCurrentLanguage])

  // --- 10.5: Syntax Check Flow ---
  const checkSyntax = useCallback(
    async (errorMarkers: ErrorMarker[]): Promise<void> => {
      const code = getActiveFileContent()
      const language = getCurrentLanguage()
      const markers = errorMarkers
        .map((m) => `Line ${m.line}:${m.column} [${m.severity}] ${m.message}`)
        .join('\n')
      const prompt = buildPrompt('syntax', { code, language, markers })
      await executeFlow('syntax', '语法纠错', prompt, code)
    },
    [executeFlow, getActiveFileContent, getCurrentLanguage]
  )

  // --- 10.6: Custom Request Flow ---
  const customRequest = useCallback(
    async (instruction: string): Promise<void> => {
      const code = getSelectedCode() || undefined
      const language = getCurrentLanguage()
      const { activeFilePath } = state.editor

      // Build context-aware prompt: include active file info
      let contextPrefix = ''
      if (activeFilePath) {
        contextPrefix = `[当前文件: ${activeFilePath}]\n`
      }

      const prompt = contextPrefix + buildPrompt('custom', { instruction, code, language })
      await executeFlow('custom', instruction, prompt, code)
    },
    [executeFlow, getSelectedCode, getCurrentLanguage, state.editor]
  )

  // --- 10.7: Format + Optimize Combo ---
  const formatAndOptimize = useCallback(async (): Promise<void> => {
    const code = getActiveFileContent()
    if (!code) return
    const language = getCurrentLanguage()
    const prompt = buildPrompt('optimize', { code, language })
    await executeFlow('optimize', '格式化 + 优化代码', prompt, code)
  }, [executeFlow, getActiveFileContent, getCurrentLanguage])

  // --- History ---
  const searchHistory = useCallback(async (keyword: string): Promise<void> => {
    const records = await window.electronAPI.getHistoryRecords(keyword || undefined)
    setHistoryRecords(records)
  }, [])

  const deleteHistoryRecord = useCallback(async (id: string): Promise<void> => {
    await window.electronAPI.deleteHistoryRecord(id)
    const records = await window.electronAPI.getHistoryRecords()
    setHistoryRecords(records)
  }, [])

  const replayHistory = useCallback(
    async (record: HistoryRecord): Promise<void> => {
      const prompt = buildPrompt(record.type, {
        description: record.instruction,
        code: record.code,
        language: record.language,
        instruction: record.instruction
      })
      await executeFlow(record.type, record.instruction, prompt, record.code)
    },
    [executeFlow]
  )

  // --- Result Actions ---
  const copyResult = useCallback((): void => {
    const content = state.cli.lastResult?.content
    if (content) {
      navigator.clipboard.writeText(content).catch(() => {})
    }
  }, [state.cli.lastResult])

  const insertResult = useCallback((): void => {
    const content = state.cli.lastResult?.content
    if (!content) return
    const { activeFilePath, openFiles } = state.editor
    if (!activeFilePath || !openFiles[activeFilePath]) return
    const currentContent = openFiles[activeFilePath].content
    const { cursorPosition } = state.editor
    const lines = currentContent.split('\n')
    const insertIndex = Math.min(cursorPosition.line - 1, lines.length)
    lines.splice(insertIndex, 0, content)
    dispatch({
      type: 'UPDATE_FILE_CONTENT',
      payload: { path: activeFilePath, content: lines.join('\n') }
    })
  }, [state.cli.lastResult, state.editor, dispatch])

  const replaceResult = useCallback((): void => {
    const content = state.cli.lastResult?.content
    if (!content) return
    const { activeFilePath, openFiles, currentSelection } = state.editor
    if (!activeFilePath || !openFiles[activeFilePath]) return

    if (currentSelection && currentSelection.text) {
      const fileContent = openFiles[activeFilePath].content
      const newContent = fileContent.replace(currentSelection.text, content)
      dispatch({
        type: 'UPDATE_FILE_CONTENT',
        payload: { path: activeFilePath, content: newContent }
      })
    } else {
      dispatch({
        type: 'UPDATE_FILE_CONTENT',
        payload: { path: activeFilePath, content }
      })
    }
  }, [state.cli.lastResult, state.editor, dispatch])

  return {
    generate,
    optimize,
    fixBug,
    explain,
    checkSyntax,
    customRequest,
    formatAndOptimize,
    cliStatus,
    checkCliStatus,
    cancelRequest,
    historyRecords,
    searchHistory,
    deleteHistoryRecord,
    replayHistory,
    copyResult,
    insertResult,
    replaceResult,
    showDiff,
    streamingText,
    isStreaming,
    switchBackend,
    backends
  }
}
