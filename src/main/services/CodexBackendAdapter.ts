import { spawn, execFile, type ChildProcess } from 'child_process'
import { execSync } from 'child_process'
import type { BackendAdapter, BackendMeta, CliExecuteOptions, CliStreamEvent, CliStatusResult } from '../../shared/types'
import { CodexOutputParser } from './CodexOutputParser'

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
      const cmdPath = lines.find(l => l.endsWith('.cmd') || l.endsWith('.exe'))
      return cmdPath || lines[0] || command
    }
    return lines[0] || command
  } catch {
    return command // fallback to PATH lookup
  }
}

export class CodexBackendAdapter implements BackendAdapter {
  readonly meta: BackendMeta = { id: 'codex', name: 'Codex', cliCommand: 'codex' }

  private childProcess: ChildProcess | null = null
  private onEventCallback: ((event: CliStreamEvent) => void) | null = null

  execute(
    options: CliExecuteOptions,
    onEvent: (event: CliStreamEvent) => void
  ): Promise<void> {
    this.onEventCallback = onEvent

    return new Promise<void>((resolve, reject) => {
      // Use `codex exec` subcommand for non-interactive execution.
      // Pass prompt as a CLI argument to avoid "stdin is not a terminal" errors.
      // --json outputs JSONL events on stdout.
      const args = ['exec', '--full-auto', '--skip-git-repo-check', '--json', options.prompt]
      const codexPath = resolveCliPath(this.meta.cliCommand)
      const isCmd = IS_WIN && (codexPath.endsWith('.cmd') || codexPath.endsWith('.bat'))
      const child = spawn(codexPath, args, {
        cwd: options.cwd,
        shell: isCmd,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      this.childProcess = child

      const parser = new CodexOutputParser(onEvent)

      let stderrData = ''

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
        this.childProcess = null

        if (code !== 0) {
          if (stderrData.trim().length > 0) {
            parser.emitError(stderrData.trim())
          }
          if (code !== null) {
            parser.emitError(`Process exited with code ${code}`)
          }
        }

        resolve()
      })

      child.on('error', (err: NodeJS.ErrnoException) => {
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
      const codexPath = resolveCliPath(this.meta.cliCommand)
      const opts: { shell?: boolean } = {}
      if (IS_WIN && (codexPath.endsWith('.cmd') || codexPath.endsWith('.bat'))) {
        opts.shell = true
      }
      execFile(codexPath, ['--version'], opts, (error, stdout) => {
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
