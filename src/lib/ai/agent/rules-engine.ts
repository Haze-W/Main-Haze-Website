/**
 * Design Rules Engine - Ensures layouts follow constraints
 */

import type { AIUIElement, AIUIFrame } from "../schema/ui-schema";
import {
  DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  SPACING_SCALE,
  GRID_COLUMNS,
} from "../schema/ui-schema";

export function clampToSpacing(value: number): number {
  let closest: number = SPACING_SCALE[0];
  let minDiff = Math.abs(value - closest);
  for (const s of SPACING_SCALE) {
    const diff = Math.abs(value - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

export function snapToGrid(value: number, colWidth: number): number {
  return Math.round(value / colWidth) * colWidth;
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function fixOverlappingSiblings(children: AIUIElement[]): AIUIElement[] {
  const result = [...children];
  const gap = 16;
  const maxIterations = result.length * result.length + 1;

  for (let iter = 0; iter < maxIterations; iter++) {
    let hasOverlap = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        if (rectsOverlap(a, b)) {
          const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (overlapY > 0) {
            result[j] = { ...b, y: a.y + a.height + gap };
            hasOverlap = true;
          }
        }
      }
    }
    if (!hasOverlap) break;
  }

  return result;
}

function clampToParentBounds(
  el: AIUIElement,
  parentWidth: number,
  parentHeight: number
): AIUIElement {
  let { x, y, width, height } = el;
  if (x + width > parentWidth) width = Math.max(20, parentWidth - x);
  if (y + height > parentHeight) height = Math.max(20, parentHeight - y);
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  return { ...el, x, y, width, height };
}

export function validateAndFixFrame(frame: AIUIFrame): AIUIFrame {
  const minW = frame.width < 500 ? 320 : frame.width < 900 ? 600 : MIN_WIDTH;
  const width = Math.max(minW, Math.min(MAX_WIDTH, frame.width));
  const height = Math.max(400, Math.min(2000, frame.height));
  const background = frame.background || "#ffffff";

  let children = frame.children.map((c) => validateAndFixElement(c, width, height));
  children = fixOverlappingSiblings(children);
  children = children.map((c) => clampToParentBounds(c, width, height));

  return {
    width,
    height,
    background,
    children,
  };
}

const MIN_DIMENSIONS: Partial<Record<AIUIElement["type"], { width?: number; height?: number }>> = {
  sidebar: { width: 220, height: 600 },
  topbar: { height: 56 },
  navbar: { height: 56 },
  card: { width: 240, height: 120 },
  hero: { width: 400, height: 180 },
  text: { width: 60, height: 16 },
  icon: { width: 20, height: 20 },
};

function validateAndFixElement(el: AIUIElement, parentWidth?: number, parentHeight?: number): AIUIElement {
  const colWidth = (parentWidth ?? DEFAULT_WIDTH) / GRID_COLUMNS;
  const mins = MIN_DIMENSIONS[el.type];

  const x = el.x >= 0 ? snapToGrid(el.x, colWidth) : 0;
  const y = el.y >= 0 ? snapToGrid(el.y, colWidth) : 0;
  const minW = mins?.width ?? 20;
  const minH = mins?.height ?? 20;
  const width = Math.max(minW, Math.min(el.width, parentWidth ?? DEFAULT_WIDTH));
  const height = Math.max(minH, Math.min(el.height, parentHeight ?? 900));

  const fixed: AIUIElement = {
    ...el,
    x,
    y,
    width,
    height,
    children: el.children?.map((c) => validateAndFixElement(c, width, height)),
  };

  if (fixed.styles) {
    if (fixed.styles.padding != null) fixed.styles.padding = clampToSpacing(fixed.styles.padding);
    if (fixed.styles.gap != null) fixed.styles.gap = clampToSpacing(fixed.styles.gap);
  }

  return fixed;
}
