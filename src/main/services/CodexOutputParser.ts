import type { CliStreamEvent } from '../../shared/types'

/**
 * Parses Codex CLI JSONL output (from `codex exec --json`) into unified CliStreamEvents.
 *
 * Codex JSONL event types:
 *   - thread.started  → emits init event
 *   - turn.started    → (ignored)
 *   - item.completed  → emits assistant event with item.text
 *   - turn.completed  → emits result event
 */
export class CodexOutputParser {
  private readonly onEvent: (event: CliStreamEvent) => void
  private lineBuffer = ''
  private resultText = ''

  constructor(onEvent: (event: CliStreamEvent) => void) {
    this.onEvent = onEvent
  }

  /** Feed a raw chunk from stdout. Splits on newlines and parses each JSON line. */
  feed(chunk: string): void {
    this.lineBuffer += chunk
    const lines = this.lineBuffer.split('\n')
    // Keep the last (possibly incomplete) line in the buffer
    this.lineBuffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      this.parseLine(trimmed)
    }
  }

  /** Flush any remaining data in the line buffer. */
  flush(): void {
    const trimmed = this.lineBuffer.trim()
    if (trimmed) {
      this.parseLine(trimmed)
    }
    this.lineBuffer = ''
  }

  private parseLine(line: string): void {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(line)
    } catch {
      // Not valid JSON — treat as plain text output
      this.resultText += line + '\n'
      this.onEvent({ type: 'assistant', data: { text: line + '\n' } })
      return
    }

    const type = event.type as string | undefined

    switch (type) {
      case 'thread.started':
        this.onEvent({ type: 'init', data: { model: 'codex' } })
        break

      case 'item.completed': {
        const item = event.item as Record<string, unknown> | undefined
        const text = (item?.text as string) || ''
        if (text) {
          this.resultText += text
          this.onEvent({ type: 'assistant', data: { text } })
        }
        break
      }

      case 'turn.completed': {
        const usage = event.usage as Record<string, number> | undefined
        this.onEvent({
          type: 'result',
          data: {
            result: this.resultText,
            durationMs: 0,
            totalCostUsd: 0,
            ...(usage ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens } : {})
          }
        })
        break
      }

      // turn.started and other events are silently ignored
    }
  }

  emitInit(): void {
    this.onEvent({ type: 'init', data: { model: 'codex' } })
  }

  emitResult(): void {
    this.onEvent({
      type: 'result',
      data: { result: this.resultText, durationMs: 0, totalCostUsd: 0 }
    })
  }

  emitError(message: string): void {
    this.onEvent({ type: 'error', data: { message } })
  }

  reset(): void {
    this.lineBuffer = ''
    this.resultText = ''
  }
}
