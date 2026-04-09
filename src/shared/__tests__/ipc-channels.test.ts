import { IPC_CHANNELS } from '../constants'

describe('IPC_CHANNELS', () => {
  it('should define all file system channels', () => {
    expect(IPC_CHANNELS.FILE_READ_DIRECTORY).toBe('file:readDirectory')
    expect(IPC_CHANNELS.FILE_CREATE).toBe('file:create')
    expect(IPC_CHANNELS.FILE_CREATE_DIRECTORY).toBe('file:createDirectory')
    expect(IPC_CHANNELS.FILE_READ).toBe('file:read')
    expect(IPC_CHANNELS.FILE_WRITE).toBe('file:write')
    expect(IPC_CHANNELS.FILE_DELETE).toBe('file:delete')
    expect(IPC_CHANNELS.FILE_RENAME).toBe('file:rename')
    expect(IPC_CHANNELS.FILE_WATCH).toBe('file:watch')
    expect(IPC_CHANNELS.FILE_CHANGE_EVENT).toBe('file:changeEvent')
  })

  it('should define all CLI channels', () => {
    expect(IPC_CHANNELS.CLI_EXECUTE).toBe('cli:execute')
    expect(IPC_CHANNELS.CLI_STREAM_EVENT).toBe('cli:stream-event')
    expect(IPC_CHANNELS.CLI_CANCEL).toBe('cli:cancel')
    expect(IPC_CHANNELS.CLI_CHECK_STATUS).toBe('cli:check-status')
  })

  it('should define all backend channels', () => {
    expect(IPC_CHANNELS.BACKEND_LIST).toBe('backend:list')
    expect(IPC_CHANNELS.BACKEND_CHECK_STATUS).toBe('backend:check-status')
  })

  it('should define all cache management channels', () => {
    expect(IPC_CHANNELS.CACHE_SAVE_HISTORY).toBe('cache:saveHistory')
    expect(IPC_CHANNELS.CACHE_GET_HISTORY).toBe('cache:getHistory')
    expect(IPC_CHANNELS.CACHE_DELETE_HISTORY).toBe('cache:deleteHistory')
    expect(IPC_CHANNELS.CACHE_CLEAR_HISTORY).toBe('cache:clearHistory')
    expect(IPC_CHANNELS.CACHE_SAVE_SNIPPET).toBe('cache:saveSnippet')
    expect(IPC_CHANNELS.CACHE_GET_SNIPPETS).toBe('cache:getSnippets')
  })

  it('should define all settings channels', () => {
    expect(IPC_CHANNELS.SETTINGS_GET).toBe('settings:get')
    expect(IPC_CHANNELS.SETTINGS_SAVE).toBe('settings:save')
  })

  it('should have unique channel names (no duplicates)', () => {
    const values = Object.values(IPC_CHANNELS)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })

  it('should use namespace:action format for all channels', () => {
    const values = Object.values(IPC_CHANNELS)
    for (const channel of values) {
      expect(channel).toMatch(/^[a-z-]+:[a-zA-Z-]+$/)
    }
  })
})
