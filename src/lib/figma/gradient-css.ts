import { getFillAlpha, isFillVisible } from "@/lib/figma/fill-visibility";
import { hexAlpha, paintToSolidColor, type Paint } from "@/lib/figma/types";

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function resolveGradientStops(fill: Paint): Array<{ hex: string; alpha: number; position: number }> | null {
  if (fill.stops && fill.stops.length >= 2) {
    return fill.stops
      .filter((s) => s.hex != null)
      .map((s) => ({ hex: s.hex!, alpha: s.alpha ?? 1, position: s.position ?? 0 }));
  }
  if (fill.gradientStops && fill.gradientStops.length >= 2) {
    return fill.gradientStops.map((gs) => ({
      hex: rgbToHex(gs.color.r, gs.color.g, gs.color.b),
      alpha: gs.color.a ?? 1,
      position: gs.position,
    }));
  }
  return null;
}

export function computeGradientAngleDeg(handles?: Array<{ x: number; y: number }>): number {
  if (!handles || handles.length < 2) return 180;
  const [start, end] = handles;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angleRad = Math.atan2(dy, dx);
  return Math.round((angleRad * 180) / Math.PI + 90);
}

function gradientTypeU(t?: string): string {
  return String(t ?? "").toUpperCase();
}

export function paintToLinearGradientCss(fill: Paint): string | undefined {
  const resolvedStops = resolveGradientStops(fill);
  if (!resolvedStops || resolvedStops.length < 2) return undefined;
  const angle = computeGradientAngleDeg(fill.gradientHandlePositions);
  const stopsStr = resolvedStops
    .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
    .join(", ");
  return `linear-gradient(${angle}deg, ${stopsStr})`;
}

export function paintToRadialGradientCss(fill: Paint): string | undefined {
  const resolvedStops = resolveGradientStops(fill);
  if (!resolvedStops || resolvedStops.length < 2) return undefined;
  const H = fill.gradientHandlePositions;
  let atX = 50;
  let atY = 50;
  let ew = 70;
  let eh = 70;
  if (H && H.length >= 2) {
    atX = Math.round(H[0].x * 10000) / 100;
    atY = Math.round(H[0].y * 10000) / 100;
    const rdx = H[1].x - H[0].x;
    const rdy = H[1].y - H[0].y;
    ew = Math.round(Math.sqrt(rdx * rdx + rdy * rdy) * 20000) / 100;
    eh = ew;
    if (H.length >= 3) {
      const rdx2 = H[2].x - H[0].x;
      const rdy2 = H[2].y - H[0].y;
      eh = Math.round(Math.sqrt(rdx2 * rdx2 + rdy2 * rdy2) * 20000) / 100;
    }
  }
  const stopsStr = resolvedStops
    .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
    .join(", ");
  return `radial-gradient(${ew}% ${eh}% at ${atX}% ${atY}%, ${stopsStr})`;
}

export function paintToConicGradientCss(fill: Paint): string | undefined {
  const resolvedStops = resolveGradientStops(fill);
  if (!resolvedStops || resolvedStops.length < 2) return undefined;
  const angle = computeGradientAngleDeg(fill.gradientHandlePositions);
  const stopsStr = resolvedStops
    .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
    .join(", ");
  return `conic-gradient(from ${angle}deg, ${stopsStr})`;
}

/** Map plugin / Figma gradient paint types to CSS `linear-gradient` / `radial-gradient` / `conic-gradient`. */
export function paintToGradientCss(fill: Paint): string | undefined {
  const t = gradientTypeU(fill.type);
  if (t === "GRADIENT_LINEAR" || (t.includes("GRADIENT") && t.includes("LINEAR"))) {
    return paintToLinearGradientCss(fill);
  }
  if (t === "GRADIENT_RADIAL" || (t.includes("GRADIENT") && t.includes("RADIAL"))) {
    return paintToRadialGradientCss(fill);
  }
  if (
    t === "GRADIENT_ANGULAR" ||
    t === "GRADIENT_DIAMOND" ||
    (t.includes("GRADIENT") && (t.includes("ANGULAR") || t.includes("DIAMOND")))
  ) {
    return paintToConicGradientCss(fill);
  }
  if (t.includes("GRADIENT")) {
    return paintToLinearGradientCss(fill) ?? paintToRadialGradientCss(fill);
  }
  return undefined;
}

/** Solid color or gradient as one CSS image / color (not for IMAGE fills). */
export function paintToCssPaint(paint: Paint): string | undefined {
  if (!isFillVisible(paint)) return undefined;
  const t = gradientTypeU(paint.type);
  if (!paint.type || t === "SOLID" || t === "") {
    return paintToSolidColor(paint) ?? (paint.hex ? hexAlpha(paint.hex, getFillAlpha(paint)) : undefined);
  }
  if (t.includes("GRADIENT") || t.startsWith("GRADIENT_")) {
    return paintToGradientCss(paint);
  }
  return undefined;
}

export type FigmaBorderSideStyles = {
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderImage?: string;
  borderImageSlice?: number;
};

/**
 * Largest used stroke width in px.
 * Uniform stroke: uses `strokeWeight`. If any per-side value is a number, only those numbers count —
 * missing sides are 0 (Figma does not fall back to `strokeWeight` per edge when individual weights are in use).
 */
export function maxFigmaStrokeWidthPx(
  strokeWeight: number,
  perSide: { top?: number | null; right?: number | null; bottom?: number | null; left?: number | null } | undefined
): number {
  const base = strokeWeight || 0;
  const top = perSide?.top;
  const right = perSide?.right;
  const bottom = perSide?.bottom;
  const left = perSide?.left;
  const hasPerSide =
    typeof top === "number" ||
    typeof right === "number" ||
    typeof bottom === "number" ||
    typeof left === "number";
  if (!hasPerSide) return base;
  const wTop = typeof top === "number" ? top : 0;
  const wRight = typeof right === "number" ? right : 0;
  const wBottom = typeof bottom === "number" ? bottom : 0;
  const wLeft = typeof left === "number" ? left : 0;
  return Math.max(wTop, wRight, wBottom, wLeft, 0);
}

export function getFigmaBorderSideStyles(
  strokes: Paint[],
  strokeWeight: number,
  perSide: { top?: number | null; right?: number | null; bottom?: number | null; left?: number | null } | undefined,
  strokeEnabled: boolean
): FigmaBorderSideStyles | undefined {
  if (!strokeEnabled || !strokes || strokes.length === 0) return undefined;
  const stroke = strokes[0];
  const paintCss = paintToCssPaint(stroke);
  if (!paintCss) return undefined;

  const top = perSide?.top;
  const right = perSide?.right;
  const bottom = perSide?.bottom;
  const left = perSide?.left;
  const hasPerSide =
    typeof top === "number" ||
    typeof right === "number" ||
    typeof bottom === "number" ||
    typeof left === "number";
  const anyPerSideWeight =
    (typeof top === "number" && top > 0) ||
    (typeof right === "number" && right > 0) ||
    (typeof bottom === "number" && bottom > 0) ||
    (typeof left === "number" && left > 0);

  const isGradient = paintCss.includes("gradient(");

  if (!hasPerSide) {
    if (!strokeWeight) return undefined;
    const w = strokeWeight;
    if (isGradient) {
      return {
        border: `${w}px solid transparent`,
        borderImage: `${paintCss} 1`,
        borderImageSlice: 1,
      };
    }
    return { border: `${w}px solid ${paintCss}` };
  }
  // At least one per-side field is numeric: only those edges get a width; null/undefined = 0 (not strokeWeight).
  if (!anyPerSideWeight) return undefined;
  const wTop = typeof top === "number" ? top : 0;
  const wRight = typeof right === "number" ? right : 0;
  const wBottom = typeof bottom === "number" ? bottom : 0;
  const wLeft = typeof left === "number" ? left : 0;

  if (isGradient) {
    const w = Math.max(wTop, wRight, wBottom, wLeft, 1);
    if (wTop <= 0 && wRight <= 0 && wBottom <= 0 && wLeft <= 0) return undefined;
    return {
      border: `${w}px solid transparent`,
      borderImage: `${paintCss} 1`,
      borderImageSlice: 1,
    };
  }

  // Explicit `none` on zero sides so a later `border-style` (or UA defaults) cannot draw phantom edges.
  const out: FigmaBorderSideStyles = {};
  out.borderTop = wTop > 0 ? `${wTop}px solid ${paintCss}` : "none";
  out.borderRight = wRight > 0 ? `${wRight}px solid ${paintCss}` : "none";
  out.borderBottom = wBottom > 0 ? `${wBottom}px solid ${paintCss}` : "none";
  out.borderLeft = wLeft > 0 ? `${wLeft}px solid ${paintCss}` : "none";
  return out;
}

export function getBackgroundFromFills(
  fills: Paint[],
  fillEnabled: boolean,
  isTextNode: boolean
): string | undefined {
  if (isTextNode) return undefined;
  if (!fillEnabled || !fills || fills.length === 0) return undefined;
  for (const fill of fills) {
    if (!isFillVisible(fill)) continue;
    if (!fill.type || fill.type === "SOLID") {
      const solid = paintToSolidColor(fill);
      if (solid) return solid;
      if (fill.hex) return hexAlpha(fill.hex, getFillAlpha(fill));
    }
    const g = paintToGradientCss(fill);
    if (g) return g;
  }
  return undefined;
}
