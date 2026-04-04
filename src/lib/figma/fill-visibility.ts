import type { Paint } from "./types";

export function getFillAlpha(fill: Paint): number {
  if (fill.alpha != null) return fill.alpha;
  if (fill.opacity != null) return fill.opacity;
  const c = fill.color as { a?: number } | undefined;
  if (c && typeof c.a === "number") return c.a;
  return 1;
}

export function isFillVisible(fill: Paint | undefined): boolean {
  if (!fill) return false;
  if (fill.transparent === true) return false;
  if (fill.visible === false) return false;
  if (getFillAlpha(fill) === 0) return false;
  return true;
}

/** Serialized `fills` are top-first (plugin reverses Figma’s bottom→top). */
export function indexOfFirstVisibleFill(fills: Paint[] | undefined): number {
  if (!fills || fills.length === 0) return -1;
  for (let i = 0; i < fills.length; i++) {
    if (isFillVisible(fills[i])) return i;
  }
  return -1;
}

export function firstVisibleFill(fills: Paint[] | undefined): Paint | undefined {
  const i = indexOfFirstVisibleFill(fills);
  return i >= 0 ? fills![i] : undefined;
}

/** Match plugin + Figma variants (`IMAGE`, `image`). */
export function isImagePaintType(type: string | undefined): boolean {
  return String(type ?? "").toUpperCase() === "IMAGE";
}

/** Only the topmost visible paint may drive raster `<img>` / image hash export. */
export function firstVisibleFillIsImage(fills: Paint[] | undefined): boolean {
  const f = firstVisibleFill(fills);
  return isImagePaintType(f?.type);
}
