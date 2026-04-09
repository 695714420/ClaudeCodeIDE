import { CodexOutputParser } from '../CodexOutputParser'
import type { CliStreamEvent } from '../../../shared/types'

describe('CodexOutputParser', () => {
  let events: CliStreamEvent[]
  let parser: CodexOutputParser

  beforeEach(() => {
    events = []
    parser = new CodexOutputParser((e) => events.push(e))
  })

  describe('emitInit', () => {
    it('should emit init event with model codex', () => {
      parser.emitInit()

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'init',
        data: { model: 'codex' }
      })
    })
  })

  describe('feed', () => {
    it('should emit assistant event with the chunk text', () => {
      parser.feed('Hello world')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: 'Hello world' }
      })
    })

    it('should accumulate text in the buffer across multiple feeds', () => {
      parser.feed('Part 1 ')
      parser.feed('Part 2')

      expect(events).toHaveLength(2)
      expect(events[0]).toEqual({ type: 'assistant', data: { text: 'Part 1 ' } })
      expect(events[1]).toEqual({ type: 'assistant', data: { text: 'Part 2' } })
    })
  })

  describe('emitResult', () => {
    it('should emit result event with accumulated buffer', () => {
      parser.feed('Hello ')
      parser.feed('world')
      parser.emitResult()

      expect(events).toHaveLength(3)
      expect(events[2]).toEqual({
        type: 'result',
        data: {
          result: 'Hello world',
          durationMs: 0,
          totalCostUsd: 0
        }
      })
    })

    it('should emit result with empty buffer when no feed called', () => {
      parser.emitResult()

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'result',
        data: {
          result: '',
          durationMs: 0,
          totalCostUsd: 0
        }
      })
    })
  })

  describe('emitError', () => {
    it('should emit error event with the given message', () => {
      parser.emitError('Something went wrong')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'error',
        data: { message: 'Something went wrong' }
      })
    })
  })

  describe('reset', () => {
    it('should clear the buffer', () => {
      parser.feed('some text')
      parser.reset()
      parser.emitResult()

      // 2 events: assistant from feed + result from emitResult
      expect(events).toHaveLength(2)
      expect(events[1]).toEqual({
        type: 'result',
        data: {
          result: '',
          durationMs: 0,
          totalCostUsd: 0
        }
      })
    })
  })
})
