import type { BackendAdapter, BackendMeta } from '../../shared/types'

export class BackendRegistry {
  private adapters = new Map<string, BackendAdapter>()

  register(adapter: BackendAdapter): void {
    this.adapters.set(adapter.meta.id, adapter)
  }

  get(id: string): BackendAdapter | undefined {
    return this.adapters.get(id)
  }

  list(): BackendMeta[] {
    return Array.from(this.adapters.values()).map((a) => a.meta)
  }

  getDefault(): BackendAdapter {
    return this.adapters.get('claude')!
  }
}
