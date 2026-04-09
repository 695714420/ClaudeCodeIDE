// ============================================================
// ClaudeCode IDE — Core Types & Interfaces
// ============================================================

// --- Request Type ---

export type RequestType = 'generate' | 'optimize' | 'fixBug' | 'explain' | 'syntax' | 'custom'

// --- File System ---

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export type FileChangeEvent = {
  eventType: 'create' | 'update' | 'delete'
  path: string
}

// --- API ---

export interface ApiResult {
  id: string
  type: RequestType
  success: boolean
  content: string
  originalCode?: string
  errorExplanation?: string
  timestamp: number
}

export interface GenerateParams {
  description: string
  language: string
  context?: string
}

export interface OptimizeParams {
  code: string
  language: string
}

export interface FixBugParams {
  code: string
  language: string
  errorInfo?: string
}

export interface ExplainParams {
  code: string
  language: string
}

export interface SyntaxCheckParams {
  code: string
  language: string
  errorMarkers: ErrorMarker[]
}

export interface CustomRequestParams {
  instruction: string
  code?: string
  language?: string
}

// --- Editor ---

export interface ErrorMarker {
  line: number
  column: number
  endLine: number
  endColumn: number
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface CursorPosition {
  line: number
  column: number
}

export interface CodeSelection {
  text: string
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

// --- History & Cache ---

export interface HistoryRecord {
  id: string
  type: RequestType
  instruction: string
  code?: string
  language?: string
  result: ApiResult
  createdAt: number
}

export interface CodeSnippet {
  id: string
  code: string
  language: string
  description: string
  source: 'generated' | 'optimized' | 'fixed'
  createdAt: number
}

// --- Settings ---

export interface UserSettings {
  theme: 'light' | 'dark' | string
  fontSize: number // 12-20
  tabSize: number // 2 or 4
  wordWrap: 'on' | 'off'
  autoSave: 'off' | 'afterDelay' | 'onFocusChange'
  encoding: string // default UTF-8
  keybindings: Record<string, string>
  customThemeColors?: ThemeColors
  language: 'en' | 'zh'
  buddyEnabled: boolean
  selectedBackend: string
}

export interface ThemeColors {
  background: string
  foreground: string
  accent: string
  editorBackground: string
  sidebarBackground: string
}

export interface DefaultKeybindings {
  generateCode: string
  optimizeCode: string
  fixBug: string
  explainCode: string
  formatCode: string
  toggleRightPanel: string
  toggleLeftPanel: string
  toggleTerminal: string
}

// --- Backend Adapter ---

/** 后端适配器元信息 */
export interface BackendMeta {
  id: string           // 唯一标识符，如 'claude', 'codex'
  name: string         // 显示名称，如 'Claude Code'
  cliCommand: string   // CLI 命令名，如 'claude', 'codex'
}

/** 后端适配器接口 */
export interface BackendAdapter {
  readonly meta: BackendMeta
  execute(
    options: CliExecuteOptions,
    onEvent: (event: CliStreamEvent) => void
  ): Promise<void>
  cancel(): void
  checkStatus(): Promise<CliStatusResult>
  isRunning(): boolean
}

// --- CLI Integration ---

export interface InitEventData {
  model: string
  sessionId?: string
}

export interface AssistantEventData {
  text: string
  toolUse?: {
    name: string
    input: Record<string, unknown>
  }
}

export interface ResultEventData {
  result: string
  durationMs: number
  totalCostUsd: number
}

export interface ErrorEventData {
  message: string
  exitCode?: number
}

export interface CliStreamEvent {
  type: 'init' | 'assistant' | 'result' | 'error' | 'cancelled'
  data: InitEventData | AssistantEventData | ResultEventData | ErrorEventData | null
}

export interface CliExecuteOptions {
  prompt: string
  cwd: string
}

export interface CliStatusResult {
  available: boolean
  version?: string
}
