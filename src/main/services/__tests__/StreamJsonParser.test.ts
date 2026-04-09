import { StreamJsonParser } from '../StreamJsonParser'
import type { CliStreamEvent } from '../../../shared/types'

describe('StreamJsonParser', () => {
  let events: CliStreamEvent[]
  let parser: StreamJsonParser

  beforeEach(() => {
    events = []
    parser = new StreamJsonParser((e) => events.push(e))
  })

  // -----------------------------------------------------------------------
  // Event type classification
  // -----------------------------------------------------------------------
  describe('event classification', () => {
    it('should parse init event (system/init)', () => {
      const json = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3', session_id: 'sess-1' })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'init',
        data: { model: 'claude-3', sessionId: 'sess-1' }
      })
    })

    it('should parse init event without session_id', () => {
      const json = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'init',
        data: { model: 'claude-3' }
      })
    })

    it('should parse assistant event with text content', () => {
      const json = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'text', text: 'Hello world' }]
        }
      })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: 'Hello world' }
      })
    })

    it('should concatenate multiple text blocks in assistant event', () => {
      const json = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Part 1 ' },
            { type: 'text', text: 'Part 2' }
          ]
        }
      })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: 'Part 1 Part 2' }
      })
    })

    it('should parse assistant event with tool_use', () => {
      const json = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: '' },
            { type: 'tool_use', name: 'AskUserQuestion', input: { question: 'What?' } }
          ]
        }
      })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: {
          text: '',
          toolUse: { name: 'AskUserQuestion', input: { question: 'What?' } }
        }
      })
    })

    it('should parse result event (success)', () => {
      const json = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'Done!',
        duration_ms: 1500,
        total_cost_usd: 0.05
      })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'result',
        data: { result: 'Done!', durationMs: 1500, totalCostUsd: 0.05 }
      })
    })

    it('should parse result event with error subtype as error event', () => {
      const json = JSON.stringify({
        type: 'result',
        subtype: 'error',
        result: 'Rate limited'
      })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'error',
        data: { message: 'Rate limited' }
      })
    })

    it('should ignore unknown event types', () => {
      const json = JSON.stringify({ type: 'unknown_type', data: {} })
      parser.feed(json + '\n')

      expect(events).toHaveLength(0)
    })

    it('should ignore system events that are not init', () => {
      const json = JSON.stringify({ type: 'system', subtype: 'other', data: {} })
      parser.feed(json + '\n')

      expect(events).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Incomplete JSON / chunked data
  // -----------------------------------------------------------------------
  describe('incomplete JSON handling', () => {
    it('should handle data split across multiple chunks', () => {
      const json = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      const mid = Math.floor(json.length / 2)

      parser.feed(json.slice(0, mid))
      expect(events).toHaveLength(0) // not yet complete

      parser.feed(json.slice(mid) + '\n')
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('init')
    })

    it('should handle data split at arbitrary byte boundaries', () => {
      const json = JSON.stringify({ type: 'result', subtype: 'success', result: 'ok', duration_ms: 100, total_cost_usd: 0.01 })
      // Split into 3 chunks
      const c1 = json.slice(0, 10)
      const c2 = json.slice(10, 30)
      const c3 = json.slice(30) + '\n'

      parser.feed(c1)
      expect(events).toHaveLength(0)
      parser.feed(c2)
      expect(events).toHaveLength(0)
      parser.feed(c3)
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('result')
    })

    it('should flush remaining buffer content', () => {
      const json = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      // Feed without trailing newline
      parser.feed(json)
      expect(events).toHaveLength(0)

      parser.flush()
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('init')
    })
  })

  // -----------------------------------------------------------------------
  // Malformed JSON
  // -----------------------------------------------------------------------
  describe('malformed JSON handling', () => {
    it('should silently ignore invalid JSON lines', () => {
      parser.feed('this is not json\n')
      expect(events).toHaveLength(0)
    })

    it('should silently ignore truncated JSON', () => {
      parser.feed('{"type": "system", "subtype":\n')
      expect(events).toHaveLength(0)
    })

    it('should continue parsing after malformed line', () => {
      const validJson = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      parser.feed('bad json here\n' + validJson + '\n')

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('init')
    })

    it('should ignore non-object JSON values (string)', () => {
      parser.feed('"just a string"\n')
      expect(events).toHaveLength(0)
    })

    it('should ignore non-object JSON values (number)', () => {
      parser.feed('42\n')
      expect(events).toHaveLength(0)
    })

    it('should ignore non-object JSON values (array)', () => {
      parser.feed('[1,2,3]\n')
      expect(events).toHaveLength(0)
    })

    it('should ignore null JSON value', () => {
      parser.feed('null\n')
      expect(events).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Boundary cases
  // -----------------------------------------------------------------------
  describe('boundary cases', () => {
    it('should handle empty input', () => {
      parser.feed('')
      expect(events).toHaveLength(0)
    })

    it('should handle input with only newlines', () => {
      parser.feed('\n\n\n')
      expect(events).toHaveLength(0)
    })

    it('should handle input with only whitespace', () => {
      parser.feed('   \n  \n')
      expect(events).toHaveLength(0)
    })

    it('should parse multiple events in a single chunk', () => {
      const init = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      const assistant = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hi' }] }
      })
      const result = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'Done',
        duration_ms: 500,
        total_cost_usd: 0.02
      })

      parser.feed(init + '\n' + assistant + '\n' + result + '\n')

      expect(events).toHaveLength(3)
      expect(events[0].type).toBe('init')
      expect(events[1].type).toBe('assistant')
      expect(events[2].type).toBe('result')
    })

    it('should handle reset clearing the buffer', () => {
      const json = JSON.stringify({ type: 'system', subtype: 'init', model: 'claude-3' })
      parser.feed(json.slice(0, 10)) // partial
      parser.reset()
      parser.flush()

      expect(events).toHaveLength(0)
    })

    it('should handle assistant event with empty content array', () => {
      const json = JSON.stringify({
        type: 'assistant',
        message: { content: [] }
      })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: '' }
      })
    })

    it('should handle assistant event with no message', () => {
      const json = JSON.stringify({ type: 'assistant' })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'assistant',
        data: { text: '' }
      })
    })

    it('should handle result event with missing optional fields', () => {
      const json = JSON.stringify({ type: 'result', subtype: 'success' })
      parser.feed(json + '\n')

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'result',
        data: { result: '', durationMs: 0, totalCostUsd: 0 }
      })
    })
  })
})
