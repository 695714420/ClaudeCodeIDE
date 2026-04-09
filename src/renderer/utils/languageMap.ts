/**
 * Complete file extension to Monaco Editor language ID mapping.
 */
const EXTENSION_MAP: Record<string, string> = {
  // JavaScript / TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',

  // Web
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'scss',
  '.less': 'less',
  '.vue': 'html',
  '.svelte': 'html',

  // Data / Config
  '.json': 'json',
  '.jsonc': 'json',
  '.json5': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',
  '.ini': 'ini',
  '.env': 'ini',
  '.xml': 'xml',
  '.svg': 'xml',
  '.graphql': 'graphql',
  '.gql': 'graphql',

  // Programming Languages
  '.py': 'python',
  '.pyw': 'python',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.scala': 'scala',
  '.r': 'r',
  '.R': 'r',
  '.lua': 'lua',
  '.pl': 'perl',
  '.pm': 'perl',
  '.dart': 'dart',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.clj': 'clojure',
  '.erl': 'erlang',
  '.hrl': 'erlang',
  '.hs': 'haskell',
  '.fs': 'fsharp',
  '.fsx': 'fsharp',
  '.m': 'objective-c',
  '.mm': 'objective-c',

  // Shell / Scripts
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.bat': 'bat',
  '.cmd': 'bat',
  '.ps1': 'powershell',
  '.psm1': 'powershell',

  // Markup / Docs
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.tex': 'latex',
  '.rst': 'restructuredtext',

  // Database
  '.sql': 'sql',
  '.mysql': 'sql',
  '.pgsql': 'sql',

  // DevOps / Config
  '.dockerfile': 'dockerfile',
  '.tf': 'hcl',
  '.tfvars': 'hcl',
  '.proto': 'protobuf',

  // Other
  '.diff': 'diff',
  '.patch': 'diff',
  '.log': 'log',
  '.txt': 'plaintext'
}

/**
 * Special filename mappings (exact match, case-insensitive).
 */
const FILENAME_MAP: Record<string, string> = {
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'cmakelists.txt': 'cmake',
  '.gitignore': 'ignore',
  '.gitattributes': 'ignore',
  '.editorconfig': 'ini',
  '.prettierrc': 'json',
  '.eslintrc': 'json',
  '.babelrc': 'json',
  'tsconfig.json': 'json',
  'package.json': 'json',
  'cargo.toml': 'ini',
  'go.mod': 'go',
  'go.sum': 'plaintext'
}

/**
 * Detect Monaco language ID from a file path.
 */
export function detectLanguage(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() || ''
  const lowerName = fileName.toLowerCase()

  // Check exact filename match first
  if (FILENAME_MAP[lowerName]) {
    return FILENAME_MAP[lowerName]
  }

  // Check extension
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex >= 0) {
    const ext = fileName.slice(dotIndex).toLowerCase()
    if (EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext]
    }
  }

  return 'plaintext'
}
