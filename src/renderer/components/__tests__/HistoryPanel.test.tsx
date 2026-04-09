import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPanel } from '../HistoryPanel'
import type { HistoryRecord, ApiResult } from '../../../shared/types'

// --- Helpers ---

function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  const result: ApiResult = {
    id: 'res-1',
    type: 'generate',
    success: true,
    content: 'console.log("hello")',
    timestamp: Date.now()
  }
  return {
    id: 'rec-1',
    type: 'generate',
    instruction: '生成一个 hello world 函数',
    code: 'function hello() {}',
    language: 'javascript',
    result,
    createdAt: 1700000000000,
    ...overrides
  }
}

function makeRecords(): HistoryRecord[] {
  return [
    makeRecord({ id: 'rec-1', type: 'generate', instruction: '生成排序算法', createdAt: 1700000000000 }),
    makeRecord({ id: 'rec-2', type: 'optimize', instruction: '优化循环性能', createdAt: 1700001000000 }),
    makeRecord({ id: 'rec-3', type: 'fixBug', instruction: '修复空指针异常', createdAt: 1700002000000 })
  ]
}

const mockCallbacks = () => ({
  onSearch: jest.fn(),
  onDelete: jest.fn(),
  onReplay: jest.fn()
})

// --- Tests ---

describe('HistoryPanel', () => {
  // ---- Empty state ----
  describe('Empty state', () => {
    it('should render empty state when no records', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={[]} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-panel-empty')).toBeInTheDocument()
      expect(screen.getByText('暂无历史记录')).toBeInTheDocument()
    })

    it('should still render search input when no records', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={[]} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-panel-search-input')).toBeInTheDocument()
    })

    it('should not render the list when no records', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={[]} {...cbs} lang="zh" />)
      expect(screen.queryByTestId('history-panel-list')).not.toBeInTheDocument()
    })
  })

  // ---- Record list rendering (Req 13.1) ----
  describe('Record list rendering', () => {
    it('should render all records in the list', () => {
      const cbs = mockCallbacks()
      const records = makeRecords()
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-panel-list')).toBeInTheDocument()
      expect(screen.getByTestId('history-item-rec-1')).toBeInTheDocument()
      expect(screen.getByTestId('history-item-rec-2')).toBeInTheDocument()
      expect(screen.getByTestId('history-item-rec-3')).toBeInTheDocument()
    })

    it('should display type label for each record', () => {
      const cbs = mockCallbacks()
      const records = makeRecords()
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-item-type-rec-1')).toHaveTextContent('生成')
      expect(screen.getByTestId('history-item-type-rec-2')).toHaveTextContent('优化')
      expect(screen.getByTestId('history-item-type-rec-3')).toHaveTextContent('修复')
    })

    it('should display instruction text for each record', () => {
      const cbs = mockCallbacks()
      const records = makeRecords()
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-item-instruction-rec-1')).toHaveTextContent('生成排序算法')
      expect(screen.getByTestId('history-item-instruction-rec-2')).toHaveTextContent('优化循环性能')
      expect(screen.getByTestId('history-item-instruction-rec-3')).toHaveTextContent('修复空指针异常')
    })

    it('should display timestamp for each record', () => {
      const cbs = mockCallbacks()
      const records = makeRecords()
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      // Each record should have a time element
      expect(screen.getByTestId('history-item-time-rec-1')).toBeInTheDocument()
      expect(screen.getByTestId('history-item-time-rec-2')).toBeInTheDocument()
      expect(screen.getByTestId('history-item-time-rec-3')).toBeInTheDocument()
    })
  })

  // ---- Search (Req 13.2) ----
  describe('Search functionality', () => {
    it('should call onSearch when typing in search input', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      const input = screen.getByTestId('history-panel-search-input')
      fireEvent.change(input, { target: { value: '排序' } })
      expect(cbs.onSearch).toHaveBeenCalledWith('排序')
    })

    it('should call onSearch with empty string when clearing search', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      const input = screen.getByTestId('history-panel-search-input')
      fireEvent.change(input, { target: { value: '排序' } })
      fireEvent.change(input, { target: { value: '' } })
      expect(cbs.onSearch).toHaveBeenLastCalledWith('')
    })

    it('should have correct placeholder text', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={[]} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-panel-search-input')).toHaveAttribute(
        'placeholder',
        '搜索历史记录...'
      )
    })
  })

  // ---- Delete (Req 13.2) ----
  describe('Delete functionality', () => {
    it('should call onDelete with record id when delete button is clicked', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      fireEvent.click(screen.getByTestId('history-action-delete-rec-2'))
      expect(cbs.onDelete).toHaveBeenCalledWith('rec-2')
    })
  })

  // ---- Replay (Req 13.3) ----
  describe('Replay functionality', () => {
    it('should call onReplay with the record when replay button is clicked', () => {
      const cbs = mockCallbacks()
      const records = makeRecords()
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      fireEvent.click(screen.getByTestId('history-action-replay-rec-1'))
      expect(cbs.onReplay).toHaveBeenCalledWith(records[0])
    })
  })

  // ---- Click to expand details (Req 13.3) ----
  describe('Expand/collapse details', () => {
    it('should show detail view when clicking a record summary', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      // Initially no detail visible
      expect(screen.queryByTestId('history-item-detail-rec-1')).not.toBeInTheDocument()
      // Click to expand
      fireEvent.click(screen.getByTestId('history-item-summary-rec-1'))
      expect(screen.getByTestId('history-item-detail-rec-1')).toBeInTheDocument()
    })

    it('should show instruction and result in detail view', () => {
      const cbs = mockCallbacks()
      const records = makeRecords()
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      fireEvent.click(screen.getByTestId('history-item-summary-rec-1'))
      expect(screen.getByTestId('history-detail-instruction-rec-1')).toHaveTextContent('生成排序算法')
      expect(screen.getByTestId('history-detail-result-rec-1')).toBeInTheDocument()
    })

    it('should collapse detail when clicking the same record again', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      const summary = screen.getByTestId('history-item-summary-rec-1')
      fireEvent.click(summary)
      expect(screen.getByTestId('history-item-detail-rec-1')).toBeInTheDocument()
      fireEvent.click(summary)
      expect(screen.queryByTestId('history-item-detail-rec-1')).not.toBeInTheDocument()
    })

    it('should collapse previous detail when expanding a different record', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      fireEvent.click(screen.getByTestId('history-item-summary-rec-1'))
      expect(screen.getByTestId('history-item-detail-rec-1')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('history-item-summary-rec-2'))
      expect(screen.queryByTestId('history-item-detail-rec-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('history-item-detail-rec-2')).toBeInTheDocument()
    })

    it('should show code in detail when record has code', () => {
      const cbs = mockCallbacks()
      const records = [makeRecord({ id: 'rec-code', code: 'const x = 1;' })]
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      fireEvent.click(screen.getByTestId('history-item-summary-rec-code'))
      expect(screen.getByTestId('history-detail-code-rec-code')).toHaveTextContent('const x = 1;')
    })

    it('should not show code section when record has no code', () => {
      const cbs = mockCallbacks()
      const records = [makeRecord({ id: 'rec-nocode', code: undefined })]
      render(<HistoryPanel records={records} {...cbs} lang="zh" />)
      fireEvent.click(screen.getByTestId('history-item-summary-rec-nocode'))
      expect(screen.queryByTestId('history-detail-code-rec-nocode')).not.toBeInTheDocument()
    })
  })

  // ---- Accessibility ----
  describe('Accessibility', () => {
    it('should have aria-label on search input', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={[]} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-panel-search-input')).toHaveAttribute(
        'aria-label',
        '搜索历史记录...'
      )
    })

    it('should have aria-labels on action buttons', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-action-replay-rec-1')).toHaveAttribute('aria-label')
      expect(screen.getByTestId('history-action-delete-rec-1')).toHaveAttribute('aria-label')
    })

    it('should have role=button and aria-expanded on summary rows', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      const summary = screen.getByTestId('history-item-summary-rec-1')
      expect(summary).toHaveAttribute('role', 'button')
      expect(summary).toHaveAttribute('aria-expanded', 'false')
      fireEvent.click(summary)
      expect(summary).toHaveAttribute('aria-expanded', 'true')
    })

    it('should support keyboard activation on summary rows', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      const summary = screen.getByTestId('history-item-summary-rec-1')
      fireEvent.keyDown(summary, { key: 'Enter' })
      expect(screen.getByTestId('history-item-detail-rec-1')).toBeInTheDocument()
    })

    it('should have list role on the record list', () => {
      const cbs = mockCallbacks()
      render(<HistoryPanel records={makeRecords()} {...cbs} lang="zh" />)
      expect(screen.getByTestId('history-panel-list')).toHaveAttribute('role', 'list')
    })
  })
})
