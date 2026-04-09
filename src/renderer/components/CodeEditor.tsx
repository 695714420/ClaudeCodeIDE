import React, { useCallback, useRef } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import type { CursorPosition, CodeSelection } from '../../shared/types'
import { detectLanguage } from '../utils/languageMap'
import './CodeEditor.css'

export interface CodeEditorProps {
  filePath: string
  content: string
  language: string
  theme: 'light' | 'dark'
  fontSize: number
  tabSize?: number
  wordWrap?: 'on' | 'off'
  onChange: (content: string) => void
  onSelectionChange: (selection: CodeSelection) => void
  onCursorChange: (position: CursorPosition) => void
  onSendToChat?: (text: string) => void
}

/**
 * Resolve language: use the new comprehensive language map if a file path is available,
 * otherwise fall back to the provided language string.
 */
function resolveLanguage(language: string, filePath?: string): string {
  if (filePath) {
    const detected = detectLanguage(filePath)
    if (detected !== 'plaintext') return detected
  }
  return language.toLowerCase()
}

/**
 * Maps theme prop to Monaco Editor theme name.
 */
function resolveTheme(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'vs-dark' : 'vs'
}

/**
 * CodeEditor wraps Monaco Editor with syntax highlighting for
 * Java, Python, JavaScript, TypeScript, C++, Go, PHP.
 *
 * Features: auto-indent, word wrap, bracket pair colorization, code folding.
 * Dispatches cursor position and selection changes via callbacks.
 *
 * Req 1.1, 1.2, 1.3, 1.5, 4.2, 19.2
 */
export function CodeEditor({
  filePath,
  content,
  language,
  theme,
  fontSize,
  tabSize = 2,
  wordWrap = 'on',
  onChange,
  onSelectionChange,
  onCursorChange,
  onSendToChat
}: CodeEditorProps): JSX.Element {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount: OnMount = useCallback(
    (editorInstance, monaco) => {
      editorRef.current = editorInstance

      // Prevent global keyboard handlers from intercepting Monaco's built-in
      // shortcuts (Ctrl+F find, Ctrl+H replace, etc.) when the editor has focus.
      const editorDomNode = editorInstance.getDomNode()
      if (editorDomNode) {
        editorDomNode.addEventListener('keydown', (e: KeyboardEvent) => {
          // Stop propagation for Ctrl+F (find) and Ctrl+H (replace) so they
          // are handled exclusively by Monaco's own find widget.
          if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'f' || e.key === 'h')) {
            e.stopPropagation()
          }
        })
      }

      // Configure TypeScript/JavaScript defaults for better IntelliSense,
      // Go to Definition (F12), and Find References (Shift+F12)
      const tsCompilerOptions = {
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions(tsCompilerOptions)
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })

      // Apply the same configuration to JavaScript defaults so Go to Definition
      // and Find References also work in .js/.jsx files
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions(tsCompilerOptions)
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
      })

      // Listen for cursor position changes
      editorInstance.onDidChangeCursorPosition((e) => {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column
        })
      })

      // Listen for selection changes
      editorInstance.onDidChangeCursorSelection((e) => {
        const model = editorInstance.getModel()
        if (!model) return

        const sel = e.selection
        const text = model.getValueInRange(sel)

        onSelectionChange({
          text,
          startLine: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLine: sel.endLineNumber,
          endColumn: sel.endColumn
        })
      })

      // Add "Send to Chat" context menu action
      editorInstance.addAction({
        id: 'send-to-chat',
        label: 'Send to Chat',
        contextMenuGroupId: '9_cutcopypaste',
        contextMenuOrder: 99,
        run: (ed) => {
          const selection = ed.getSelection()
          const model = ed.getModel()
          if (selection && model && onSendToChat) {
            const text = model.getValueInRange(selection)
            if (text) {
              onSendToChat(text)
            }
          }
        }
      })
    },
    [onCursorChange, onSelectionChange, onSendToChat]
  )

  const handleChange: OnChange = useCallback(
    (value) => {
      if (value !== undefined) {
        onChange(value)
      }
    },
    [onChange]
  )

  return (
    <div className="code-editor" data-testid="code-editor" data-filepath={filePath}>
      <Editor
        height="100%"
        language={resolveLanguage(language, filePath)}
        theme={resolveTheme(theme)}
        value={content}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          fontFamily: 'Consolas, Menlo, monospace',
          autoIndent: 'full',
          wordWrap,
          bracketPairColorization: { enabled: true },
          folding: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize,
          renderWhitespace: 'selection',
          // Explicitly enable Find/Replace widget (Ctrl+F / Ctrl+H)
          find: {
            addExtraSpaceOnTop: true,
            autoFindInSelection: 'multiline',
            seedSearchStringFromSelection: 'selection'
          },
          // Ensure Go to Definition (F12) and Find References (Shift+F12) work
          gotoLocation: {
            multiple: 'peek',
            multipleDefinitions: 'peek',
            multipleTypeDefinitions: 'peek',
            multipleDeclarations: 'peek',
            multipleImplementations: 'peek',
            multipleReferences: 'peek'
          }
        }}
      />
    </div>
  )
}
