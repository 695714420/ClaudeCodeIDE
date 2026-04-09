import type { CliStreamEvent } from '../../shared/types'

export class CodexOutputParser {
  private readonly onEvent: (event: CliStreamEvent) => void
  private buffer = ''

  constructor(onEvent: (event: CliStreamEvent) => void) {
    this.onEvent = onEvent
  }

  emitInit(): void {
    this.onEvent({
      type: 'init',
      data: { model: 'codex' }
    })
  }

  feed(chunk: string): void {
    this.buffer += chunk
    this.onEvent({
      type: 'assistant',
      data: { text: chunk }
    })
  }

  emitResult(): void {
    this.onEvent({
      type: 'result',
      data: {
        result: this.buffer,
        durationMs: 0,
        totalCostUsd: 0
      }
    })
  }

  emitError(message: string): void {
    this.onEvent({
      type: 'error',
      data: { message }
    })
  }

  reset(): void {
    this.buffer = ''
  }
}
