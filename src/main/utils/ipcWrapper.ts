import type { IpcMainInvokeEvent } from 'electron'

/**
 * Unified IPC result type.
 * All IPC handlers wrapped with wrapHandler return this shape.
 */
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Wraps an IPC handler function with try-catch error handling.
 * Returns a standardized { success, data/error } response.
 */
export function wrapHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (_event: IpcMainInvokeEvent, ...args: any[]) => Promise<IpcResult<T>> {
  return async (_event: IpcMainInvokeEvent, ...args: any[]): Promise<IpcResult<T>> => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[IPC Error]', message)
      return { success: false, error: message }
    }
  }
}
