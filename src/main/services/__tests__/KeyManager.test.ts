import { KeyManager } from '../KeyManager'

/**
 * Mock electron-store as a simple in-memory Map-based store.
 * This avoids filesystem/Electron dependencies in unit tests.
 */
function createMockStore(): any {
  const data = new Map<string, unknown>()
  return {
    get: (key: string) => data.get(key),
    set: (key: string, value: unknown) => data.set(key, value),
    delete: (key: string) => data.delete(key),
    has: (key: string) => data.has(key)
  }
}

describe('KeyManager', () => {
  let keyManager: KeyManager
  let mockStore: ReturnType<typeof createMockStore>

  beforeEach(() => {
    mockStore = createMockStore()
    keyManager = new KeyManager(mockStore)
  })

  describe('saveKey', () => {
    it('should save a key to the store', async () => {
      await keyManager.saveKey('sk-ant-api-key-12345678')
      expect(mockStore.has('apiKey')).toBe(true)
    })

    it('should overwrite an existing key', async () => {
      await keyManager.saveKey('old-key')
      await keyManager.saveKey('new-key')
      const key = await keyManager.getKey()
      expect(key).toBe('new-key')
    })
  })

  describe('getKey', () => {
    it('should return null when no key is stored', async () => {
      const key = await keyManager.getKey()
      expect(key).toBeNull()
    })

    it('should return the stored key', async () => {
      await keyManager.saveKey('my-secret-key')
      const key = await keyManager.getKey()
      expect(key).toBe('my-secret-key')
    })
  })

  describe('getMaskedKey', () => {
    it('should return null when no key is stored', async () => {
      const masked = await keyManager.getMaskedKey()
      expect(masked).toBeNull()
    })

    it('should mask all but last 4 characters', async () => {
      await keyManager.saveKey('sk-ant-api03-abcdefgh')
      const masked = await keyManager.getMaskedKey()
      // 'sk-ant-api03-abcdefgh' has 21 chars → 17 stars + last 4
      expect(masked).toBe('*****************efgh')
    })

    it('should return the key as-is when length <= 4', async () => {
      await keyManager.saveKey('abcd')
      const masked = await keyManager.getMaskedKey()
      expect(masked).toBe('abcd')
    })

    it('should return the key as-is when length < 4', async () => {
      await keyManager.saveKey('ab')
      const masked = await keyManager.getMaskedKey()
      expect(masked).toBe('ab')
    })

    it('should show exactly last 4 chars for a 5-char key', async () => {
      await keyManager.saveKey('12345')
      const masked = await keyManager.getMaskedKey()
      expect(masked).toBe('*2345')
    })

    it('should preserve the total length of the key', async () => {
      const key = 'sk-ant-api03-1234567890abcdef'
      await keyManager.saveKey(key)
      const masked = await keyManager.getMaskedKey()
      expect(masked!.length).toBe(key.length)
    })
  })

  describe('deleteKey', () => {
    it('should remove the stored key', async () => {
      await keyManager.saveKey('to-be-deleted')
      await keyManager.deleteKey()
      const key = await keyManager.getKey()
      expect(key).toBeNull()
    })

    it('should not throw when deleting a non-existent key', async () => {
      await expect(keyManager.deleteKey()).resolves.not.toThrow()
    })
  })

  describe('hasKey', () => {
    it('should return false when no key is stored', async () => {
      const has = await keyManager.hasKey()
      expect(has).toBe(false)
    })

    it('should return true when a key is stored', async () => {
      await keyManager.saveKey('some-key')
      const has = await keyManager.hasKey()
      expect(has).toBe(true)
    })

    it('should return false after key is deleted', async () => {
      await keyManager.saveKey('temp-key')
      await keyManager.deleteKey()
      const has = await keyManager.hasKey()
      expect(has).toBe(false)
    })
  })

  describe('round-trip', () => {
    it('should return the exact same key after save and get', async () => {
      const originalKey = 'sk-ant-api03-very-long-key-with-special-chars!@#$%'
      await keyManager.saveKey(originalKey)
      const retrieved = await keyManager.getKey()
      expect(retrieved).toBe(originalKey)
    })
  })
})
