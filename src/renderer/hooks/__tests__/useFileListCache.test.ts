import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileListCache } from '../useFileListCache'

// Track the onFileChange callback so we can simulate events
let fileChangeCallback: ((event: unknown) => void) | null = null

// Mock electronAPI
const mockListAllFiles = jest.fn()
const mockOnFileChange = jest.fn((cb: (event: unknown) => void) => {
  fileChangeCallback = cb
})
const mockWatchDirectory = jest.fn().mockResolvedValue(undefined)

beforeEach(() => {
  fileChangeCallback = null
  mockListAllFiles.mockReset()
  mockOnFileChange.mockClear()
  mockWatchDirectory.mockClear()

  ;(window as unknown as Record<string, unknown>).electronAPI = {
    listAllFiles: mockListAllFiles,
    onFileChange: mockOnFileChange,
    watchDirectory: mockWatchDirectory
  }
})

describe('useFileListCache', () => {
  it('returns empty array when rootPath is "."', () => {
    const { result } = renderHook(() => useFileListCache('.'))
    expect(result.current).toEqual([])
    expect(mockListAllFiles).not.toHaveBeenCalled()
  })

  it('scans files when rootPath is set', async () => {
    const files = ['/workspace/a.ts', '/workspace/b.ts']
    mockListAllFiles.mockResolvedValue(files)

    const { result } = renderHook(() => useFileListCache('/workspace'))

    await waitFor(() => {
      expect(result.current).toEqual(files)
    })
    expect(mockListAllFiles).toHaveBeenCalledWith('/workspace')
  })

  it('starts watching the directory', async () => {
    mockListAllFiles.mockResolvedValue([])

    renderHook(() => useFileListCache('/workspace'))

    await waitFor(() => {
      expect(mockWatchDirectory).toHaveBeenCalledWith('/workspace')
    })
  })

  it('adds a file on create event', async () => {
    mockListAllFiles.mockResolvedValue(['/workspace/a.ts'])

    const { result } = renderHook(() => useFileListCache('/workspace'))

    await waitFor(() => {
      expect(result.current).toEqual(['/workspace/a.ts'])
    })

    // Simulate file creation
    act(() => {
      fileChangeCallback?.({ eventType: 'create', path: '/workspace/new.ts' })
    })

    expect(result.current).toContain('/workspace/new.ts')
    expect(result.current).toHaveLength(2)
  })

  it('removes a file on delete event', async () => {
    mockListAllFiles.mockResolvedValue(['/workspace/a.ts', '/workspace/b.ts'])

    const { result } = renderHook(() => useFileListCache('/workspace'))

    await waitFor(() => {
      expect(result.current).toHaveLength(2)
    })

    // Simulate file deletion
    act(() => {
      fileChangeCallback?.({ eventType: 'delete', path: '/workspace/a.ts' })
    })

    expect(result.current).toEqual(['/workspace/b.ts'])
  })

  it('ignores update events (no list change)', async () => {
    mockListAllFiles.mockResolvedValue(['/workspace/a.ts'])

    const { result } = renderHook(() => useFileListCache('/workspace'))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    act(() => {
      fileChangeCallback?.({ eventType: 'update', path: '/workspace/a.ts' })
    })

    expect(result.current).toEqual(['/workspace/a.ts'])
  })

  it('does not add duplicate files on create', async () => {
    mockListAllFiles.mockResolvedValue(['/workspace/a.ts'])

    const { result } = renderHook(() => useFileListCache('/workspace'))

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
    })

    act(() => {
      fileChangeCallback?.({ eventType: 'create', path: '/workspace/a.ts' })
    })

    expect(result.current).toHaveLength(1)
  })

  it('rescans when rootPath changes', async () => {
    mockListAllFiles
      .mockResolvedValueOnce(['/old/a.ts'])
      .mockResolvedValueOnce(['/new/b.ts'])

    const { result, rerender } = renderHook(
      ({ path }) => useFileListCache(path),
      { initialProps: { path: '/old' } }
    )

    await waitFor(() => {
      expect(result.current).toEqual(['/old/a.ts'])
    })

    rerender({ path: '/new' })

    await waitFor(() => {
      expect(result.current).toEqual(['/new/b.ts'])
    })
  })
})
