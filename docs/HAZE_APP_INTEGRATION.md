# Haze app ↔ Figma plugin clipboard integration

This mirrors the contract documented in **Figma To Haze / `HAZE_APP_INTEGRATION.md`** in the plugin repo. Keep both in sync when the payload shape changes.

## Clipboard JSON

- **Format:** Any valid JSON (pretty-printed or **minified**). Key order does not matter.
- **Marker:** The app accepts **either** of:
  - `"_render": true` (legacy / primary)
  - `"_haze": true` (alternative used by some plugins)

At least one marker must be `true`, plus a top-level **`frame`** object (the exported Figma tree).

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

The app merges **`assets`**, **`images`**, and **`exports`** when resolving image/binary data by node id.

## Runtime guards (website)

- `isHazeRenderMarker()` — `_render === true || _haze === true`
- `isRenderPayload()` — marker + non-null `frame` object

Implementation: `src/lib/figma/types.ts`, paste handling in `src/lib/figma/paste-listener.ts`.
