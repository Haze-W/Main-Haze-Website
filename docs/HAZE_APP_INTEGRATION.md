# Haze app ↔ Figma plugin clipboard integration

This mirrors the contract documented in **Figma To Haze / `HAZE_APP_INTEGRATION.md`** in the plugin repo. Keep both in sync when the payload shape changes.

## Clipboard JSON

- **Format:** Any valid JSON (pretty-printed or **minified**). Key order does not matter.
- **Marker:** Treat as Figma→Haze if **any** of:
  - `"_render": true` (legacy / primary)
  - `"_haze": true` (alternative)
  - `"source": "figma-haze-plugin"` (official plugin; booleans may still be sent for compatibility)

Plus a top-level **`frame`** object (the exported Figma tree). **`version`** is optional and informational — unknown version strings are **not** rejected.

## Minimal shape

```json
{
  "_haze": true,
  "version": "2.1",
  "exportedAt": "2025-01-01T00:00:00.000Z",
  "pageName": "Page 1",
  "preview": null,
  "frame": { "id": "...", "name": "...", "type": "FRAME", "children": [] }
}
```

`_render` may be used instead of `_haze` with the same fields.

## Optional asset buckets

Merge **before** resolving any asset (same key → later bucket wins):

`assets` → `images` (often keyed by Figma **`imageHash`**) → `exports` (e.g. `nodeId_svg`).

Values may be strings (data URLs, base64, raw SVG) or objects `{ png?, svg?, data?, base64? }`.

## Runtime guards (website)

- `isHazeRenderMarker()` — `_render === true || _haze === true || source === "figma-haze-plugin"`
- `isRenderPayload()` — marker + non-null `frame` object

**`resolveImageSrc`** (converter): `pngData` → `imageData` / `src` → `assets` `*_png` → **`IMAGE`** node `imageHash` (merged `images`) → **`assets[nodeId]`** and `:` → `-` / `_` id variants (deduped blobs when nodes omit inline base64) → IMAGE fills (`fill.imageHash`, `id_fill_i`, alt id fill keys) → `svgData` / `svgSrc` → `assets` `*_svg` / suffix fallbacks.

**TEXT** in auto-layout: renderer uses `writing-mode: horizontal-tb`, `flex-shrink: 0`, and `min-width` from Figma `minWidth` or node `width` so flex does not collapse text to one character per line.

Raw SVG strings are converted to **`data:image/svg+xml;base64,...`** (not huge `encodeURIComponent` URLs).

Implementation: `src/lib/figma/types.ts`, paste handling in `src/lib/figma/paste-listener.ts`.

---

## Website-side behavior (what the app does with your JSON)

- **Trees:** `frame` is walked recursively; `FRAME`, `GROUP`, `COMPONENT`, `COMPONENT_SET`, `INSTANCE` → one flex/absolute container; `TEXT` → rich text with segments; `RECTANGLE` / `ELLIPSE` → basic shapes; path-like exports → scene type **`VECTOR`**; raster/image layers → **`IMAGE`** (see **Rendering fidelity** below).
- **True 1:1 vectors & icons:** If there is no raster or SVG payload, **complex paths cannot be reproduced** in HTML—the app only approximates with boxes, borders, and fills. For pixel-perfect icons, **prefer PNG** (`pngData` on the node, or `assets[id + "_png"]` / `{ png }` in asset objects): raster images size predictably in **auto-layout** (flex). **SVG** (`svgData`, `assets[id_svg]`, or raw `assets[id]`) is still supported as a fallback.

### Rendering fidelity (icons, vectors, text)

The **converter** maps Figma **path nodes** to scene type **`VECTOR`** and **bitmap / image layers** to **`IMAGE`**, not **`RECTANGLE`**. Pasted nodes with `props._figma` are drawn by **`FigmaNodeRenderer`** (canvas) and **`scene-export`** (preview HTML): **`VECTOR`** uses the image/SVG pipeline when `_imageData` is set, and applies strokes via CSS borders when there is no raster. If a code path only paints **`RECTANGLE`** fills and never treats **`VECTOR`** / **`IMAGE`** as first-class, icons and strokes can look like **solid colored blocks** instead of real artwork.
- **Auto-layout:** The app maps `layoutMode`, padding, gap, align (including **STRETCH**), and optional `layoutGrow` / `layoutAlign` / min-max sizes when the plugin sends them (see `src/lib/figma/converter.ts`).
- **Fonts:** Google fonts are loaded by family name when possible; missing weights infer from `fontStyle` (e.g. SemiBold → 600).

---

## Plugin export specification (Coral/Haze) — **1:1 with Figma**

**Goal:** Export clipboard JSON so the Coral/Haze web editor can match Figma **1:1** (especially icons, vectors, and strokes).

### Required top-level JSON

- **`_haze: true`** or **`_render: true`**, plus **`version`**, **`exportedAt`**, **`pageName`**, **`preview`**, **`frame`** (full tree).
- **Optional** merged asset buckets: **`assets`**, **`images`**, **`exports`** (each value: string or `{ png | data | base64 | svg }` — **`png` is preferred** when exporting rasters).

### 1) Vectors & path-based UI (mandatory for fidelity)

For every **`VECTOR`**, **`BOOLEAN_OPERATION`**, **`STAR`**, **`POLYGON`**, **`LINE`**, and any icon built from paths:

- **Preferred:** Export a **PNG** (base64 or data URL) as **`pngData`** on the node, or put it in **`assets[node.id + "_png"]`** or **`assets["altId_png"]`** (same id variants as SVG). The app resolves **PNG before SVG** so auto-layout matches Figma more reliably.
- **Alternative:** Set **`svgData`** to the **UTF-8 SVG string** from Figma (e.g. `exportAsync({ format: 'SVG' })`), **or** put it in **`assets[node.id]`** / **`assets[node.id + "_svg"]`**.

Without raster or SVG in the payload, HTML can only use boxes and borders—not the real path.

### 2) Images

For **IMAGE** fills / bitmaps: provide **`imageData`** / data URLs, or **`assets`** entries keyed by node id / **`imageRef`**.

### 3) Auto-layout

Export: **`layoutMode`**, padding, **`itemSpacing`**, **`primaryAxisAlignItems`**, **`counterAxisAlignItems`**, and per-child **`layoutGrow`**, **`layoutAlign`** (e.g. `STRETCH`), **`primaryAxisSizingMode`**, **`counterAxisSizingMode`**, **`layoutWrap`**, min/max width/height when used in Figma.

### 4) Text

Export full **`text.segments`** with **`characters`**, **`fontFamily`**, **`fontStyle`**, **`fontSize`**, **`fontWeight`** (number when possible), per-segment **`fills`**, alignment, line height, letter spacing.

### 5) QA

After export, paste into **Coral**: icons and illustrations should match Figma; no missing “empty” vector regions.

### Optional (plugin implementation)

- Bump **`version`** when the schema changes; **`source`** is informational on the app side.
- Batch SVG exports; dedupe identical icons by hash; keep JSON minified when possible.

---

## Prompt for the plugin team (copy-paste)

```
Goal: Export clipboard JSON so the Coral/Haze web editor can match Figma 1:1 (especially icons, vectors, and strokes).

Required top-level JSON:
_haze: true or _render: true, plus version, exportedAt, pageName, preview, frame (full tree).
Optional merged asset buckets: assets, images, exports (string or { png | data | base64 | svg }).

1) Vectors & path-based UI (mandatory for fidelity)
For every VECTOR, BOOLEAN_OPERATION, STAR, POLYGON, LINE, and any icon built from paths:

Preferred: PNG as pngData on the node, or assets[node.id + "_png"] / { png } (PNG is resolved before SVG for flex-friendly layout).
Alternative: svgData or assets[node.id] / assets[node.id + "_svg"] with UTF-8 SVG from Figma.
Without raster or SVG in the payload, HTML can only use boxes and borders—not the real path.

2) Images
For IMAGE fills / bitmaps: provide imageData / data URLs, or assets entries keyed by node id / imageRef.

3) Auto-layout
Export: layoutMode, padding, itemSpacing, primaryAxisAlignItems, counterAxisAlignItems, and per-child layoutGrow, layoutAlign (e.g. STRETCH), primaryAxisSizingMode, counterAxisSizingMode, layoutWrap, min/max width/height when used in Figma.

4) Text
Export full text.segments with characters, fontFamily, fontStyle, fontSize, fontWeight (number when possible), per-segment fills, alignment, line height, letter spacing.

5) QA
After export, paste into Coral: icons and illustrations should match Figma; no missing "empty" vector regions.
```
