# AI UI Generation System

Production-ready AI agent for generating and refining editable UI layouts.

## Architecture

```
User Prompt → Prompt Parser → Layout Generator (LLM) → Rules Engine → JSON → Editor
Screenshot → Vision API (GPT-4) → Layout Extractor → Rules Engine → JSON → Editor
Current Layout + Message → Layout Refiner (LLM) → Updated Layout → Editor
```

## Components

### 1. AI Agent (`src/lib/ai/agent/`)

- **prompt-parser.ts** – Extracts intent, components, style, viewport from natural language
- **layout-generator.ts** – Calls OpenAI/Anthropic to generate structured JSON (fallback without API key)
- **screenshot-extractor.ts** – Extracts layout from screenshots via GPT-4 Vision
- **theme-generator.ts** – Generates design system (colors, typography) from prompts
- **layout-refiner.ts** – Conversational refinement of existing layouts
- **rules-engine.ts** – Validates and fixes layouts (grid, spacing, constraints)

### 2. Providers (`src/lib/ai/providers/`)

- **index.ts** – OpenAI primary, Anthropic fallback for text generation

### 3. UI Schema (`src/lib/ai/schema/`)

- **ui-schema.ts** – Type definitions, viewport dimensions
- **adapter.ts** – Converts between AI JSON and editor `SceneNode` format

### 4. API Routes

- `POST /api/ai/generate` – Body: `{ prompt, viewport?, theme? }` → `{ nodes }`
- `POST /api/ai/extract` – Body: `{ image: base64 }` → `{ nodes }` (screenshot → layout)
- `POST /api/ai/theme` – Body: `{ prompt }` → `{ theme }`
- `POST /api/ai/chat` – Body: `{ nodes, message }` → `{ nodes?, suggestion? }` (refine layout)

## Setup

### OpenAI API (primary)

Add to `.env.local`:

```
OPENAI_API_KEY=sk-...
```

### Anthropic API (fallback)

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without any API key, prompt-based generation uses a rule-based fallback. Screenshot extraction and chat require at least one key.

## Usage in Editor

### Generate from Prompt

1. Open the editor
2. In the left panel, go to **Assets**
3. Under **AI Generate**, select viewport (Desktop/Tablet/Mobile)
4. Optionally enable **Generate design system theme**
5. Enter a prompt, e.g. "Modern SaaS dashboard with sidebar and KPI cards"
6. Click **Generate UI**

### Extract from Screenshot

1. In **AI Generate**, switch to **Screenshot** tab
2. Upload a UI screenshot (PNG, JPG, WebP, max 4MB)
3. Click **Extract Layout**
4. The layout is parsed and added to the canvas

### Refine with AI Chat

1. In the left panel, go to **AI Chat**
2. Describe changes, e.g. "Make the sidebar darker", "Add a footer"
3. The AI applies modifications to your current layout

## Layout Constraints

- Desktop: 1440×900 (1200–1920px width)
- Tablet: 768×1024
- Mobile: 375×812
- Spacing: 4, 8, 16, 24, 32
- Grid: 12 columns
