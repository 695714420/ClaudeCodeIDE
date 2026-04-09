import React, { useEffect, useState, useCallback, useRef } from 'react'
import './Toast.css'

export type ToastType = 'error' | 'warning' | 'info' | 'success'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastItemProps {
  toast: ToastMessage
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps): JSX.Element {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration ?? 5000
    if (duration <= 0) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  const handleClose = useCallback(() => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }, [toast.id, onDismiss])

  const icon = toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'

  return (
    <div
      className={`toast-item toast-${toast.type}${exiting ? ' toast-exit' : ''}`}
      data-testid={`toast-${toast.id}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Dismiss notification"
        data-testid={`toast-close-${toast.id}`}
      >
        ×
      </button>
    </div>
  )
}

// --- Global toast API ---

type ToastListener = (toasts: ToastMessage[]) => void

let toasts: ToastMessage[] = []
let listeners: ToastListener[] = []
let nextId = 0

function notify(): void {
  listeners.forEach((fn) => fn([...toasts]))
}

export function showToast(type: ToastType, message: string, duration?: number): void {
  const id = `toast-${++nextId}`
  toasts = [...toasts, { id, type, message, duration }]
  notify()
}

function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

/** Reset all toasts (for testing) */
export function _resetToasts(): void {
  toasts = []
  notify()
}

// --- Toast Container Component ---

export function ToastContainer(): JSX.Element {
  const [items, setItems] = useState<ToastMessage[]>([])
  const listenerRef = useRef<ToastListener>()

  useEffect(() => {
    const listener: ToastListener = (newToasts) => setItems(newToasts)
    listenerRef.current = listener
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listenerRef.current)
    }
  }, [])

  if (items.length === 0) return <></>

  return (
    <div className="toast-container" data-testid="toast-container" aria-label="Notifications">
      {items.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  )
}
