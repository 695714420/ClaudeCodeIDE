import { useState, useEffect, useRef, useCallback } from 'react'
import type { FileChangeEvent } from '../../shared/types'

/**
 * Hook that maintains a cached list of all files in the workspace.
 * - Scans all files recursively when rootPath changes
 * - Listens for file change events to incrementally add/remove files
 * - Returns a flat array of absolute file paths
 */
export function useFileListCache(rootPath: string): string[] {
  const [fileList, setFileList] = useState<string[]>([])
  const fileSetRef = useRef<Set<string>>(new Set())

  // Full scan when rootPath changes
  useEffect(() => {
    if (!rootPath || rootPath === '.') {
      setFileList([])
      fileSetRef.current = new Set()
      return
    }

    let cancelled = false

    const scan = async (): Promise<void> => {
      try {
        const files = await window.electronAPI.listAllFiles(rootPath)
        if (cancelled) return
        const fileSet = new Set(files)
        fileSetRef.current = fileSet
        setFileList(files)
      } catch {
        // Scan failed — keep empty list
      }
    }

    scan()

    return () => {
      cancelled = true
    }
  }, [rootPath])

  // Incremental update handler
  const handleFileChange = useCallback((event: unknown) => {
    const change = event as FileChangeEvent
    if (!change || !change.path) return

    const filePath = change.path

    if (change.eventType === 'create') {
      if (!fileSetRef.current.has(filePath)) {
        fileSetRef.current.add(filePath)
        setFileList(Array.from(fileSetRef.current))
      }
    } else if (change.eventType === 'delete') {
      if (fileSetRef.current.has(filePath)) {
        fileSetRef.current.delete(filePath)
        setFileList(Array.from(fileSetRef.current))
      }
    }
    // 'update' events don't change the file list
  }, [])

  // Listen for file change events
  useEffect(() => {
    if (!rootPath || rootPath === '.') return

    window.electronAPI.onFileChange(handleFileChange)

    // Start watching the directory
    window.electronAPI.watchDirectory(rootPath).catch(() => {})
  }, [rootPath, handleFileChange])

  return fileList
}
