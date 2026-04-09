import { spawn, execFile, type ChildProcess } from 'child_process'
import { execSync } from 'child_process'
import type { BackendAdapter, BackendMeta, CliExecuteOptions, CliStreamEvent, CliStatusResult } from '../../shared/types'
import { CLI_TIMEOUT_MS } from '../../shared/constants'
import { StreamJsonParser } from './StreamJsonParser'

const IS_WIN = process.platform === 'win32'

/**
 * Resolve the full path to the CLI executable.
 * On Windows, uses `where` to find it, avoiding shell: true.
 */
function resolveCliPath(command: string): string {
  try {
    const cmd = IS_WIN ? `where ${command}` : `which ${command}`
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim()
    const lines = result.split('\n').map(l => l.trim()).filter(Boolean)
    if (IS_WIN) {
      // Prefer .cmd or .exe over extensionless entry
      const cmdPath = lines.find(l => l.endsWith('.cmd') || l.endsWith('.exe'))
      return cmdPath || lines[0] || command
    }
    return lines[0] || command
  } catch {
    return command // fallback to PATH lookup
  }
}

export class ClaudeBackendAdapter implements BackendAdapter {
  readonly meta: BackendMeta = { id: 'claude', name: 'Claude Code', cliCommand: 'claude' }

  private childProcess: ChildProcess | null = null
  private onEventCallback: ((event: CliStreamEvent) => void) | null = null
  private timeoutTimer: NodeJS.Timeout | null = null

  execute(
    options: CliExecuteOptions,
    onEvent: (event: CliStreamEvent) => void
  ): Promise<void> {
    this.onEventCallback = onEvent

    return new Promise<void>((resolve, reject) => {
      // Use stdin pipe to pass prompt instead of -p argument
      // This avoids all shell escaping issues with special characters
      const args = ['--output-format', 'stream-json', '--verbose']
      const claudePath = resolveCliPath(this.meta.cliCommand)
      const isCmd = IS_WIN && (claudePath.endsWith('.cmd') || claudePath.endsWith('.bat'))
      const child = spawn(claudePath, args, {
        cwd: options.cwd,
        shell: isCmd,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      this.childProcess = child

      // Write prompt to stdin and close it
      if (child.stdin) {
        child.stdin.write(options.prompt)
        child.stdin.end()
      }

      const parser = new StreamJsonParser(onEvent)
      let stderrData = ''

      this.timeoutTimer = setTimeout(() => {
        if (this.childProcess) {
          this.childProcess.kill('SIGTERM')
          onEvent({ type: 'error', data: { message: '请求超时，请重试' } })
        }
      }, CLI_TIMEOUT_MS)

      child.stdout?.on('data', (data: Buffer) => {
        parser.feed(data.toString())
      })

      child.stdout?.on('end', () => {
        parser.flush()
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderrData += data.toString()
      })

      child.on('close', (code: number | null) => {
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer)
          this.timeoutTimer = null
        }
        this.childProcess = null

        if (stderrData.trim().length > 0) {
          onEvent({ type: 'error', data: { message: stderrData.trim() } })
        }

        if (code !== null && code !== 0) {
          onEvent({ type: 'error', data: { message: `Process exited with code ${code}`, exitCode: code } })
        }

        resolve()
      })

      child.on('error', (err: NodeJS.ErrnoException) => {
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer)
          this.timeoutTimer = null
        }
        this.childProcess = null

        if (err.code === 'ENOENT') {
          reject(err)
        } else {
          onEvent({ type: 'error', data: { message: err.message } })
          resolve()
        }
      })
    })
  }

  cancel(): void {
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM')
      if (this.onEventCallback) {
        this.onEventCallback({ type: 'cancelled', data: null })
      }
    }
  }

  checkStatus(): Promise<CliStatusResult> {
    return new Promise((resolve) => {
      const claudePath = resolveCliPath(this.meta.cliCommand)
      const opts: { shell?: boolean } = {}
      if (IS_WIN && (claudePath.endsWith('.cmd') || claudePath.endsWith('.bat'))) {
        opts.shell = true
      }
      execFile(claudePath, ['--version'], opts, (error, stdout) => {
        if (error) {
          resolve({ available: false })
          return
        }
        const version = stdout.trim()
        resolve({ available: true, version })
      })
    })
  }

  isRunning(): boolean {
    return this.childProcess !== null
  }
}
