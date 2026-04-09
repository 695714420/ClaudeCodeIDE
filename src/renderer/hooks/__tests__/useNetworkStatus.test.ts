import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useNetworkStatus } from '../useNetworkStatus'
import { AppProvider, useAppState } from '../../store/AppContext'

// Wrapper that provides AppContext
function wrapper({ children }: { children: React.ReactNode }): JSX.Element {
  return React.createElement(AppProvider, null, children)
}

// Helper hook that exposes network state alongside useNetworkStatus
function useTestHook(): { isOnline: boolean } {
  useNetworkStatus()
  const state = useAppState()
  return { isOnline: state.network.isOnline }
}

describe('useNetworkStatus', () => {
  let originalOnLine: boolean

  beforeEach(() => {
    originalOnLine = navigator.onLine
  })

  afterEach(() => {
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true
    })
  })

  it('sets initial status from navigator.onLine (online)', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    const { result } = renderHook(() => useTestHook(), { wrapper })
    expect(result.current.isOnline).toBe(true)
  })

  it('sets initial status from navigator.onLine (offline)', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const { result } = renderHook(() => useTestHook(), { wrapper })
    expect(result.current.isOnline).toBe(false)
  })

  it('updates to offline when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    const { result } = renderHook(() => useTestHook(), { wrapper })
    expect(result.current.isOnline).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current.isOnline).toBe(false)
  })

  it('updates to online when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const { result } = renderHook(() => useTestHook(), { wrapper })
    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.isOnline).toBe(true)
  })

  it('cleans up event listeners on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener')
    const removeSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useNetworkStatus(), { wrapper })

    // Should have added online and offline listeners
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    unmount()

    // Should have removed online and offline listeners
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
