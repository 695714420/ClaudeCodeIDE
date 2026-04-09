# ClaudeCode IDE

A desktop IDE powered by [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), built with Electron + React + TypeScript.

ClaudeCode IDE provides a graphical interface for interacting with Claude Code — Anthropic's AI coding assistant that runs locally on your machine.

## Features

- **Chat Interface** — Conversational AI assistant panel with multi-session tabs, streaming responses, and message history persistence
- **Code Editor** — Monaco-based editor with syntax highlighting, multi-tab support, and file management
- **File Explorer** — Browse and open project directories with tree view navigation
- **Slash Commands** — Quick access to all Claude Code slash commands (`/compact`, `/diff`, `/plan`, etc.) with inline autocomplete
- **CLI Integration** — Communicates with Claude Code CLI via subprocess, no API key needed
- **Buddy Pet** — ASCII art companion from Claude Code's buddy system (same algorithm, same pet as your CLI)
- **Themes** — Dark and Light themes with full UI coverage
- **i18n** — English and Chinese language support
- **Settings Persistence** — All preferences and chat sessions saved locally across restarts

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
  ```bash
  npm install -g @anthropic-ai/claude-code
  claude login
  ```

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## Building

```bash
# Build for production
npm run build

# Package as installer (Windows NSIS)
npx electron-vite build
node ./node_modules/electron-builder/out/cli/cli.js --win nsis

# Output: release/ClaudeCode IDE Setup x.x.x.exe
```

The installer supports upgrade installation — existing user data (settings, chat history, sessions) is preserved.

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App entry, IPC handlers
│   └── services/
│       ├── CliService.ts       # Claude Code CLI subprocess management
│       ├── StreamJsonParser.ts # Stream JSON line parser
│       ├── CacheManager.ts     # Persistent storage (electron-store)
│       └── FileSystemService.ts
├── preload/               # Electron preload (contextBridge)
│   └── index.ts
├── renderer/              # React frontend
│   ├── components/        # UI components
│   │   ├── ClaudeCodePanel.tsx  # Chat panel with sessions
│   │   ├── BuddyPet.tsx        # ASCII art pet companion
│   │   ├── SettingsModal.tsx    # Preferences dialog
│   │   ├── FileExplorer.tsx     # File tree browser
│   │   ├── CodeEditor.tsx       # Monaco editor wrapper
│   │   └── ...
│   ├── hooks/             # React hooks
│   │   └── useClaudeCode.ts     # CLI communication hook
│   ├── store/             # State management (React Context)
│   │   └── AppContext.tsx
│   ├── theme/             # Theme system
│   │   └── ThemeProvider.tsx
│   ├── i18n.ts            # Internationalization (en/zh)
│   └── src/
│       ├── App.tsx
│       └── main.tsx
└── shared/                # Shared types and constants
    ├── types.ts
    └── constants.ts
```

## How It Works

ClaudeCode IDE communicates with the Claude Code CLI (`claude`) via `child_process.spawn` in the Electron main process. User prompts are sent via stdin, and responses are received as stream-json events on stdout. The main process parses these events and forwards them to the renderer via IPC.

This means:
- No API keys to configure — Claude Code CLI handles authentication
- Works with your existing Claude Code subscription
- All Claude Code features available via slash commands
- Your buddy pet matches the one in your CLI (same deterministic algorithm)

## Data Storage

User data is stored locally via `electron-store`:
- **Settings** — theme, language, buddy pet toggle
- **Chat Sessions** — all conversation tabs and messages
- **History** — past request/response records

Data location: `%APPDATA%/claudecode-cache/` (Windows)

Upgrading the app preserves all user data.

## License

MIT
