/**
 * Viewport - Screen ↔ Canvas coordinate transforms
 * Figma-style: smooth pan, cursor-centered zoom
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Viewport-relative (container local) to canvas. Transform origin top-left. */
export function viewportToCanvas(
  vx: number,
  vy: number,
  panX: number,
  panY: number,
  zoom: number
): Point {
  return {
    x: (vx - panX) / zoom,
    y: (vy - panY) / zoom,
  };
}

/** Screen (client) to canvas. Container = wrapper DOMRect. */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  containerRect: DOMRect,
  panX: number,
  panY: number,
  zoom: number
): Point {
  const vx = screenX - containerRect.left;
  const vy = screenY - containerRect.top;
  return viewportToCanvas(vx, vy, panX, panY, zoom);
}

/** Canvas to viewport */
export function canvasToViewport(
  cx: number,
  cy: number,
  panX: number,
  panY: number,
  zoom: number
): Point {
  return {
    x: cx * zoom + panX,
    y: cy * zoom + panY,
  };
}

/** Canvas to screen */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  containerRect: DOMRect,
  panX: number,
  panY: number,
  zoom: number
): Point {
  const v = canvasToViewport(canvasX, canvasY, panX, panY, zoom);
  return { x: v.x + containerRect.left, y: v.y + containerRect.top };
}

/** Zoom: 0.05 = 5%, 1 = 100%, 10 = 1000% */
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 10;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/** Canvas size (matches Canvas.module.css) */
export const CANVAS_SIZE = 8000;

/** Figma-style: free pan, allow panning anywhere on infinite canvas */
export function clampPan(
  panX: number,
  panY: number,
  _zoom: number,
  _containerWidth: number,
  _containerHeight: number
): { panX: number; panY: number } {
  return { panX, panY };
}
