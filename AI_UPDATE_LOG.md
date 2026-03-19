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
