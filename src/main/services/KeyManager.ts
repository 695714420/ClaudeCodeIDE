import ElectronStore from 'electron-store'

const STORE_KEY = 'apiKey'
const ENCRYPTION_KEY = 'claudecode-ide-encryption-key-v1'

/**
 * KeyManager — Manages API key storage with encryption.
 *
 * Uses electron-store with encryptionKey for secure local storage.
 * The key is never uploaded to any server (Req 5.2).
 * Only transmitted during verification and API requests via HTTPS (Req 5.6).
 */
export class KeyManager {
  private store: ElectronStore

  constructor(store?: ElectronStore) {
    this.store =
      store ??
      new ElectronStore({
        name: 'claudecode-keys',
        encryptionKey: ENCRYPTION_KEY
      })
  }

  /**
   * Save an API key to encrypted local storage.
   * Req 5.1: Allow input, save, modify, delete.
   */
  async saveKey(key: string): Promise<void> {
    this.store.set(STORE_KEY, key)
  }

  /**
   * Retrieve the stored API key (decrypted).
   * Returns null if no key is stored.
   */
  async getKey(): Promise<string | null> {
    const key = this.store.get(STORE_KEY) as string | undefined
    return key ?? null
  }

  /**
   * Return a masked version of the stored key.
   * Shows last 4 characters, rest as '*' (Req 5.3).
   * Returns null if no key is stored.
   */
  async getMaskedKey(): Promise<string | null> {
    const key = await this.getKey()
    if (key === null) return null
    if (key.length <= 4) return key
    const masked = '*'.repeat(key.length - 4) + key.slice(-4)
    return masked
  }

  /**
   * Delete the stored API key.
   */
  async deleteKey(): Promise<void> {
    this.store.delete(STORE_KEY)
  }

  /**
   * Check whether an API key is currently stored.
   */
  async hasKey(): Promise<boolean> {
    return this.store.has(STORE_KEY)
  }
}
