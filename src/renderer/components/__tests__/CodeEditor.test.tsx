import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { CodeEditor, CodeEditorProps } from '../CodeEditor'

// --- Mock @monaco-editor/react ---

// Store callbacks so tests can trigger them
let mockOnMount: ((editor: any, monaco: any) => void) | null = null
let mockOnChange: ((value: string | undefined) => void) | null = null
let mockOptions: Record<string, any> = {}

const mockDomNode = {
  addEventListener: jest.fn()
}

const mockEditorInstance = {
  onDidChangeCursorPosition: jest.fn(),
  onDidChangeCursorSelection: jest.fn(),
  getModel: jest.fn(),
  getDomNode: jest.fn(() => mockDomNode),
  addAction: jest.fn()
}

jest.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      // Capture props for assertions
      mockOnMount = props.onMount
      mockOnChange = props.onChange
      mockOptions = props.options || {}

      return (
        <div
          data-testid="mock-monaco-editor"
          data-language={props.language}
          data-theme={props.theme}
          data-value={props.value}
        />
      )
    }
  }
})

// --- Helpers ---

function defaultProps(overrides: Partial<CodeEditorProps> = {}): CodeEditorProps {
  return {
    filePath: '/test/file.ts',
    content: 'const x = 1;',
    language: 'typescript',
    theme: 'dark',
    fontSize: 14,
    onChange: jest.fn(),
    onSelectionChange: jest.fn(),
    onCursorChange: jest.fn(),
    ...overrides
  }
}

function renderEditor(overrides: Partial<CodeEditorProps> = {}): CodeEditorProps {
  const props = defaultProps(overrides)
  render(<CodeEditor {...props} />)
  return props
}

// --- Tests ---

describe('CodeEditor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnMount = null
    mockOnChange = null
    mockOptions = {}
    mockEditorInstance.onDidChangeCursorPosition.mockReset()
    mockEditorInstance.onDidChangeCursorSelection.mockReset()
    mockEditorInstance.getModel.mockReset()
    mockEditorInstance.getDomNode.mockReset()
    mockEditorInstance.getDomNode.mockReturnValue(mockDomNode)
    mockDomNode.addEventListener.mockReset()
  })

  describe('Rendering', () => {
    it('should render the code editor container', () => {
      renderEditor()
      expect(screen.getByTestId('code-editor')).toBeInTheDocument()
    })

    it('should render the mock Monaco Editor', () => {
      renderEditor()
      expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument()
    })

    it('should set data-filepath attribute', () => {
      renderEditor({ filePath: '/project/main.py' })
      expect(screen.getByTestId('code-editor')).toHaveAttribute('data-filepath', '/project/main.py')
    })
  })

  describe('Language Support (Req 1.1, 19.2)', () => {
    const languageCases: [string, string, string][] = [
      ['java', 'java', '/test/file.java'],
      ['python', 'python', '/test/file.py'],
      ['javascript', 'javascript', '/test/file.js'],
      ['typescript', 'typescript', '/test/file.ts'],
      ['cpp', 'cpp', '/test/file.cpp'],
      ['c++', 'cpp', '/test/file.cpp'],
      ['go', 'go', '/test/file.go'],
      ['php', 'php', '/test/file.php']
    ]

    it.each(languageCases)(
      'should map language "%s" to Monaco language "%s"',
      (input, expected, filePath) => {
        renderEditor({ language: input, filePath })
        const editor = screen.getByTestId('mock-monaco-editor')
        expect(editor).toHaveAttribute('data-language', expected)
      }
    )

    it('should pass through unknown languages as-is', () => {
      renderEditor({ language: 'rust', filePath: '/test/file.rs' })
      const editor = screen.getByTestId('mock-monaco-editor')
      expect(editor).toHaveAttribute('data-language', 'rust')
    })
  })

  describe('Theme (Req 4.2)', () => {
    it('should use "vs-dark" theme for dark mode', () => {
      renderEditor({ theme: 'dark' })
      const editor = screen.getByTestId('mock-monaco-editor')
      expect(editor).toHaveAttribute('data-theme', 'vs-dark')
    })

    it('should use "vs" theme for light mode', () => {
      renderEditor({ theme: 'light' })
      const editor = screen.getByTestId('mock-monaco-editor')
      expect(editor).toHaveAttribute('data-theme', 'vs')
    })
  })

  describe('Content', () => {
    it('should pass content as value to Monaco Editor', () => {
      renderEditor({ content: 'function hello() {}' })
      const editor = screen.getByTestId('mock-monaco-editor')
      expect(editor).toHaveAttribute('data-value', 'function hello() {}')
    })
  })

  describe('Editor Options (Req 1.2, 1.5)', () => {
    it('should configure fontSize from props', () => {
      renderEditor({ fontSize: 16 })
      expect(mockOptions.fontSize).toBe(16)
    })

    it('should use Consolas, Menlo, monospace font family', () => {
      renderEditor()
      expect(mockOptions.fontFamily).toBe('Consolas, Menlo, monospace')
    })

    it('should enable full auto-indent', () => {
      renderEditor()
      expect(mockOptions.autoIndent).toBe('full')
    })

    it('should enable word wrap', () => {
      renderEditor()
      expect(mockOptions.wordWrap).toBe('on')
    })

    it('should enable bracket pair colorization', () => {
      renderEditor()
      expect(mockOptions.bracketPairColorization).toEqual({ enabled: true })
    })

    it('should enable code folding', () => {
      renderEditor()
      expect(mockOptions.folding).toBe(true)
    })

    it('should enable automatic layout', () => {
      renderEditor()
      expect(mockOptions.automaticLayout).toBe(true)
    })

    it('should enable Find/Replace widget options', () => {
      renderEditor()
      expect(mockOptions.find).toEqual({
        addExtraSpaceOnTop: true,
        autoFindInSelection: 'multiline',
        seedSearchStringFromSelection: 'selection'
      })
    })
  })

  describe('Find/Replace keyboard isolation (REQ-P1-3)', () => {
    function triggerMount(): void {
      expect(mockOnMount).toBeTruthy()
      const mockMonaco = {
        languages: {
          typescript: {
            typescriptDefaults: {
              setCompilerOptions: jest.fn(),
              setDiagnosticsOptions: jest.fn()
            },
            javascriptDefaults: {
              setCompilerOptions: jest.fn(),
              setDiagnosticsOptions: jest.fn()
            },
            ScriptTarget: { ESNext: 99 },
            ModuleKind: { ESNext: 99 },
            ModuleResolutionKind: { NodeJs: 2 },
            JsxEmit: { React: 2 }
          }
        }
      }
      act(() => {
        mockOnMount!(mockEditorInstance, mockMonaco)
      })
    }

    it('should register a keydown listener on the editor DOM node on mount', () => {
      renderEditor()
      triggerMount()
      expect(mockDomNode.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should stopPropagation for Ctrl+F (find) keydown events', () => {
      renderEditor()
      triggerMount()

      const keydownHandler = mockDomNode.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'keydown'
      )?.[1]
      expect(keydownHandler).toBeTruthy()

      const mockEvent = { ctrlKey: true, shiftKey: false, altKey: false, key: 'f', stopPropagation: jest.fn() }
      keydownHandler(mockEvent)
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it('should stopPropagation for Ctrl+H (replace) keydown events', () => {
      renderEditor()
      triggerMount()

      const keydownHandler = mockDomNode.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'keydown'
      )?.[1]

      const mockEvent = { ctrlKey: true, shiftKey: false, altKey: false, key: 'h', stopPropagation: jest.fn() }
      keydownHandler(mockEvent)
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })

    it('should NOT stopPropagation for other Ctrl shortcuts', () => {
      renderEditor()
      triggerMount()

      const keydownHandler = mockDomNode.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'keydown'
      )?.[1]

      const mockEvent = { ctrlKey: true, shiftKey: false, altKey: false, key: 's', stopPropagation: jest.fn() }
      keydownHandler(mockEvent)
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled()
    })

    it('should NOT stopPropagation for Ctrl+Shift+F', () => {
      renderEditor()
      triggerMount()

      const keydownHandler = mockDomNode.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'keydown'
      )?.[1]

      const mockEvent = { ctrlKey: true, shiftKey: true, altKey: false, key: 'f', stopPropagation: jest.fn() }
      keydownHandler(mockEvent)
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled()
    })

    it('should handle getDomNode returning null gracefully', () => {
      mockEditorInstance.getDomNode.mockReturnValue(null)
      renderEditor()
      // Should not throw
      triggerMount()
      // addEventListener should not be called since domNode is null
      expect(mockDomNode.addEventListener).not.toHaveBeenCalled()
    })
  })

  describe('onChange callback', () => {
    it('should call onChange when editor content changes', () => {
      const props = renderEditor()
      expect(mockOnChange).toBeTruthy()

      act(() => {
        mockOnChange!('new content')
      })

      expect(props.onChange).toHaveBeenCalledWith('new content')
    })

    it('should not call onChange when value is undefined', () => {
      const props = renderEditor()

      act(() => {
        mockOnChange!(undefined as any)
      })

      expect(props.onChange).not.toHaveBeenCalled()
    })
  })

  describe('onMount - Cursor and Selection callbacks', () => {
    function triggerMount(): void {
      expect(mockOnMount).toBeTruthy()
      const mockMonaco = {
        languages: {
          typescript: {
            typescriptDefaults: {
              setCompilerOptions: jest.fn(),
              setDiagnosticsOptions: jest.fn()
            },
            javascriptDefaults: {
              setCompilerOptions: jest.fn(),
              setDiagnosticsOptions: jest.fn()
            },
            ScriptTarget: { ESNext: 99 },
            ModuleKind: { ESNext: 99 },
            ModuleResolutionKind: { NodeJs: 2 },
            JsxEmit: { React: 2 }
          }
        }
      }
      act(() => {
        mockOnMount!(mockEditorInstance, mockMonaco)
      })
    }

    it('should register cursor position listener on mount', () => {
      renderEditor()
      triggerMount()
      expect(mockEditorInstance.onDidChangeCursorPosition).toHaveBeenCalledTimes(1)
    })

    it('should register selection listener on mount', () => {
      renderEditor()
      triggerMount()
      expect(mockEditorInstance.onDidChangeCursorSelection).toHaveBeenCalledTimes(1)
    })

    it('should call onCursorChange when cursor position changes', () => {
      const props = renderEditor()
      triggerMount()

      const cursorCallback = mockEditorInstance.onDidChangeCursorPosition.mock.calls[0][0]
      act(() => {
        cursorCallback({ position: { lineNumber: 10, column: 5 } })
      })

      expect(props.onCursorChange).toHaveBeenCalledWith({ line: 10, column: 5 })
    })

    it('should call onSelectionChange when selection changes', () => {
      const mockModel = {
        getValueInRange: jest.fn().mockReturnValue('selected text')
      }
      mockEditorInstance.getModel.mockReturnValue(mockModel)

      const props = renderEditor()
      triggerMount()

      const selectionCallback = mockEditorInstance.onDidChangeCursorSelection.mock.calls[0][0]
      act(() => {
        selectionCallback({
          selection: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 14
          }
        })
      })

      expect(mockModel.getValueInRange).toHaveBeenCalled()
      expect(props.onSelectionChange).toHaveBeenCalledWith({
        text: 'selected text',
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 14
      })
    })

    it('should not call onSelectionChange when model is null', () => {
      mockEditorInstance.getModel.mockReturnValue(null)

      const props = renderEditor()
      triggerMount()

      const selectionCallback = mockEditorInstance.onDidChangeCursorSelection.mock.calls[0][0]
      act(() => {
        selectionCallback({
          selection: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 5
          }
        })
      })

      expect(props.onSelectionChange).not.toHaveBeenCalled()
    })
  })
})
