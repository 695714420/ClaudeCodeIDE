import { CodexOutputParser } from '../CodexOutputParser'
import type { CliStreamEvent } from '../../../shared/types'

describe('CodexOutputParser', () => {
  let events: CliStreamEvent[]
  let parser: CodexOutputParser

  beforeEach(() => {
    events = []
    parser = new CodexOutputParser((e) => events.push(e))
  })

  describe('JSONL parsing', () => {
    it('should emit init event on thread.started', () => {
      parser.feed('{"type":"thread.started","thread_id":"abc"}\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'init',
        data: { model: 'codex' }
      })
    })

    it('should emit assistant event on item.completed with text', () => {
      parser.feed('{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Hello"}}\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: 'Hello' }
      })
    })

    it('should emit result event on turn.completed', () => {
      parser.feed('{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Hello"}}\n')
      parser.feed('{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":5}}\n')

      expect(events).toHaveLength(2)
      expect(events[1]).toEqual(expect.objectContaining({
        type: 'result',
        data: expect.objectContaining({
          result: 'Hello'
        })
      }))
    })

    it('should handle a full Codex session', () => {
      parser.feed('{"type":"thread.started","thread_id":"abc"}\n')
      parser.feed('{"type":"turn.started"}\n')
      parser.feed('{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Hi there"}}\n')
      parser.feed('{"type":"turn.completed","usage":{"input_tokens":100,"output_tokens":10}}\n')

      expect(events).toHaveLength(3) // init, assistant, result
      expect(events[0].type).toBe('init')
      expect(events[1]).toEqual({ type: 'assistant', data: { text: 'Hi there' } })
      expect(events[2].type).toBe('result')
    })

    it('should handle chunked input across multiple feed calls', () => {
      parser.feed('{"type":"thread.st')
      parser.feed('arted","thread_id":"abc"}\n')

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('init')
    })

    it('should handle multiple JSON lines in a single chunk', () => {
      parser.feed('{"type":"thread.started","thread_id":"abc"}\n{"type":"turn.started"}\n{"type":"item.completed","item":{"text":"OK"}}\n')

      expect(events).toHaveLength(2) // init + assistant (turn.started is ignored)
      expect(events[0].type).toBe('init')
      expect(events[1]).toEqual({ type: 'assistant', data: { text: 'OK' } })
    })

    it('should accumulate text from multiple items', () => {
      parser.feed('{"type":"item.completed","item":{"text":"Part 1 "}}\n')
      parser.feed('{"type":"item.completed","item":{"text":"Part 2"}}\n')
      parser.feed('{"type":"turn.completed","usage":{}}\n')

      expect(events).toHaveLength(3)
      expect(events[2]).toEqual(expect.objectContaining({
        type: 'result',
        data: expect.objectContaining({ result: 'Part 1 Part 2' })
      }))
    })
  })

  describe('flush', () => {
    it('should parse remaining data in the line buffer', () => {
      parser.feed('{"type":"thread.started","thread_id":"abc"}')
      // No newline yet, so nothing parsed
      expect(events).toHaveLength(0)

      parser.flush()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('init')
    })
  })

  describe('emitInit', () => {
    it('should emit init event', () => {
      parser.emitInit()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({ type: 'init', data: { model: 'codex' } })
    })
  })

  describe('emitResult', () => {
    it('should emit result with accumulated text', () => {
      parser.feed('{"type":"item.completed","item":{"text":"Hello"}}\n')
      parser.emitResult()

      expect(events).toHaveLength(2)
      expect(events[1]).toEqual(expect.objectContaining({
        type: 'result',
        data: expect.objectContaining({ result: 'Hello' })
      }))
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
    it('should clear all buffers', () => {
      parser.feed('{"type":"item.completed","item":{"text":"some text"}}\n')
      parser.reset()
      parser.emitResult()

      expect(events).toHaveLength(2)
      expect(events[1]).toEqual(expect.objectContaining({
        type: 'result',
        data: expect.objectContaining({ result: '' })
      }))
    })
  })

  describe('non-JSON fallback', () => {
    it('should treat non-JSON lines as plain text assistant events', () => {
      parser.feed('Some plain text output\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: 'Some plain text output\n' }
      })
    })
  })
})
