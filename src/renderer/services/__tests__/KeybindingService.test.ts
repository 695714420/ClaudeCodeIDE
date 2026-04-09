import {
  KeybindingService,
  parseKeybinding,
  matchesKeybinding
} from '../KeybindingService'
import { DEFAULT_KEYBINDINGS } from '../../../shared/constants'

describe('parseKeybinding', () => {
  it('parses Ctrl+Shift+G', () => {
    const result = parseKeybinding('Ctrl+Shift+G')
    expect(result).toEqual({ ctrl: true, shift: true, alt: false, key: 'g' })
  })

  it('parses Ctrl+B', () => {
    const result = parseKeybinding('Ctrl+B')
    expect(result).toEqual({ ctrl: true, shift: false, alt: false, key: 'b' })
  })

  it('parses Alt+Shift+F', () => {
    const result = parseKeybinding('Alt+Shift+F')
    expect(result).toEqual({ ctrl: false, shift: true, alt: true, key: 'f' })
  })

  it('parses single key', () => {
    const result = parseKeybinding('F5')
    expect(result).toEqual({ ctrl: false, shift: false, alt: false, key: 'f5' })
  })
})

describe('matchesKeybinding', () => {
  function makeKeyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      key: '',
      ...overrides
    } as KeyboardEvent
  }

  it('matches Ctrl+Shift+G', () => {
    const event = makeKeyEvent({ ctrlKey: true, shiftKey: true, key: 'G' })
    expect(matchesKeybinding(event, 'Ctrl+Shift+G')).toBe(true)
  })

  it('does not match when modifier is missing', () => {
    const event = makeKeyEvent({ ctrlKey: true, shiftKey: false, key: 'G' })
    expect(matchesKeybinding(event, 'Ctrl+Shift+G')).toBe(false)
  })

  it('does not match when key is different', () => {
    const event = makeKeyEvent({ ctrlKey: true, shiftKey: true, key: 'H' })
    expect(matchesKeybinding(event, 'Ctrl+Shift+G')).toBe(false)
  })
})

describe('KeybindingService', () => {
  let service: KeybindingService

  beforeEach(() => {
    service = new KeybindingService()
  })

  afterEach(() => {
    service.deactivate()
  })

  it('initializes with default keybindings', () => {
    const bindings = service.getBindings()
    expect(bindings.generateCode).toBe(DEFAULT_KEYBINDINGS.generateCode)
    expect(bindings.optimizeCode).toBe(DEFAULT_KEYBINDINGS.optimizeCode)
    expect(bindings.fixBug).toBe(DEFAULT_KEYBINDINGS.fixBug)
  })

  it('accepts custom bindings that override defaults', () => {
    const custom = new KeybindingService({ generateCode: 'Ctrl+G' })
    expect(custom.getBinding('generateCode')).toBe('Ctrl+G')
    // other defaults remain
    expect(custom.getBinding('optimizeCode')).toBe(DEFAULT_KEYBINDINGS.optimizeCode)
  })

  it('registers and invokes handlers on keydown', () => {
    const handler = jest.fn()
    service.registerHandler('generateCode', handler)
    service.activate()

    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      shiftKey: true,
      key: 'G',
      bubbles: true
    })
    document.dispatchEvent(event)

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not invoke handler for non-matching key', () => {
    const handler = jest.fn()
    service.registerHandler('generateCode', handler)
    service.activate()

    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      shiftKey: true,
      key: 'H',
      bubbles: true
    })
    document.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })

  it('unregisters handlers', () => {
    const handler = jest.fn()
    service.registerHandler('generateCode', handler)
    service.unregisterHandler('generateCode')
    service.activate()

    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      shiftKey: true,
      key: 'G',
      bubbles: true
    })
    document.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })

  it('updateBinding changes the keybinding for an action', () => {
    service.updateBinding('generateCode', 'Ctrl+G')
    expect(service.getBinding('generateCode')).toBe('Ctrl+G')
  })

  it('updated binding triggers handler with new key combo', () => {
    const handler = jest.fn()
    service.registerHandler('generateCode', handler)
    service.updateBinding('generateCode', 'Ctrl+G')
    service.activate()

    // Old combo should not trigger
    document.dispatchEvent(
      new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'G', bubbles: true })
    )
    expect(handler).not.toHaveBeenCalled()

    // New combo should trigger
    document.dispatchEvent(
      new KeyboardEvent('keydown', { ctrlKey: true, key: 'G', bubbles: true })
    )
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('deactivate stops listening', () => {
    const handler = jest.fn()
    service.registerHandler('generateCode', handler)
    service.activate()
    service.deactivate()

    document.dispatchEvent(
      new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'G', bubbles: true })
    )
    expect(handler).not.toHaveBeenCalled()
  })

  it('saveBindings calls electronAPI.saveSettings', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined)
    ;(window as any).electronAPI = { saveSettings: mockSave }

    await service.saveBindings()
    expect(mockSave).toHaveBeenCalledWith({ keybindings: service.getBindings() })

    delete (window as any).electronAPI
  })

  it('loadBindings loads from electronAPI.getSettings', async () => {
    const customBindings = { generateCode: 'Ctrl+Alt+G' }
    ;(window as any).electronAPI = {
      getSettings: jest.fn().mockResolvedValue({ keybindings: customBindings })
    }

    await service.loadBindings()
    expect(service.getBinding('generateCode')).toBe('Ctrl+Alt+G')
    // defaults still present for non-overridden keys
    expect(service.getBinding('optimizeCode')).toBe(DEFAULT_KEYBINDINGS.optimizeCode)

    delete (window as any).electronAPI
  })

  it('loadBindings is no-op when electronAPI is not available', async () => {
    delete (window as any).electronAPI
    const bindingsBefore = service.getBindings()
    await service.loadBindings()
    expect(service.getBindings()).toEqual(bindingsBefore)
  })
})
