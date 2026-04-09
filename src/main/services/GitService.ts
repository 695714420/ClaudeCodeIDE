import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface GitFileStatus {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed'
  staged: boolean
}

/**
 * GitService wraps git CLI commands for basic version control integration.
 * Requires git to be installed and available in PATH.
 */
export class GitService {
  private async git(
    args: string[],
    cwd: string
  ): Promise<string> {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024 // 10MB
    })
    return stdout.trim()
  }

  async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      await this.git(['rev-parse', '--is-inside-work-tree'], dirPath)
      return true
    } catch {
      return false
    }
  }

  async getCurrentBranch(dirPath: string): Promise<string> {
    try {
      return await this.git(['rev-parse', '--abbrev-ref', 'HEAD'], dirPath)
    } catch {
      return ''
    }
  }

  async getStatus(dirPath: string): Promise<GitFileStatus[]> {
    try {
      const output = await this.git(
        ['status', '--porcelain', '-u'],
        dirPath
      )
      if (!output) return []

      return output.split('\n').map((line) => {
        const staged = line[0] !== ' ' && line[0] !== '?'
        const code = staged ? line[0] : line[1]
        const filePath = line.slice(3).trim()

        let status: GitFileStatus['status']
        switch (code) {
          case 'M': status = 'modified'; break
          case 'A': status = 'added'; break
          case 'D': status = 'deleted'; break
          case 'R': status = 'renamed'; break
          case '?': status = 'untracked'; break
          default: status = 'modified'
        }

        return { path: filePath, status, staged }
      })
    } catch {
      return []
    }
  }

  async getDiff(filePath: string, cwd: string): Promise<string> {
    try {
      return await this.git(['diff', '--', filePath], cwd)
    } catch {
      return ''
    }
  }

  async stage(filePaths: string[], cwd: string): Promise<void> {
    await this.git(['add', ...filePaths], cwd)
  }

  async commit(cwd: string, message: string): Promise<void> {
    await this.git(['commit', '-m', message], cwd)
  }

  async push(cwd: string): Promise<void> {
    await this.git(['push'], cwd)
  }

  async pull(cwd: string): Promise<void> {
    await this.git(['pull'], cwd)
  }
}
