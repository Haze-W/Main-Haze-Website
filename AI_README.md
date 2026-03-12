# AI UI Generation System

Production-ready AI agent for generating editable desktop UI layouts.

## Architecture

```
User Prompt → Prompt Parser → Layout Generator (LLM) → Rules Engine → JSON → Editor
```

## Components

### 1. AI Agent (`src/lib/ai/`)

- **prompt-parser.ts** – Extracts intent, components, style from natural language
- **layout-generator.ts** – Calls OpenAI API to generate structured JSON (fallback without API key)
- **rules-engine.ts** – Validates and fixes layouts (grid, spacing, constraints)

### 2. UI Schema (`src/lib/ai/schema/`)

- **ui-schema.ts** – Type definitions for AI output
- **adapter.ts** – Converts AI JSON to editor `SceneNode` format

### 3. API

- `POST /api/ai/generate` – Body: `{ prompt: string }` → Returns `{ nodes: SceneNode[] }`

## Setup

### OpenAI API (for LLM generation)

Add to `.env.local`:

```
OPENAI_API_KEY=sk-...
```

Without an API key, the system uses a rule-based fallback layout.

## Usage in Editor

1. Open the editor
2. In the left panel (Components), find **AI Generate**
3. Enter a prompt, e.g. "Modern SaaS dashboard with sidebar and KPI cards"
4. Click **Generate UI**
5. The generated layout appears on the canvas and is fully editable

## Layout Constraints

- Width: 1200–1920px (default 1440)
- Spacing: 4, 8, 16, 24, 32
- Grid: 12 columns

## Future Expansion

- Layout extraction from screenshots (CV/ViT)
- Mobile/responsive generation
- Design system and theme generation
