/**
 * Export SceneNodes to HTML - 1:1 with Render editor display.
 * Preserves Figma styling: colors, images, vectors, text.
 * Excludes TOPBAR nodes (custom top bar removed for now).
 */

import type { SceneNode } from "./types";
import { hexAlpha, paintToSolidColor } from "@/lib/figma/types";
import type { Paint, Effect, TextSegment } from "@/lib/figma/types";

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function resolveGradientStops(fill: Paint): Array<{ hex: string; alpha: number; position: number }> | null {
  if (fill.stops && fill.stops.length >= 2) {
    return fill.stops.filter((s) => s.hex != null).map((s) => ({ hex: s.hex!, alpha: s.alpha ?? 1, position: s.position ?? 0 }));
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

function computeGradientAngle(handles?: Array<{ x: number; y: number }>): number {
  if (!handles || handles.length < 2) return 180;
  const [start, end] = handles;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angleRad = Math.atan2(dy, dx);
  return Math.round((angleRad * 180) / Math.PI + 90);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getFillAlpha(fill: Paint): number {
  if (fill.alpha != null) return fill.alpha;
  if (fill.opacity != null) return fill.opacity;
  const c = fill.color as { a?: number } | undefined;
  if (c && typeof c.a === "number") return c.a;
  return 1;
}

function isFillVisible(fill: Paint): boolean {
  if (fill.transparent === true) return false;
  if (fill.visible === false) return false;
  if (getFillAlpha(fill) === 0) return false;
  return true;
}

function getBackground(fills: Paint[], fillEnabled: boolean, isTextNode: boolean): string | undefined {
  if (isTextNode) return undefined;
  if (!fillEnabled || !fills || fills.length === 0) return undefined;
  for (const fill of fills) {
    if (!isFillVisible(fill)) continue;
    if (!fill.type || fill.type === "SOLID") {
      const solid = paintToSolidColor(fill);
      if (solid) return solid;
      if (fill.hex) return hexAlpha(fill.hex, getFillAlpha(fill));
    }
    if (fill.type === "GRADIENT_LINEAR") {
      const resolvedStops = resolveGradientStops(fill);
      if (resolvedStops && resolvedStops.length >= 2) {
        const angle = computeGradientAngle(fill.gradientHandlePositions);
        const stopsStr = resolvedStops
          .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
          .join(", ");
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      }
    }
  }
  return undefined;
}

function getBorder(strokes: Paint[], strokeWeight: number, strokeEnabled: boolean): string | undefined {
  if (!strokeEnabled || !strokes || strokes.length === 0 || strokeWeight === 0) return undefined;
  const stroke = strokes[0];
  if (!isFillVisible(stroke)) return undefined;
  const color = paintToSolidColor(stroke) ?? (stroke.hex ? hexAlpha(stroke.hex, getFillAlpha(stroke)) : undefined);
  if (!color) return undefined;
  return `${strokeWeight}px solid ${color}`;
}

function getBorderRadius(f: { cornerRadius: number | null; topLeftRadius?: number | null; topRightRadius?: number | null; bottomLeftRadius?: number | null; bottomRightRadius?: number | null }, isEllipse: boolean): string | undefined {
  if (isEllipse) return "50%";
  const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius, cornerRadius } = f;
  if (topLeftRadius != null || topRightRadius != null || bottomRightRadius != null || bottomLeftRadius != null) {
    const tl = topLeftRadius ?? 0, tr = topRightRadius ?? 0, br = bottomRightRadius ?? 0, bl = bottomLeftRadius ?? 0;
    if (tl === 0 && tr === 0 && br === 0 && bl === 0) return undefined;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  if (cornerRadius != null && cornerRadius > 0) return `${cornerRadius}px`;
  return undefined;
}

function getBoxShadow(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const shadows = effects
    .filter((e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
    .map((e) => {
      const x = e.x ?? 0, y = e.y ?? 0, blur = e.blur ?? 0, spread = e.spread ?? 0;
      const color = e.color && e.alpha != null ? hexAlpha(e.color, e.alpha) : "rgba(0,0,0,0.25)";
      return `${e.type === "INNER_SHADOW" ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    });
  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

function getFilter(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const blurs = effects.filter((e) => e.type === "LAYER_BLUR");
  if (blurs.length === 0) return undefined;
  return blurs.map((e) => `blur(${e.blur ?? 0}px)`).join(" ");
}

function getTextColor(props: Record<string, unknown>): string {
  const textFills = props._textFills as Paint[] | undefined;
  if (textFills && textFills.length > 0) {
    const tf = textFills[0];
    if (isFillVisible(tf)) {
      const color = paintToSolidColor(tf) ?? (tf.hex ? hexAlpha(tf.hex, getFillAlpha(tf)) : undefined);
      if (color) return color;
    }
  }
  return "#000000";
}

function textSegmentsToHtml(props: Record<string, unknown>): string {
  const segments = props._textSegments as TextSegment[] | undefined;
  const content = (props.content as string) ?? "";
  if (!segments || segments.length <= 1) return escapeHtml(content);
  return segments.map((seg) => {
    const styles: string[] = [];
    if (seg.fontFamily) styles.push(`font-family:"${seg.fontFamily}",sans-serif`);
    if (seg.fontSize) styles.push(`font-size:${seg.fontSize}px`);
    if (seg.fontWeight) styles.push(`font-weight:${seg.fontWeight}`);
    if (seg.fontStyle?.toLowerCase() === "italic") styles.push("font-style:italic");
    if (seg.textDecoration && seg.textDecoration.toLowerCase() !== "none") styles.push(`text-decoration:${seg.textDecoration}`);
    if (seg.letterSpacing != null && seg.letterSpacing !== 0) styles.push(`letter-spacing:${seg.letterSpacing}px`);
    if (seg.fills && seg.fills.length > 0) {
      const sf = seg.fills[0];
      if (isFillVisible(sf)) {
        const color = paintToSolidColor(sf) ?? (sf.hex ? hexAlpha(sf.hex, getFillAlpha(sf)) : undefined);
        if (color) styles.push(`color:${color}`);
      }
    }
    const styleStr = styles.length > 0 ? ` style="${styles.join(";")}"` : "";
    return `<span${styleStr}>${escapeHtml(seg.characters)}</span>`;
  }).join("");
}

function mapAlign(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  switch (val) {
    case "MIN": return "flex-start";
    case "MAX": return "flex-end";
    case "CENTER": return "center";
    case "SPACE_BETWEEN": return "space-between";
    default: return undefined;
  }
}

interface FigmaProps {
  originalType: string;
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  strokeAlign: string;
  effects: Effect[];
  cornerRadius: number | null;
  topLeftRadius: number | null;
  topRightRadius: number | null;
  bottomLeftRadius: number | null;
  bottomRightRadius: number | null;
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  textHasNoBackgroundFill?: boolean;
  clipsContent?: boolean;
}

function nodeToHtml(node: SceneNode, parentLayout: "NONE" | "HORIZONTAL" | "VERTICAL" = "NONE", indent = 0): string {
  if (node.visible === false) return "";

  const pad = "  ".repeat(indent);
  const figma = node.props?._figma as FigmaProps | undefined;
  const isEllipse = !!node.props?._ellipse;
  const isText = figma?.originalType === "TEXT";
  const hasImageFill = !!node.props?._hasImageFill;
  const isTextNode = isText || figma?.textHasNoBackgroundFill === true;
  const VECTOR_TYPES = ["VECTOR", "STAR", "POLYGON", "LINE", "BOOLEAN_OPERATION", "ELLIPSE"];
  const isVector = figma ? VECTOR_TYPES.includes(figma.originalType) : false;
  const isVectorOrImageWithData = hasImageFill || (isVector && node.props?._imageData);

  const usesFlex = parentLayout === "HORIZONTAL" || parentLayout === "VERTICAL";
  const layout = node.layoutMode ?? "NONE";
  const childLayout = layout !== "NONE" ? layout : "NONE";

  const strokeWeight = figma?.strokeWeight ?? 0;
  const hasStroke = figma?.strokeEnabled !== false && (figma?.strokes?.length ?? 0) > 0 && strokeWeight > 0;
  const isLine = figma?.originalType === "LINE";
  const minDim = hasStroke && isLine ? Math.max(1, strokeWeight) : 0;
  const w = minDim ? Math.max(node.width, minDim) : node.width;
  const h = minDim ? Math.max(node.height, minDim) : node.height;

  const style: Record<string, string> = {
    position: usesFlex ? "relative" : "absolute",
    width: `${w}px`,
    height: `${h}px`,
    boxSizing: "border-box",
  };
  if (!usesFlex) {
    style.left = `${node.x}px`;
    style.top = `${node.y}px`;
  }

  if (node.opacity != null && node.opacity < 1) style.opacity = String(node.opacity);
  if (node.rotation) style.transform = `rotate(${node.rotation}deg)`;

  if (figma) {
    const fillEnabled = figma.fillEnabled !== false;
    if (!hasImageFill && !isTextNode) {
      const bg = getBackground(figma.fills ?? [], fillEnabled, false);
      if (bg) style.background = bg;
    }
    if (!isVector && !hasImageFill) {
      const strokeEnabled = figma.strokeEnabled !== false;
      const border = getBorder(figma.strokes, figma.strokeWeight, strokeEnabled);
      if (border) style.border = border;
    }
    if (!isVectorOrImageWithData) {
      const shadow = getBoxShadow(figma.effects);
      if (shadow) style.boxShadow = shadow;
    }
    const br = getBorderRadius(figma, isEllipse);
    if (br) style.borderRadius = br;
    const filter = getFilter(figma.effects);
    if (filter) style.filter = filter;
    if (node.overflow === "HIDDEN") style.overflow = "hidden";
    else if (node.overflow === "SCROLL") style.overflow = "auto";
    else if (figma.clipsContent && !isVectorOrImageWithData) style.overflow = "hidden";
    else if (isVectorOrImageWithData) style.overflow = "visible";
  }

  if (layout === "HORIZONTAL" || layout === "VERTICAL") {
    style.display = "flex";
    style.flexDirection = layout === "HORIZONTAL" ? "row" : "column";
    if (node.itemSpacing) style.gap = `${node.itemSpacing}px`;
    if (node.paddingTop) style.paddingTop = `${node.paddingTop}px`;
    if (node.paddingRight) style.paddingRight = `${node.paddingRight}px`;
    if (node.paddingBottom) style.paddingBottom = `${node.paddingBottom}px`;
    if (node.paddingLeft) style.paddingLeft = `${node.paddingLeft}px`;
    const justify = mapAlign(node.primaryAxisAlignItems);
    if (justify) style.justifyContent = justify;
    const align = mapAlign(node.counterAxisAlignItems);
    if (align) style.alignItems = align;
  }

  const styleStr = Object.entries(style)
    .filter(([, v]) => v != null && v !== undefined)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`)
    .join(";");

  // TEXT NODE
  if (isText) {
    const props = node.props ?? {};
    const textStyle: Record<string, string> = { ...style, color: getTextColor(props), whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "0", padding: "0" };
    delete textStyle.background;
    delete textStyle.backgroundColor;
    if (props.fontFamily) textStyle.fontFamily = `"${props.fontFamily as string}",sans-serif`;
    if (props.fontSize) textStyle.fontSize = `${props.fontSize}px`;
    if (props.fontWeight) textStyle.fontWeight = String(props.fontWeight);
    if (props.textAlign) textStyle.textAlign = props.textAlign as string;
    if (props.letterSpacing != null) textStyle.letterSpacing = `${props.letterSpacing}px`;
    if (props.textDecoration) textStyle.textDecoration = props.textDecoration as string;
    if (props.fontStyle === "italic") textStyle.fontStyle = "italic";
    const lh = props.lineHeight;
    if (lh != null && lh !== "auto") textStyle.lineHeight = typeof lh === "number" ? `${lh}px` : String(lh);
    const textStyleStr = Object.entries(textStyle).filter(([, v]) => v != null).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(";");
    return `${pad}<div style="${escapeHtml(textStyleStr)}">${textSegmentsToHtml(props)}</div>`;
  }

  // IMAGE / VECTOR NODE
  if (hasImageFill || (isVector && node.props?._imageData)) {
    const imageData = node.props?._imageData as string | undefined;
    if (imageData) {
      const containerStyle = { ...style, overflow: "visible", border: "none", boxShadow: "none" };
      const containerStr = Object.entries(containerStyle).filter(([, v]) => v != null).map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(";");
      const objectFit = imageData.includes("image/svg+xml") ? "fill" : "fill";
      return `${pad}<div style="${escapeHtml(containerStr)}"><img src="${escapeHtml(imageData)}" alt="${escapeHtml(node.name)}" style="width:100%;height:100%;object-fit:${objectFit};display:block;stroke:none;outline:none;border:none" /></div>`;
    }
  }

  // FRAME / SHAPE / GROUP
  const childHtml = (node.children ?? [])
    .filter((c) => c.type !== "TOPBAR")
    .map((c) => nodeToHtml(c, childLayout, indent + 1))
    .filter(Boolean)
    .join("\n");

  return `${pad}<div style="${escapeHtml(styleStr)}">\n${childHtml || ""}\n${pad}</div>`;
}

/**
 * Generate full HTML document from scene nodes.
 * Uses the first FRAME as the root; excludes TOPBAR nodes.
 * No custom title bar - just the frame content at exact size.
 */
export function sceneNodesToHtml(nodes: SceneNode[], appName = "Render App"): string {
  const frame = nodes.find((n) => n.type === "FRAME") ?? nodes[0];
  if (!frame) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(appName)}</title><link rel="stylesheet" href="styles.css"></head><body><div style="width:800px;height:600px;background:#1e1e1e"></div></body></html>`;
  }

  const figma = frame.props?._figma as FigmaProps | undefined;
  let rootBg = "#1e1e1e";
  if (figma) {
    const fillEnabled = figma.fillEnabled !== false;
    const bg = getBackground(figma.fills ?? [], fillEnabled, false);
    if (bg) rootBg = bg;
  }

  const rootStyle = `width:100%;height:100%;overflow:hidden;background:${rootBg};position:relative;box-sizing:border-box`;
  const childrenHtml = (frame.children ?? [])
    .filter((c) => c.type !== "TOPBAR")
    .map((c) => nodeToHtml(c, (frame.layoutMode ?? "NONE") !== "NONE" ? (frame.layoutMode as "HORIZONTAL" | "VERTICAL") : "NONE", 2))
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app-root" style="${rootStyle}">
${childrenHtml}
  </div>
</body>
</html>
`;
}

/**
 * Get frame dimensions from scene nodes (for window sizing).
 */
export function getFrameDimensions(nodes: SceneNode[]): { width: number; height: number } {
  const frame = nodes.find((n) => n.type === "FRAME") ?? nodes[0];
  if (!frame) return { width: 800, height: 600 };
  return { width: frame.width, height: frame.height };
}

/**
 * Generate minimal CSS for exported app - no centering, fills viewport.
 */
export function sceneExportCss(): string {
  return `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d0f12;
  color: #e6edf3;
}

.app-root {
  width: 100%;
  height: 100%;
}
`;
}
