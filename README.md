# Code IDE

A desktop IDE powered by multiple AI backends (Claude Code, Codex, and more), built with Electron + React + TypeScript.

Code IDE provides a graphical interface for interacting with AI coding assistants that run locally on your machine. It supports a pluggable backend architecture, allowing you to switch between different AI CLI tools.

## Features

- **Chat Interface** — Conversational AI assistant panel with multi-session tabs, streaming responses, and message history persistence
- **Code Editor** — Monaco-based editor with syntax highlighting, multi-tab support, and file management
- **File Explorer** — Browse and open project directories with tree view navigation
- **Slash Commands** — Quick access to all Claude Code slash commands (`/compact`, `/diff`, `/plan`, etc.) with inline autocomplete
- **Multi-Backend Support** — Pluggable AI backend architecture supporting Claude Code and Codex, with easy switching
- **CLI Integration** — Communicates with AI CLI tools via subprocess, no API key needed
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

# Output: release/Code IDE Setup x.x.x.exe
```

The installer supports upgrade installation — existing user data (settings, chat history, sessions) is preserved.

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App entry, IPC handlers
│   └── services/
│       ├── BackendRegistry.ts       # Backend adapter registry
│       ├── ClaudeBackendAdapter.ts  # Claude Code CLI backend adapter
│       ├── CodexBackendAdapter.ts   # Codex CLI backend adapter
│       ├── CodexOutputParser.ts     # Codex output stream parser
│       ├── StreamJsonParser.ts      # Stream JSON line parser (Claude)
│       ├── CacheManager.ts          # Persistent storage (electron-store)
│       └── FileSystemService.ts
├── preload/               # Electron preload (contextBridge)
│   └── index.ts
├── renderer/              # React frontend
│   ├── components/        # UI components
│   │   ├── AIChatPanel.tsx       # Chat panel with sessions & backend selector
│   │   ├── BuddyPet.tsx        # ASCII art pet companion
│   │   ├── SettingsModal.tsx    # Preferences dialog
│   │   ├── FileExplorer.tsx     # File tree browser
│   │   ├── CodeEditor.tsx       # Monaco editor wrapper
│   │   └── ...
│   ├── hooks/             # React hooks
│   │   └── useAIBackend.ts       # AI backend communication hook
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

Code IDE communicates with AI CLI tools via `child_process.spawn` in the Electron main process. A pluggable backend adapter architecture routes requests to the selected backend (Claude Code or Codex). User prompts are sent via stdin, and responses are parsed into a unified stream event format and forwarded to the renderer via IPC.

This means:
- No API keys to configure — each CLI tool handles its own authentication
- Switch between Claude Code and Codex from the chat panel or settings
- Works with your existing subscriptions for each backend
- All Claude Code features available via slash commands when using the Claude backend
- Your buddy pet matches the one in your CLI (same deterministic algorithm)

## Data Storage

User data is stored locally via `electron-store`:
- **Settings** — theme, language, buddy pet toggle, selected AI backend
- **Chat Sessions** — all conversation tabs and messages
- **History** — past request/response records

Data location: `%APPDATA%/claudecode-cache/` (Windows)

Upgrading the app preserves all user data.

## License

MIT
