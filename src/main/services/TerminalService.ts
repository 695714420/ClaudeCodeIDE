import { spawn, type ChildProcess } from 'child_process'
import * as os from 'os'

const IS_WIN = process.platform === 'win32'

interface TerminalInstance {
  id: string
  process: ChildProcess
  cwd: string
}

/**
 * TerminalService manages shell subprocess instances.
 * Uses child_process.spawn with shell mode to provide terminal-like behavior
 * without requiring native node-pty compilation.
 */
export class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map()
  private nextId = 1

  /**
   * Create a new terminal instance.
   * Returns the terminal ID.
   */
  create(
    cwd: string,
    onData: (id: string, data: string) => void,
    onExit: (id: string, code: number | null) => void
  ): string {
    const id = `term-${this.nextId++}`
    const shellCmd = IS_WIN
      ? process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash'

    const shellArgs = IS_WIN ? [] : ['--login']

    const child = spawn(shellCmd, shellArgs, {
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    })

    child.stdout?.on('data', (data: Buffer) => {
      onData(id, data.toString())
    })

    child.stderr?.on('data', (data: Buffer) => {
      onData(id, data.toString())
    })

    child.on('close', (code) => {
      this.terminals.delete(id)
      onExit(id, code)
    })

    child.on('error', (err) => {
      onData(id, `\r\nError: ${err.message}\r\n`)
      this.terminals.delete(id)
      onExit(id, 1)
    })

    this.terminals.set(id, { id, process: child, cwd })
    return id
  }

  /**
   * Write data (user input) to a terminal.
   */
  write(id: string, data: string): void {
    const terminal = this.terminals.get(id)
    if (terminal?.process.stdin?.writable) {
      terminal.process.stdin.write(data)
    }
  }

  /**
   * Close a terminal instance.
   */
  close(id: string): void {
    const terminal = this.terminals.get(id)
    if (terminal) {
      terminal.process.kill()
      this.terminals.delete(id)
    }
  }

  /**
   * Close all terminal instances.
   */
  closeAll(): void {
    for (const [id, terminal] of this.terminals) {
      terminal.process.kill()
    }
    this.terminals.clear()
  }

  /**
   * Check if a terminal exists.
   */
  has(id: string): boolean {
    return this.terminals.has(id)
  }
}
