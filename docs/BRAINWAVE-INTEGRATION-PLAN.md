# Brainwave → Haze UI Integration Plan

**Status:** Integrated (Haze + Coral branding, Brainwave design tokens, bottom AI bar)  
**Source:** UI8 Brainwave 2.0 (saveweb2zip export)  
**Goal:** Adopt the Brainwave design language while keeping Haze's components, Coral AI, and export features. All names, assets, and branding → Haze.

---

## Design Overview (Brainwave)

- **Layout:** 3-column (left sidebar | canvas | right sidebar) + floating toolbar + bottom AI prompt
- **Left sidebar:** Project selector, Scene/Assets tabs, layer tree, search (⌘K)
- **Top toolbar:** Selection tools, zoom, Export button
- **Center:** Canvas / preview area
- **Bottom:** AI prompt input ("Describe your 3D object or scene..."), agent selector, Inspiration, Send
- **Right sidebar:** Design/Animation tabs, Show Frame, Artboard, Materials, Styles, Background, Camera
- **Theme:** Light grays, Inter font, rounded panels, subtle shadows

---

## Rebranding Map

| Brainwave | → Haze |
|-----------|--------|
| Brainwave 2.0 | Haze |
| Brainwave 2.5 (agent) | Coral 1.0 |
| 3D Design Project | [Project name from Haze] |
| Scene / Assets | Layers / Components (or keep Scene/Assets) |
| Design / Animation | Design / Code (or Properties) |
| Inspiration | Templates / Examples |
| Describe your 3D object or scene... | Describe your UI... |
| Export | Export (Haze export flow) |
| Share | Share (if we add sharing) |
| logo.svg | Haze logo |
| All OG images (fb, linkedin, pinterest) | Haze branding |
| favicon.ico | Haze favicon |

---

## Component Mapping

| Brainwave Element | Haze Equivalent |
|-------------------|-----------------|
| Left sidebar | `LeftSidebar` / `ComponentsPanel` |
| Right sidebar | `RightSidebar` / `PropertiesPanel` |
| Top toolbar | `TopBar` |
| Canvas | `Canvas` / `FigmaNodeRenderer` |
| AI prompt bar | `AIPanel` (Coral 1.0) |
| Export button | `ExportModal` |
| Layer tree (Camera, Dome Light, etc.) | Scene nodes tree |
| Agent dropdown | Coral 1.0 (single agent for now) |

---

## Assets to Replace

1. **images/logo.svg** → Haze logo
2. **images/cursor.c36416f6.svg** → Haze cursor (or remove)
3. **images/fb-og-image.png, linkedin-og-image.png, pinterest-og-image.png** → Haze OG images
4. **favicon.ico** → Haze favicon
5. **Avatar placeholders** (image_5.png, image_8.png, etc.) → Haze user avatars or generic

---

## CSS / Design Tokens to Adopt

From `ce308887edd65f34.css` and `dd2c1beb4ed9dc90.css`:

- **Surfaces:** `--surface-01`, `--surface-02`, `--surface-03`
- **Shades:** `--shade-01` … `--shade-09`
- **Shadows:** `--box-shadow-toolbar`, `--box-shadow-prompt-input`, `--box-shadow-depth-01`
- **Typography:** `--text-body-md`, `--text-heading`, `--text-title`, etc.
- **Components:** `.sidebar`, `.btn-icon`, `.key` (shortcut badge)

---

## Integration Steps (When Ready)

1. **Copy design tokens** into Haze's CSS/Tailwind config
2. **Restyle EditorShell** to match Brainwave layout (left/right sidebars, floating toolbar)
3. **Restyle AIPanel** to match bottom prompt bar (rounded pill, agent selector)
4. **Restyle TopBar** to match floating toolbar
5. **Restyle LeftSidebar/ComponentsPanel** to match Brainwave left panel
6. **Restyle RightSidebar/PropertiesPanel** to match Brainwave right panel
7. **Replace all Brainwave text** with Haze equivalents
8. **Add Haze logo and assets**
9. **Wire Export** to Haze's export flow
10. **Wire AI prompt** to Coral 1.0 (already done)

---

## Files Reference

- **Source design:** `c:\Users\samli\Downloads\saveweb2zip-com-ui8-brainwave-2-vercel-app\`
- **Design reference (copied):** `public/design-reference/brainwave/` — CSS + logo for reference
- **Haze editor:** `src/components/editor-v2/`, `src/app/editor/`
- **Haze AI:** `src/components/editor-v2/AIPanel.tsx`, `src/lib/ai/`
- **Haze export:** `src/components/editor/ExportModal.tsx`, `src/lib/editor/scene-export.ts`

---

## Notes

- Brainwave is a 3D tool; Haze is 2D UI. We take the **visual design** (panels, colors, typography) not the 3D features.
- Keep Haze's scene node model, Coral 1.0, and export pipeline.
- The bottom AI bar design can replace or wrap the current AIPanel.
