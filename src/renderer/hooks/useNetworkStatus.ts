import { useEffect, useCallback } from 'react'
import { useAppDispatch } from '../store/AppContext'

/**
 * Hook that monitors network status via navigator.onLine and
 * online/offline window events, dispatching SET_NETWORK_STATUS
 * to AppContext whenever the status changes.
 */
export function useNetworkStatus(): void {
  const dispatch = useAppDispatch()

  const updateStatus = useCallback(
    (isOnline: boolean) => {
      dispatch({ type: 'SET_NETWORK_STATUS', payload: isOnline })
    },
    [dispatch]
  )

  useEffect(() => {
    // Set initial status
    updateStatus(navigator.onLine)

    const handleOnline = (): void => updateStatus(true)
    const handleOffline = (): void => updateStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateStatus])
}
