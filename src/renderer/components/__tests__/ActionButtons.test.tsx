import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActionButtons } from '../ActionButtons'
import { AppProvider } from '../../store/AppContext'

const defaultProps = {
  hasSelection: false,
  isLoading: false,
  isOnline: true,
  cliAvailable: true,
  onGenerate: jest.fn(),
  onOptimize: jest.fn(),
  onFixBug: jest.fn(),
  onExplain: jest.fn(),
  onCustomRequest: jest.fn(),
  onCancel: jest.fn()
}

function renderActionButtons(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides }
  ;(props.onGenerate as jest.Mock).mockClear()
  ;(props.onOptimize as jest.Mock).mockClear()
  ;(props.onFixBug as jest.Mock).mockClear()
  ;(props.onExplain as jest.Mock).mockClear()
  ;(props.onCustomRequest as jest.Mock).mockClear()
  ;(props.onCancel as jest.Mock).mockClear()
  return render(<AppProvider><ActionButtons {...props} /></AppProvider>)
}

describe('ActionButtons', () => {
  describe('Rendering', () => {
    it('should render the component container', () => {
      renderActionButtons()
      expect(screen.getByTestId('action-buttons')).toBeInTheDocument()
    })

    it('should render all four action buttons', () => {
      renderActionButtons()
      expect(screen.getByTestId('action-btn-generate')).toBeInTheDocument()
      expect(screen.getByTestId('action-btn-optimize')).toBeInTheDocument()
      expect(screen.getByTestId('action-btn-fixbug')).toBeInTheDocument()
      expect(screen.getByTestId('action-btn-explain')).toBeInTheDocument()
    })

    it('should render custom request input and submit button', () => {
      renderActionButtons()
      expect(screen.getByTestId('action-buttons-custom-input')).toBeInTheDocument()
      expect(screen.getByTestId('action-btn-custom-submit')).toBeInTheDocument()
    })
  })

  describe('Generate button — always enabled when online and not loading (Req 6.1)', () => {
    it('should be enabled when online and not loading', () => {
      renderActionButtons({ isOnline: true, isLoading: false })
      expect(screen.getByTestId('action-btn-generate')).not.toBeDisabled()
    })

    it('should be enabled even without selection', () => {
      renderActionButtons({ hasSelection: false, isOnline: true, isLoading: false })
      expect(screen.getByTestId('action-btn-generate')).not.toBeDisabled()
    })

    it('should call onGenerate when clicked', () => {
      const onGenerate = jest.fn()
      renderActionButtons({ onGenerate })
      fireEvent.click(screen.getByTestId('action-btn-generate'))
      expect(onGenerate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Selection-dependent buttons — require hasSelection (Req 7.1, 8.1, 9.1)', () => {
    it('should disable optimize, fixbug, explain when no selection', () => {
      renderActionButtons({ hasSelection: false, isOnline: true, isLoading: false })
      expect(screen.getByTestId('action-btn-optimize')).toBeDisabled()
      expect(screen.getByTestId('action-btn-fixbug')).toBeDisabled()
      expect(screen.getByTestId('action-btn-explain')).toBeDisabled()
    })

    it('should enable optimize, fixbug, explain when selection exists', () => {
      renderActionButtons({ hasSelection: true, isOnline: true, isLoading: false })
      expect(screen.getByTestId('action-btn-optimize')).not.toBeDisabled()
      expect(screen.getByTestId('action-btn-fixbug')).not.toBeDisabled()
      expect(screen.getByTestId('action-btn-explain')).not.toBeDisabled()
    })

    it('should call onOptimize when clicked', () => {
      const onOptimize = jest.fn()
      renderActionButtons({ hasSelection: true, onOptimize })
      fireEvent.click(screen.getByTestId('action-btn-optimize'))
      expect(onOptimize).toHaveBeenCalledTimes(1)
    })

    it('should call onFixBug when clicked', () => {
      const onFixBug = jest.fn()
      renderActionButtons({ hasSelection: true, onFixBug })
      fireEvent.click(screen.getByTestId('action-btn-fixbug'))
      expect(onFixBug).toHaveBeenCalledTimes(1)
    })

    it('should call onExplain when clicked', () => {
      const onExplain = jest.fn()
      renderActionButtons({ hasSelection: true, onExplain })
      fireEvent.click(screen.getByTestId('action-btn-explain'))
      expect(onExplain).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading state — disables all buttons (Req 12.1)', () => {
    it('should disable all buttons when loading', () => {
      renderActionButtons({ isLoading: true, isOnline: true, hasSelection: true })
      expect(screen.getByTestId('action-btn-generate')).toBeDisabled()
      expect(screen.getByTestId('action-btn-optimize')).toBeDisabled()
      expect(screen.getByTestId('action-btn-fixbug')).toBeDisabled()
      expect(screen.getByTestId('action-btn-explain')).toBeDisabled()
      expect(screen.getByTestId('action-btn-custom-submit')).toBeDisabled()
      expect(screen.getByTestId('action-buttons-custom-input')).toBeDisabled()
    })

    it('should show cancel button when loading', () => {
      renderActionButtons({ isLoading: true })
      expect(screen.getByTestId('action-buttons-loading')).toBeInTheDocument()
      expect(screen.getByTestId('action-btn-cancel')).toBeInTheDocument()
    })

    it('should not show loading indicator when not loading', () => {
      renderActionButtons({ isLoading: false })
      expect(screen.queryByTestId('action-buttons-loading')).not.toBeInTheDocument()
    })
  })

  describe('Offline state — disables all buttons (Req 12.5, 16.3)', () => {
    it('should disable all buttons when offline', () => {
      renderActionButtons({ isOnline: false, hasSelection: true, isLoading: false })
      expect(screen.getByTestId('action-btn-generate')).toBeDisabled()
      expect(screen.getByTestId('action-btn-optimize')).toBeDisabled()
      expect(screen.getByTestId('action-btn-fixbug')).toBeDisabled()
      expect(screen.getByTestId('action-btn-explain')).toBeDisabled()
      expect(screen.getByTestId('action-btn-custom-submit')).toBeDisabled()
      expect(screen.getByTestId('action-buttons-custom-input')).toBeDisabled()
    })

    it('should show offline indicator when offline', () => {
      renderActionButtons({ isOnline: false })
      expect(screen.getByTestId('action-buttons-offline')).toBeInTheDocument()
      expect(screen.getByTestId('action-buttons-offline')).toHaveTextContent('offline')
    })

    it('should not show offline indicator when online', () => {
      renderActionButtons({ isOnline: true })
      expect(screen.queryByTestId('action-buttons-offline')).not.toBeInTheDocument()
    })
  })

  describe('Custom request (Req 11.1)', () => {
    it('should disable submit button when input is empty', () => {
      renderActionButtons({ isOnline: true, isLoading: false })
      expect(screen.getByTestId('action-btn-custom-submit')).toBeDisabled()
    })

    it('should enable submit button when input has text', () => {
      renderActionButtons({ isOnline: true, isLoading: false })
      fireEvent.change(screen.getByTestId('action-buttons-custom-input'), {
        target: { value: '请帮我重构这段代码' }
      })
      expect(screen.getByTestId('action-btn-custom-submit')).not.toBeDisabled()
    })

    it('should call onCustomRequest with trimmed input on submit click', () => {
      const onCustomRequest = jest.fn()
      renderActionButtons({ onCustomRequest })
      fireEvent.change(screen.getByTestId('action-buttons-custom-input'), {
        target: { value: '  重构代码  ' }
      })
      fireEvent.click(screen.getByTestId('action-btn-custom-submit'))
      expect(onCustomRequest).toHaveBeenCalledWith('重构代码')
    })

    it('should clear input after submitting', () => {
      renderActionButtons()
      const input = screen.getByTestId('action-buttons-custom-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: '重构代码' } })
      fireEvent.click(screen.getByTestId('action-btn-custom-submit'))
      expect(input.value).toBe('')
    })

    it('should call onCustomRequest when Enter is pressed', () => {
      const onCustomRequest = jest.fn()
      renderActionButtons({ onCustomRequest })
      const input = screen.getByTestId('action-buttons-custom-input')
      fireEvent.change(input, { target: { value: '解释这段代码' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onCustomRequest).toHaveBeenCalledWith('解释这段代码')
    })

    it('should not call onCustomRequest when input is whitespace only', () => {
      const onCustomRequest = jest.fn()
      renderActionButtons({ onCustomRequest })
      fireEvent.change(screen.getByTestId('action-buttons-custom-input'), {
        target: { value: '   ' }
      })
      fireEvent.click(screen.getByTestId('action-btn-custom-submit'))
      expect(onCustomRequest).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-labels on all buttons', () => {
      renderActionButtons()
      expect(screen.getByTestId('action-btn-generate')).toHaveAttribute('aria-label', 'Generate')
      expect(screen.getByTestId('action-btn-optimize')).toHaveAttribute('aria-label', 'Optimize')
      expect(screen.getByTestId('action-btn-fixbug')).toHaveAttribute('aria-label', 'Fix Bug')
      expect(screen.getByTestId('action-btn-explain')).toHaveAttribute('aria-label', 'Explain')
      expect(screen.getByTestId('action-btn-custom-submit')).toHaveAttribute('aria-label', 'Send')
    })

    it('should have aria-label on custom input', () => {
      renderActionButtons()
      expect(screen.getByTestId('action-buttons-custom-input')).toHaveAttribute(
        'aria-label',
        'Enter custom instruction...'
      )
    })
  })
})
