# Figma Plugin Prompt for Render Integration

**Copy this entire prompt into the Cursor window for your Figma plugin project.**

---

## Task

Update the Render Figma plugin so that when users copy a frame, **images and vectors are exported and included in the clipboard payload**. Currently, images and vectors appear as empty boxes in the Render app because the plugin does not export their pixel/SVG data.

## What the Render App Expects

The clipboard must contain JSON in `text/plain` with this structure:

```json
{
  "_render": true,
  "version": "2.1",
  "exportedAt": "2025-03-11T12:00:00.000Z",
  "pageName": "Page 1",
  "frame": { /* nested node tree with id, type, x, y, width, height, etc. */ },
  "assets": {
    "NODE_ID": "data:image/png;base64,iVBORw0KGgo...",
    "NODE_ID_svg": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
  }
}
```

### Asset Keys

- **IMAGE nodes**: Use the node's `id` (e.g. `"2:123"`) as the key. Value = base64 PNG or JPEG with `data:image/png;base64,` prefix, OR raw base64 string (Render will add the prefix).
- **VECTOR nodes** (VECTOR, BOOLEAN_OPERATION, STAR, POLYGON): Use `NODE_ID_svg` (e.g. `"2:456_svg"`). Value = raw SVG string (e.g. `<svg>...</svg>`). Render will encode it.
- **RECTANGLE with IMAGE fill**: Use `NODE_ID_fill_0` for the first image fill, `NODE_ID_fill_1` for the second, etc.

### Alternative: Inline on Node

You can also set `imageData`, `src`, or `svgData` directly on each node in the frame tree instead of using `assets`:

```json
{
  "id": "2:123",
  "type": "IMAGE",
  "imageData": "data:image/png;base64,iVBORw0KGgo..."
}
```

```json
{
  "id": "2:456",
  "type": "VECTOR",
  "svgData": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>"
}
```

## Implementation Steps

### 1. Recursively collect IMAGE and VECTOR nodes

Walk the selected frame tree and collect all nodes where `node.type === 'IMAGE'` or `node.type === 'VECTOR'` (or `BOOLEAN_OPERATION`, `STAR`, `POLYGON`).

### 2. Export each node using `exportAsync`

```typescript
// For IMAGE nodes (or RECTANGLE with image fill)
const bytes = await node.exportAsync({
  format: 'PNG',
  constraint: { type: 'SCALE', value: 2 }  // 2x for retina
});
const base64 = figma.base64Encode(bytes);
// Add to assets: assets[node.id] = `data:image/png;base64,${base64}`

// For VECTOR nodes
const svgBytes = await node.exportAsync({ format: 'SVG' });
const svgString = new TextDecoder().decode(svgBytes);
// Add to assets: assets[`${node.id}_svg`] = svgString
```

### 3. Handle IMAGE fills on shapes

For RECTANGLE (or other shapes) with `fills` that have `type === 'IMAGE'`, you need to export the image. The fill has an `imageRef` or similar that references the image. Use `figma.getImageByHash()` to get the image, then export it. Or export the entire node as PNG and use that for the fill.

### 4. Build the payload and copy to clipboard

```typescript
const payload = {
  _render: true,
  version: '2.1',
  exportedAt: new Date().toISOString(),
  pageName: figma.currentPage.name,
  frame: serializeFrame(selection),
  assets: {} as Record<string, string>
};

// Export all image/vector nodes
async function exportAssets(node: SceneNode) {
  if (node.type === 'IMAGE') {
    const bytes = await node.exportAsync({ format: 'PNG' });
    payload.assets[node.id] = `data:image/png;base64,${figma.base64Encode(bytes)}`;
  }
  if (['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON'].includes(node.type)) {
    const bytes = await node.exportAsync({ format: 'SVG' });
    payload.assets[`${node.id}_svg`] = new TextDecoder().decode(bytes);
  }
  if ('children' in node) {
    for (const child of node.children) {
      await exportAssets(child);
    }
  }
}
await exportAssets(selection);

// Copy to clipboard (plugin UI must do this - use parent.postMessage to send payload to iframe)
// In the iframe: navigator.clipboard.writeText(JSON.stringify(payload))
```

### 5. Optional: Also write image to clipboard for single-image paste

If the user copies a single IMAGE or VECTOR node, you can write both the JSON and the image blob to the clipboard. The Render app will use the blob when it detects a single image/vector node without asset data:

```javascript
// In plugin UI (iframe)
const blob = new Blob([jsonPayload], { type: 'text/plain' });
const imageBlob = await fetch(dataUrl).then(r => r.blob());
await navigator.clipboard.write([
  new ClipboardItem({
    'text/plain': blob,
    'image/png': imageBlob  // Only if single image
  })
]);
```

## Figma API Reference

- `node.exportAsync(options)`: Returns `Promise<Uint8Array>`. Options: `{ format: 'PNG' | 'SVG' | 'JPG', constraint?: { type: 'SCALE', value: number } }`
- `figma.base64Encode(bytes: Uint8Array)`: Converts bytes to base64 string
- For SVG: `new TextDecoder().decode(bytes)` gives the SVG string

## RECTANGLE, LINE, and Shape Nodes

**Critical:** Render needs `fills` and `strokes` to display shapes correctly. When serializing each node, always include:

- **`fills`**: Array of paint objects. For SOLID fills use `{ type: "SOLID", hex: "#RRGGBB", alpha: 1 }` or Figma's `{ type: "SOLID", color: { r, g, b, a } }` (r,g,b in 0-1). For GRADIENT_LINEAR fills, include either `stops: [{ hex: "#RRGGBB", alpha: 1, position: 0.5 }]` OR `gradientStops: [{ color: { r, g, b, a }, position: 0.5 }]` and `gradientHandlePositions: [{ x, y }, { x, y }]` for angle.
- **`strokes`**: Same format as fills. Required for LINE nodes and divider lines.
- **`strokeWeight`**: Number (e.g. 1 for thin dividers).
- **`cornerRadius`**, **`topLeftRadius`**, etc. for rounded corners.
- **`fillEnabled`**, **`strokeEnabled`** (default true if omitted).

**LINE nodes and dividers:** Thin separator lines (e.g. between list and Properties panel) are often LINE nodes or thin RECTANGLEs. Ensure:
- LINE nodes include `strokes` (the stroke is the visible line).
- Thin RECTANGLE dividers include `fills` (the fill is the line color).
- Dimensions: if a LINE has height 0, use at least `strokeWeight` for height so it renders.

## Checklist

- [ ] Recursively walk the frame tree
- [ ] For each IMAGE node: `exportAsync({ format: 'PNG' })` → base64 → `assets[node.id]`
- [ ] For each VECTOR/BOOLEAN_OPERATION/STAR/POLYGON: `exportAsync({ format: 'SVG' })` → decode → `assets[node.id + '_svg']`
- [ ] For IMAGE-type fills on shapes: export and add to `assets[node.id + '_fill_' + index]`
- [ ] Ensure the payload is written to `text/plain` when copying
- [ ] Handle errors (e.g. node not exportable) gracefully
