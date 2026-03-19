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
  let closest = SPACING_SCALE[0];
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

export function validateAndFixFrame(frame: AIUIFrame): AIUIFrame {
  const minW = frame.width < 500 ? 320 : frame.width < 900 ? 600 : MIN_WIDTH;
  const width = Math.max(minW, Math.min(MAX_WIDTH, frame.width));
  const height = Math.max(400, Math.min(2000, frame.height));
  const background = frame.background || "#ffffff";

  return {
    width,
    height,
    background,
    children: frame.children.map(validateAndFixElement),
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
