import { DEFAULT_KEYBINDINGS } from '../../shared/constants'

export type KeybindingAction =
  | 'generateCode'
  | 'optimizeCode'
  | 'fixBug'
  | 'explainCode'
  | 'formatCode'
  | 'toggleRightPanel'
  | 'toggleLeftPanel'
  | 'toggleTerminal'

export type KeybindingHandler = () => void

/**
 * Parses a keybinding string like "Ctrl+Shift+G" into a normalized form.
 */
export function parseKeybinding(binding: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string } {
  const parts = binding.split('+').map((p) => p.trim().toLowerCase())
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts.filter((p) => !['ctrl', 'shift', 'alt'].includes(p))[0] || ''
  }
}

/**
 * Checks if a keyboard event matches a keybinding string.
 */
export function matchesKeybinding(event: KeyboardEvent, binding: string): boolean {
  const parsed = parseKeybinding(binding)
  return (
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt &&
    event.key.toLowerCase() === parsed.key
  )
}

export class KeybindingService {
  private bindings: Record<string, string>
  private handlers: Map<string, KeybindingHandler> = new Map()
  private listener: ((e: KeyboardEvent) => void) | null = null

  constructor(customBindings?: Record<string, string>) {
    this.bindings = { ...DEFAULT_KEYBINDINGS, ...customBindings }
  }

  /** Register a handler for a keybinding action. */
  registerHandler(action: KeybindingAction, handler: KeybindingHandler): void {
    this.handlers.set(action, handler)
  }

  /** Unregister a handler for a keybinding action. */
  unregisterHandler(action: KeybindingAction): void {
    this.handlers.delete(action)
  }

  /** Update a keybinding for a given action. */
  updateBinding(action: KeybindingAction, newBinding: string): void {
    this.bindings[action] = newBinding
  }

  /** Get current bindings. */
  getBindings(): Record<string, string> {
    return { ...this.bindings }
  }

  /** Get the binding for a specific action. */
  getBinding(action: KeybindingAction): string | undefined {
    return this.bindings[action]
  }

  /** Start listening for keyboard events on the given target (default: document). */
  activate(target: EventTarget = document): void {
    this.deactivate()
    this.listener = (event: KeyboardEvent) => {
      for (const [action, binding] of Object.entries(this.bindings)) {
        if (matchesKeybinding(event, binding)) {
          const handler = this.handlers.get(action)
          if (handler) {
            event.preventDefault()
            handler()
          }
          break
        }
      }
    }
    target.addEventListener('keydown', this.listener as EventListener)
  }

  /** Stop listening for keyboard events. */
  deactivate(): void {
    if (this.listener) {
      document.removeEventListener('keydown', this.listener as EventListener)
      this.listener = null
    }
  }

  /** Save custom bindings via IPC. */
  async saveBindings(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveSettings) {
      await (window as any).electronAPI.saveSettings({ keybindings: this.bindings })
    }
  }

  /** Load custom bindings via IPC. */
  async loadBindings(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getSettings) {
      const settings = await (window as any).electronAPI.getSettings()
      if (settings && typeof settings === 'object' && (settings as any).keybindings) {
        this.bindings = { ...DEFAULT_KEYBINDINGS, ...(settings as any).keybindings }
      }
    }
  }
}
