import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultDisplay } from '../ResultDisplay'
import { AppProvider } from '../../store/AppContext'
import type { ApiResult } from '../../../shared/types'

// --- Helpers ---

const mockCallbacks = () => ({
  onCopy: jest.fn(),
  onInsert: jest.fn(),
  onReplace: jest.fn()
})

function makeResult(overrides: Partial<ApiResult> = {}): ApiResult {
  return {
    id: 'r1',
    type: 'generate',
    success: true,
    content: 'console.log("hello")',
    timestamp: Date.now(),
    ...overrides
  }
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<AppProvider>{ui}</AppProvider>)
}

// --- Tests ---

describe('ResultDisplay', () => {
  describe('Empty state (result=null)', () => {
    it('should render placeholder text when result is null', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={null} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-display-placeholder')).toBeInTheDocument()
      expect(screen.getByTestId('result-display-placeholder')).toHaveTextContent('No results yet')
    })

    it('should not render action buttons when result is null', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={null} showDiff={false} {...cbs} />)
      expect(screen.queryByTestId('result-display-actions')).not.toBeInTheDocument()
    })
  })

  describe('Success result display', () => {
    it('should render result content in a code block', () => {
      const cbs = mockCallbacks()
      const result = makeResult({ content: 'function add(a,b){return a+b}' })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-display-content')).toHaveTextContent(
        'function add(a,b){return a+b}'
      )
    })

    it('should render action buttons (copy, insert, replace)', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={makeResult()} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-action-copy')).toBeInTheDocument()
      expect(screen.getByTestId('result-action-insert')).toBeInTheDocument()
      expect(screen.getByTestId('result-action-replace')).toBeInTheDocument()
    })
  })

  describe('Diff view (showDiff=true with originalCode)', () => {
    it('should show diff view when showDiff=true and originalCode exists', () => {
      const cbs = mockCallbacks()
      const result = makeResult({
        type: 'optimize',
        content: 'const x = 1;',
        originalCode: 'var x = 1;'
      })
      renderWithProvider(<ResultDisplay result={result} showDiff={true} {...cbs} />)
      expect(screen.getByTestId('result-display-diff')).toBeInTheDocument()
      expect(screen.getByTestId('result-display-original-code')).toHaveTextContent('var x = 1;')
      expect(screen.getByTestId('result-display-content')).toHaveTextContent('const x = 1;')
    })

    it('should show "Original code" and "Optimized code" labels for optimize type', () => {
      const cbs = mockCallbacks()
      const result = makeResult({
        type: 'optimize',
        content: 'optimized',
        originalCode: 'original'
      })
      renderWithProvider(<ResultDisplay result={result} showDiff={true} {...cbs} />)
      expect(screen.getByTestId('result-display-diff-original-label')).toHaveTextContent('Original code')
      expect(screen.getByTestId('result-display-diff-new-label')).toHaveTextContent('Optimized code')
    })

    it('should show "Fixed code" label for fixBug type', () => {
      const cbs = mockCallbacks()
      const result = makeResult({
        type: 'fixBug',
        content: 'fixed code',
        originalCode: 'buggy code'
      })
      renderWithProvider(<ResultDisplay result={result} showDiff={true} {...cbs} />)
      expect(screen.getByTestId('result-display-diff-new-label')).toHaveTextContent('Fixed code')
    })

    it('should NOT show diff view when showDiff=true but no originalCode', () => {
      const cbs = mockCallbacks()
      const result = makeResult({ type: 'optimize', content: 'code' })
      renderWithProvider(<ResultDisplay result={result} showDiff={true} {...cbs} />)
      expect(screen.queryByTestId('result-display-diff')).not.toBeInTheDocument()
      expect(screen.getByTestId('result-display-content')).toBeInTheDocument()
    })

    it('should NOT show diff view when showDiff=false even with originalCode', () => {
      const cbs = mockCallbacks()
      const result = makeResult({ content: 'code', originalCode: 'old code' })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.queryByTestId('result-display-diff')).not.toBeInTheDocument()
    })
  })

  describe('Error explanation display', () => {
    it('should show errorExplanation for bug fix results', () => {
      const cbs = mockCallbacks()
      const result = makeResult({
        type: 'fixBug',
        content: 'fixed',
        errorExplanation: 'Undefined variable caused ReferenceError'
      })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-display-error-explanation')).toHaveTextContent(
        'Undefined variable caused ReferenceError'
      )
    })

    it('should not show errorExplanation when not present', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={makeResult()} showDiff={false} {...cbs} />)
      expect(screen.queryByTestId('result-display-error-explanation')).not.toBeInTheDocument()
    })
  })

  describe('Error result (success=false)', () => {
    it('should show error header when result is unsuccessful', () => {
      const cbs = mockCallbacks()
      const result = makeResult({ success: false, content: 'Something went wrong' })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-display-error-header')).toHaveTextContent('Request failed')
    })

    it('should show error content', () => {
      const cbs = mockCallbacks()
      const result = makeResult({ success: false, content: 'API error details' })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-display-content')).toHaveTextContent('API error details')
    })

    it('should show errorExplanation in error state when present', () => {
      const cbs = mockCallbacks()
      const result = makeResult({
        success: false,
        content: 'error',
        errorExplanation: 'Invalid key'
      })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-display-error-explanation')).toHaveTextContent('Invalid key')
    })

    it('should not render action buttons in error state', () => {
      const cbs = mockCallbacks()
      const result = makeResult({ success: false, content: 'error' })
      renderWithProvider(<ResultDisplay result={result} showDiff={false} {...cbs} />)
      expect(screen.queryByTestId('result-display-actions')).not.toBeInTheDocument()
    })
  })

  describe('Action button callbacks', () => {
    it('should call onCopy when copy button is clicked', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={makeResult()} showDiff={false} {...cbs} />)
      fireEvent.click(screen.getByTestId('result-action-copy'))
      expect(cbs.onCopy).toHaveBeenCalledTimes(1)
    })

    it('should call onInsert when insert button is clicked', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={makeResult()} showDiff={false} {...cbs} />)
      fireEvent.click(screen.getByTestId('result-action-insert'))
      expect(cbs.onInsert).toHaveBeenCalledTimes(1)
    })

    it('should call onReplace when replace button is clicked', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={makeResult()} showDiff={false} {...cbs} />)
      fireEvent.click(screen.getByTestId('result-action-replace'))
      expect(cbs.onReplace).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have aria-labels on all action buttons', () => {
      const cbs = mockCallbacks()
      renderWithProvider(<ResultDisplay result={makeResult()} showDiff={false} {...cbs} />)
      expect(screen.getByTestId('result-action-copy')).toHaveAttribute('aria-label', 'Copy')
      expect(screen.getByTestId('result-action-insert')).toHaveAttribute('aria-label', 'Insert to editor')
      expect(screen.getByTestId('result-action-replace')).toHaveAttribute('aria-label', 'Replace')
    })
  })
})
