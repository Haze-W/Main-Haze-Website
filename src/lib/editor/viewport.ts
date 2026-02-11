/**
 * Viewport - Screen ↔ Canvas coordinate transforms
 * Pixel-perfect at any zoom level
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

export const MIN_ZOOM = 40;
export const MAX_ZOOM = 100;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/** Canvas content size (used for pan bounds) */
export const CANVAS_SIZE = 5000;

/** Border (px) - prevents scrolling fully off canvas */
export const PAN_BORDER = 96;

/** Clamp pan so at least PAN_BORDER of canvas stays visible in viewport */
export function clampPan(
  panX: number,
  panY: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number
): { panX: number; panY: number } {
  const canvasW = CANVAS_SIZE * zoom;
  const canvasH = CANVAS_SIZE * zoom;
  return {
    panX: Math.max(PAN_BORDER - canvasW, Math.min(containerWidth - PAN_BORDER, panX)),
    panY: Math.max(PAN_BORDER - canvasH, Math.min(containerHeight - PAN_BORDER, panY)),
  };
}
