# Haze agent — design → desktop (local)

This project uses a **local** agent (no API keys required):

- **Modes:** `/ui`, `/plan`, `/ask`, `/backend`, `/agent`, `/fix` in the editor panel.
- **Generate bar:** keyword-based layouts (sidebar, cards, login, etc.) via `parsePrompt` + templates.
- **Refine:** rule-based color and typography tweaks (hex colors, “darker”, “larger font”, etc.).

## Stack target (exports)

- Next.js (App Router) + TypeScript + Tailwind for web preview
- Tauri v2 + Rust for desktop export
- SQLite optional in generated apps

## When cloud / credits land

- Same routes (`/api/ai/chat`, `/api/ai/generate`) can swap the backend to a billed provider without changing the editor UI.

## Reference

See repository `cursor-agent.json` for project metadata.
