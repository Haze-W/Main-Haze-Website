# AI Layout System — Update Log

## Overview

Major upgrade to the AI layout generation system. The system now produces high-end, production-ready UI layouts with design presets, section templates, and realistic copy rules.

---

## Changes Summary

### 1. Prompt Parser (`src/lib/ai/agent/prompt-parser.ts`)

#### New Interface Fields
- **`designPreset?: string`** — Detected design style (e.g., Stripe-style, Apple minimal)
- **`sectionTemplate?: string`** — Required structure for the page type (e.g., landing, dashboard)

#### Design Presets
| Preset | Keywords | Description |
|--------|----------|-------------|
| **Stripe** | stripe, saas, payment, conversion | Clean gradients, purple accents, trust-building, conversion-focused |
| **Apple** | apple, minimal, premium, sf style | Lots of whitespace, SF-style typography, subtle shadows, premium feel |
| **Landing** | landing, homepage, marketing page | Hero, features grid, social proof, strong CTA |
| **Glassmorphism** | glass, glassmorphism, frosted, blur | Frosted glass cards, blur, soft elevation |
| **Linear** | linear, crisp, keyboard, fast | Crisp, fast-feeling, keyboard-first aesthetic, dark mode friendly |
| **Notion** | notion, blocks, wiki, content-first | Content-first, sidebar nav, clean blocks, collaborative feel |

#### Section Templates
| Page Type | Required Structure |
|-----------|--------------------|
| **Landing** | Hero (headline + subheadline + CTA), Features grid (3–4 features with icons), CTA section, Footer (links, copyright) |
| **Dashboard** | Sidebar (nav with icons), Topbar (logo, search, user), Stats cards (3–4 KPI cards), Main content area (charts/tables/lists) |
| **Login** | Centered card, Title, Email + Password inputs, Remember me, Sign in button, Sign up link |
| **Settings** | Sidebar (section nav), Content area (form inputs), Save/Cancel buttons |
| **Pricing** | Section title, 3 pricing cards (Starter/Pro/Enterprise), Feature lists, CTA buttons |

#### New Helper
- **`has(text, ...keywords)`** — Utility for keyword detection in prompts

---

### 2. Layout Generator (`src/lib/ai/agent/layout-generator.ts`)

#### System Prompt Overhaul
**Before:** Generic “expert UI designer” with Dribbble-inspired principles.

**After:** Elite senior UI/UX designer persona with:

- **Design intelligence**
  - Clear sections: Navbar, Hero/Header, Content, CTA, Footer
  - Visual hierarchy: Primary (18–24px), secondary (14–16px), tertiary (12px)
  - 8px spacing grid: 4, 8, 12, 16, 24, 32, 48, 64
  - Real product copy (no placeholders)
  - Grid alignment, no floating elements

- **Style**
  - Clean, minimal, modern
  - Soft shadows, subtle borders, balanced whitespace
  - Premium feel

- **Dark theme**
  - Dark grays (#0d0f12, #151620, #1a1b23), no pure black
  - Soft elevation, proper contrast

- **Image replication**
  - When user says “replicate”, “like this”, “copy this” — recreate layout, improve spacing and clarity

- **Avoid**
  - Messy layouts, random spacing, unaligned elements, empty sections, “Lorem ipsum”, repetitive generic cards

#### `buildUserPrompt` Enhancements
- **Preset injection** — When `designPreset` is detected, injects: `DESIGN PRESET: [description]`
- **Template injection** — When `sectionTemplate` is detected, injects: `SECTION TEMPLATE: [structure]`
- **Real text rule** — Always adds: `REAL TEXT: Use realistic copy (e.g. "Track your revenue in real time", "Manage your team efficiently"). NEVER use "Lorem ipsum" or placeholder gibberish.`

---

## Behavioral Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Design persona** | Expert UI designer | Elite senior UI/UX designer & frontend architect |
| **Style guidance** | Dribbble principles | Apple, Stripe, Linear, Notion–inspired |
| **Spacing** | 24–32px between sections | 8px grid (4, 8, 12, 16, 24, 32, 48, 64) |
| **Copy** | No explicit rule | Must use realistic copy, no Lorem ipsum |
| **Presets** | None | 6 design presets (Stripe, Apple, Landing, etc.) |
| **Templates** | None | 5 section templates by page type |
| **User prompt** | Basic hints (theme, components, domain) | Adds preset, template, and real-text rules |

---

## Files Modified

- `src/lib/ai/agent/prompt-parser.ts` — ParsedPrompt, presets, templates, detection logic
- `src/lib/ai/agent/layout-generator.ts` — System prompt, `buildUserPrompt`

---

## No Breaking Changes

- Existing APIs unchanged (`generateLayoutFromPrompt`, `parsePromptWithOptions`)
- `ParsedPrompt` extended with optional fields only
- Fallback layout behavior unchanged

---

## March 2026 — Editor AI reliability, build feedback, layout accuracy & elite pipeline

### Fixed

- **Bottom bar “What would you like to build?”** — Successful generations no longer failed silently: replaced invalid `addNodesToCanvas` usage with **`applyGeneratedLayout`** (updates nodes, history, preview mode) and **`POST /api/ai/generate`** as the primary path.
- **Layouts ignoring the user prompt** — Model was often collapsing to the same dashboard template. Addressed by:
  - **`isLayoutMinimal` logic** — A single root frame with deep nested content is no longer treated as “empty”; richness is judged by **recursive** text/icon/button count (**≥ 5**), reducing unjustified fallbacks to the stock template.
  - **Prompt priority** — Explicit **PRIORITY** block around the raw user text; instructions not to default to generic KPI copy (e.g. “Total Revenue”) unless analytics/finance is relevant.
  - **Cloud path** — Shorter JSON shape reference (trimmed example) so the model focuses on user intent; tuned **`maxTokens`** / **`temperature`** for quality vs diversity.
  - **Ollama path** — User request placed first; reduced **`num_predict`** for faster responses (`src/lib/ai/ollama.ts`).
- **Fallback layouts** — **`inferFallbackCards`** + **`titleFromUserPrompt`** so rule-based fallback reflects keywords (todo, music, chat, analytics, food, etc.) and topbar/titles align with the prompt instead of a generic “App”.

### Added

- **On-canvas AI build progress** — While generating, users see status on the canvas:
  - **Store** (`src/lib/editor/store.ts`): `aiBuild` state, `setAiBuild`, `appendAiBuildLine`, `clearAiBuild`.
  - **Helpers** (`src/lib/editor/ai-build-ui.ts`): `startAiBuildTicker`, `pushAiBuildStatus`, `endAiBuildTicker`.
  - **Editor shell** (`EditorShell.tsx` + `EditorShell.module.css`): Overlay on the canvas area (spinner + live log, `role="status"`, `aria-live="polite"`).
  - **Wired from** `BottomAIPrompt.tsx` and `ComponentsPanel.tsx` (generate + screenshot extract flows).
- **Elite / product-style generation (single-call FAST mode)** — Encoded in **`layout-generator.ts`** without multi-round LLM chains:
  - **Archetype hints** — Keyword routes for chatbot, messaging, booking, ecommerce, portfolio, CRM, admin, social, finance, landing, productivity, SaaS dashboard; each injects required **regions** (e.g. chatbot → history + thread + composer).
  - **Style rotation** — **`STYLE_VARIATIONS`** + stable hash from prompt so generations push **distinct** palette/structure/radius/density and avoid cliché blue/purple SaaS unless the prompt fits.
- **Partial vs full generation routing** — New **`src/lib/ai/agent/generate-intent.ts`**: **`isGreenfieldLayoutRequest`**, **`isLikelyLayoutPatch`**, **`shouldUseRefineForBottomBar`**. When the canvas **already has nodes** and the message looks like an **edit** (colors, spacing, dark mode, “add a…”, etc.), the bottom bar calls **`POST /api/ai/chat`** (refine). Clear **greenfield** phrases still use **`/api/ai/generate`**.

### Changed

- **`layout-generator.ts` — `SYSTEM_PROMPT`** — Reframed as elite FAST generator: user text as source of truth, internal archetype inference, anti-repetition, complete UIs, JSON-only output.
- **`layout-refiner.ts`** — Stronger **partial regeneration** rules (edit-in-place, preserve unrelated nodes, full rebuild only when explicitly requested). **`maxTokens`** reduced **8192 → 4096** for faster refinement.
- **`EditorShell.module.css`** — AI overlay background uses **`rgba(...)`** instead of **`color-mix`** for broader browser support.

### Files touched (this release)

| Area | Path |
|------|------|
| Bottom prompt | `src/components/editor-v2/BottomAIPrompt.tsx` |
| Assets / generate UI | `src/components/editor-v2/ComponentsPanel.tsx` |
| Editor chrome / overlay | `src/components/editor-v2/EditorShell.tsx`, `EditorShell.module.css` |
| Editor state | `src/lib/editor/store.ts` |
| Build UI helpers | `src/lib/editor/ai-build-ui.ts` |
| Layout generation | `src/lib/ai/agent/layout-generator.ts` |
| Greenfield vs patch | `src/lib/ai/agent/generate-intent.ts` |
| Conversational refine | `src/lib/ai/agent/layout-refiner.ts` |
| Local LLM tuning | `src/lib/ai/ollama.ts` (if adjusted in same effort) |

### Notes

- Build progress is **client-side status + ticker** plus explicit **`pushAiBuildStatus`** calls; **server-sent streaming** of step-by-step generation is not implemented yet.
- **AI Refine** side panel (`AIChatPanel`) uses the same **`/api/ai/chat`** refine path; the on-canvas build overlay is primarily driven from the bottom bar and Components panel flows above.
