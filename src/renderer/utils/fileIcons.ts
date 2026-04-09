/**
 * File extension to icon (emoji) mapping for the file explorer.
 */

const extensionIconMap: Record<string, string> = {
  // TypeScript
  '.ts': '🔷',
  '.tsx': '🔷',
  '.d.ts': '🔷',
  // JavaScript
  '.js': '🟡',
  '.jsx': '🟡',
  '.mjs': '🟡',
  '.cjs': '🟡',
  // Python
  '.py': '🐍',
  '.pyw': '🐍',
  '.pyi': '🐍',
  // Data / Config
  '.json': '📋',
  '.yaml': '📋',
  '.yml': '📋',
  '.toml': '📋',
  '.ini': '📋',
  '.env': '📋',
  // Markdown / Docs
  '.md': '📝',
  '.mdx': '📝',
  '.txt': '📝',
  '.rst': '📝',
  // Styles
  '.css': '🎨',
  '.scss': '🎨',
  '.sass': '🎨',
  '.less': '🎨',
  '.styl': '🎨',
  // HTML / Web
  '.html': '🌐',
  '.htm': '🌐',
  '.svg': '🌐',
  '.xml': '🌐',
  // Java
  '.java': '☕',
  '.jar': '☕',
  '.class': '☕',
  // Go
  '.go': '🔵',
  // Rust
  '.rs': '🦀',
  // Ruby
  '.rb': '💎',
  '.erb': '💎',
  // Shell
  '.sh': '⚙️',
  '.bash': '⚙️',
  '.zsh': '⚙️',
  '.fish': '⚙️',
  '.bat': '⚙️',
  '.cmd': '⚙️',
  '.ps1': '⚙️',
  // C / C++
  '.c': '🇨',
  '.h': '🇨',
  '.cpp': '🇨',
  '.hpp': '🇨',
  '.cc': '🇨',
  // C#
  '.cs': '🟣',
  // PHP
  '.php': '🐘',
  // Swift
  '.swift': '🦅',
  // Kotlin
  '.kt': '🟠',
  '.kts': '🟠',
  // Images
  '.png': '🖼️',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
  '.gif': '🖼️',
  '.ico': '🖼️',
  '.webp': '🖼️',
  // Lock files
  '.lock': '🔒',
  // Git
  '.gitignore': '🔧',
  '.gitattributes': '🔧',
}

/** Special full-filename matches (take priority over extension) */
const filenameIconMap: Record<string, string> = {
  'Dockerfile': '🐳',
  'docker-compose.yml': '🐳',
  'docker-compose.yaml': '🐳',
  '.dockerignore': '🐳',
  'Makefile': '⚙️',
  'LICENSE': '📜',
  'LICENSE.md': '📜',
  '.gitignore': '🔧',
  '.gitattributes': '🔧',
  '.eslintrc.json': '🔧',
  '.prettierrc': '🔧',
  'tsconfig.json': '🔷',
  'package.json': '📦',
  'package-lock.json': '📦',
}

const DEFAULT_FILE_ICON = '📄'

/**
 * Get the icon emoji for a given filename.
 * Checks full filename first, then extension.
 */
export function getFileIcon(filename: string): string {
  // Check full filename match first
  if (filenameIconMap[filename]) {
    return filenameIconMap[filename]
  }

  // Check for compound extensions like .d.ts
  const lowerName = filename.toLowerCase()
  if (lowerName.endsWith('.d.ts')) {
    return extensionIconMap['.d.ts']
  }

  // Extract extension
  const dotIndex = lowerName.lastIndexOf('.')
  if (dotIndex >= 0) {
    const ext = lowerName.slice(dotIndex)
    if (extensionIconMap[ext]) {
      return extensionIconMap[ext]
    }
  }

  return DEFAULT_FILE_ICON
}
