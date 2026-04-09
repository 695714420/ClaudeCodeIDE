import type {
  CliStreamEvent,
  InitEventData,
  AssistantEventData,
  ResultEventData,
  ErrorEventData
} from '../../shared/types'

export class StreamJsonParser {
  private buffer = ''
  private readonly onEvent: (event: CliStreamEvent) => void

  constructor(onEvent: (event: CliStreamEvent) => void) {
    this.onEvent = onEvent
  }

  feed(chunk: string): void {
    this.buffer += chunk
    const lines = this.buffer.split('\n')
    // Keep the last element — it's either empty (line ended with \n) or an incomplete line
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      this.parseLine(line)
    }
  }

  flush(): void {
    if (this.buffer.length > 0) {
      this.parseLine(this.buffer)
      this.buffer = ''
    }
  }

  reset(): void {
    this.buffer = ''
  }

  private parseLine(line: string): void {
    const trimmed = line.trim()
    if (trimmed.length === 0) return

    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      // Invalid JSON — silently ignore
      return
    }

    if (typeof parsed !== 'object' || parsed === null) return

    const obj = parsed as Record<string, unknown>
    const event = this.classify(obj)
    if (event) {
      this.onEvent(event)
    }
  }

  private classify(obj: Record<string, unknown>): CliStreamEvent | null {
    const type = obj.type

    // init event: {"type":"system","subtype":"init","model":"..."}
    if (type === 'system' && obj.subtype === 'init') {
      const data: InitEventData = {
        model: String(obj.model ?? ''),
        ...(obj.session_id != null ? { sessionId: String(obj.session_id) } : {})
      }
      return { type: 'init', data }
    }

    // assistant event: {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
    if (type === 'assistant') {
      const message = obj.message as Record<string, unknown> | undefined
      const content = message?.content as Array<Record<string, unknown>> | undefined
      const text = (content ?? [])
        .filter((item) => item.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text as string)
        .join('')
      const data: AssistantEventData = { text }

      // Extract tool_use content (e.g. AskUserQuestion)
      const toolUseItem = (content ?? []).find(
        (item) => item.type === 'tool_use' && typeof item.name === 'string'
      )
      if (toolUseItem) {
        data.toolUse = {
          name: String(toolUseItem.name),
          input: (toolUseItem.input as Record<string, unknown>) ?? {}
        }
      }

      return { type: 'assistant', data }
    }

    // result event: {"type":"result","subtype":"success"|"error","result":"...","duration_ms":...,"total_cost_usd":...}
    if (type === 'result') {
      if (obj.subtype === 'error') {
        const data: ErrorEventData = {
          message: String(obj.result ?? '')
        }
        return { type: 'error', data }
      }

      const data: ResultEventData = {
        result: String(obj.result ?? ''),
        durationMs: Number(obj.duration_ms ?? 0),
        totalCostUsd: Number(obj.total_cost_usd ?? 0)
      }
      return { type: 'result', data }
    }

    // Unknown event type — ignore
    return null
  }
}
