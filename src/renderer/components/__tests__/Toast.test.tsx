import React from 'react'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ToastContainer, showToast, _resetToasts } from '../Toast'

// Reset toast state between tests by re-importing
beforeEach(() => {
  jest.useFakeTimers()
  _resetToasts()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('ToastContainer', () => {
  it('should render nothing when no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.innerHTML).toBe('')
  })

  it('should display an error toast when showToast is called', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('error', 'File not found')
    })

    expect(screen.getByText('File not found')).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('should display multiple toasts', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('error', 'Error message')
      showToast('warning', 'Warning message')
      showToast('info', 'Info message')
    })

    expect(screen.getByText('Error message')).toBeTruthy()
    expect(screen.getByText('Warning message')).toBeTruthy()
    expect(screen.getByText('Info message')).toBeTruthy()
  })

  it('should auto-dismiss toast after duration', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('error', 'Temporary message', 3000)
    })

    expect(screen.getByText('Temporary message')).toBeTruthy()

    // Advance past the duration
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    // Advance past the exit animation
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Temporary message')).toBeNull()
  })

  it('should dismiss toast when close button is clicked', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('error', 'Closeable message')
    })

    const closeBtn = screen.getByLabelText('Dismiss notification')
    fireEvent.click(closeBtn)

    // Advance past the exit animation
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(screen.queryByText('Closeable message')).toBeNull()
  })

  it('should show correct icon for each toast type', () => {
    render(<ToastContainer />)

    act(() => {
      showToast('error', 'Error toast')
      showToast('success', 'Success toast')
    })

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBe(2)
    expect(alerts[0].textContent).toContain('❌')
    expect(alerts[1].textContent).toContain('✅')
  })
})
