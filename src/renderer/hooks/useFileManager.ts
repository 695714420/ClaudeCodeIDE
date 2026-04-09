import { useCallback } from 'react'
import { useAppState, useAppDispatch } from '../store/AppContext'
import { detectLanguage } from '../components/EditorTabs'
import { showToast } from '../components/Toast'
import { t } from '../i18n'
import type { Lang } from '../i18n'

/**
 * Hook that handles file selection from the file explorer.
 * Reads file content via IPC and dispatches OPEN_FILE to the store.
 *
 * Req 2.3
 */
export function useFileManager(): {
  openFile: (filePath: string) => Promise<void>
} {
  const { editor, settings } = useAppState()
  const dispatch = useAppDispatch()
  const lang = (settings.language ?? 'en') as Lang

  const openFile = useCallback(
    async (filePath: string) => {
      // If file is already open, just switch to it
      if (editor.openFiles[filePath]) {
        dispatch({ type: 'SET_ACTIVE_FILE', payload: filePath })
        return
      }

      try {
        const content = await window.electronAPI.readFile(filePath)
        const language = detectLanguage(filePath)

        dispatch({
          type: 'OPEN_FILE',
          payload: {
            path: filePath,
            content,
            language,
            isDirty: false
          }
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        showToast('error', t('fileError.readFailed', lang, msg))
      }
    },
    [editor.openFiles, dispatch, lang]
  )

  return { openFile }
}
