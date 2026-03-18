# Haze — Visual Tauri GUI Builder

Haze is a next-generation visual UI editor and code generator for building real Tauri desktop application GUIs. Everything rendered visually is backed by real layout logic, real CSS, and exportable production code.

## Features

- **Design Terminal** — IDE-style editor with top bar, component library, canvas, and properties panel
- **Wireframe Modes** — IDE, Wide, Square, and Custom layout presets
- **Component Library** — Frames, containers, text, buttons, inputs, panels, and more
- **Drag & Drop** — Smooth drag from palette to canvas with visual feedback
- **Properties Panel** — Live-updating controls for layout, size, spacing, typography
- **Code View** — Monaco Editor for viewing and editing generated HTML/CSS
- **Export** — One-click download of a complete Tauri project

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Routes

- `/` — Landing page
- `/dashboard` — Project dashboard with templates
- `/editor` — Design Terminal (main editor)

## Build

```bash
npm run build
npm start
```

## Live Update Log (GitHub-driven)

Haze includes a live update log system for dashboard users.

### How it works

- The app reads `update-log.json` directly from your GitHub repository branch.
- Clients poll `/api/update-log` every 15 seconds, so updates appear quickly for users currently online.
- New entries show as an unread dot on the dashboard bell icon.

### Setup

Create an `.env.local` with:

```bash
UPDATE_LOG_GITHUB_OWNER=your-github-username-or-org
UPDATE_LOG_GITHUB_REPO=your-repo-name
UPDATE_LOG_GITHUB_BRANCH=main
UPDATE_LOG_GITHUB_PATH=update-log.json
```

Optional (only needed for private repos):

```bash
UPDATE_LOG_GITHUB_TOKEN=github_pat_xxx
```

### Publishing an update

1. Edit `update-log.json` and add a new object at the top:
2. Push to GitHub.
3. Online users will see it in the dashboard update panel on the next poll cycle.

Example entry:

```json
{
  "id": "v1.0.2",
  "title": "Haze Update v1.0.2",
  "description": ["Fixed major bugs", "Improved editor performance"],
  "publishedAt": "2026-02-12T14:30:00.000Z"
}
```

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Zustand (state)
- @dnd-kit (drag and drop)
- @monaco-editor/react (code editor)
- JSZip (export)

## Export

The Export feature (File → Export) downloads a ZIP containing:

- `package.json` with Tauri scripts
- `src/index.html` — Generated HTML
- `src/styles.css` — Generated CSS
- `src-tauri/` — Rust backend and Tauri config
- `vite.config.ts` — Vite build configuration

After extracting, run:

```bash
npm install
npm run tauri dev
```

For production build:

```bash
npm run tauri build
```
