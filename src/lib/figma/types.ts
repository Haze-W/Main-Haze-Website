export interface Paint {
  hex?: string;
  alpha?: number;
  opacity?: number;
  /** Figma native format: r,g,b in 0-1, a optional */
  color?: { r: number; g: number; b: number; a?: number };
  transparent?: boolean;
  visible?: boolean;
  type?: "SOLID" | "IMAGE" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | string;
  imageRef?: string;
  imageHash?: string;
  imageBytes?: string;
  imageData?: string;
  src?: string;
  scaleMode?: string;
  stops?: Array<{ position: number; hex: string; alpha: number }>;
  gradientStops?: Array<{ color: { r: number; g: number; b: number; a?: number }; position: number }>;
  gradientHandlePositions?: Array<{ x: number; y: number }>;
}

export interface Effect {
  type: string;
  color?: string;
  alpha?: number;
  x?: number;
  y?: number;
  blur?: number;
  spread?: number;
}

/** Figma `lineHeight` as exported by the plugin (mirrors Plugin API). `AUTO` maps to CSS `line-height: normal` in Haze. */
export type FigmaLineHeight =
  | { unit: "PIXELS"; value: number }
  | { unit: "PERCENT"; value: number }
  | { unit: "AUTO" };

export interface TextSegment {
  characters: string;
  /** Figma UTF-16 indices into the full text when present (end exclusive). */
  start?: number;
  end?: number;
  fontFamily: string | null;
  fontStyle: string | null;
  fontSize: number;
  fills: Paint[];
  textDecoration?: string;
  /** Numeric weight when provided; otherwise infer from `fontStyle` (e.g. SemiBold) */
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number | string | FigmaLineHeight;
}

export interface TextStyle {
  content: string;
  fontFamily: string | null;
  fontStyle: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  lineHeight: string | number | FigmaLineHeight;
  letterSpacing: number;
  textAlign: string | null;
  textDecoration: string | null;
  fills: Paint[];
  segments?: TextSegment[];
  noOverflow?: boolean;
  overflowVisible?: boolean;
  textShouldNotClip?: boolean;
  textTruncation?: string;
  textAutoResize?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  maxLines?: number | null;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  blendMode: string;
  /** 2×2 transform matrix (a,b,c,d). Translation is represented by x/y. */
  transform2d?: { a: number; b: number; c: number; d: number } | null;
  clipsContent: boolean;
  overflowDirection?: string;
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  textHasNoBackgroundFill?: boolean;
  imageData?: string;
  src?: string;
  /** Optional PNG raster (base64 or data URL). Prefer over svgData for stable HTML layout. */
  pngData?: string;
  /** Figma image hash — lookup in merged `images` / assets after paste */
  imageHash?: string;
  svgData?: string;
  /** Plugin alias for svgData when blobs are deduped to `assets` */
  svgSrc?: string;
  cornerRadius: number | null;
  topLeftRadius: number | null;
  topRightRadius: number | null;
  bottomLeftRadius: number | null;
  bottomRightRadius: number | null;
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  strokeTopWeight?: number | null;
  strokeRightWeight?: number | null;
  strokeBottomWeight?: number | null;
  strokeLeftWeight?: number | null;
  strokeAlign: string;
  effects: Effect[];
  layoutMode: string | null;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
  primaryAxisAlignItems: string | null;
  counterAxisAlignItems: string | null;
  /** Auto-layout: Figma `layoutGrow` (0 = fixed, 1 = fill) */
  layoutGrow?: number;
  /** Auto-layout: STRETCH vs INHERIT */
  layoutAlign?: "STRETCH" | "MIN" | "CENTER" | "MAX" | "BASELINE" | string;
  /** Child sizing along primary axis */
  primaryAxisSizingMode?: "FIXED" | "AUTO" | string;
  /** Child sizing along counter axis */
  counterAxisSizingMode?: "FIXED" | "AUTO" | string;
  /** Absolute vs auto-layout positioning */
  layoutPositioning?: "AUTO" | "ABSOLUTE" | string;
  layoutWrap?: "NO_WRAP" | "WRAP" | string;
  minWidth?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  text?: TextStyle;
  vectorDetail?: {
    vectorPaths?: Array<{ data: string; windingRule?: string }>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeCap?: string;
    strokeJoin?: string;
    strokeMiterLimit?: number;
    dashPattern?: number[];
  };
  children?: FigmaNode[];
}

/**
 * Clipboard payload from Figma → Haze plugins.
 * Plugins may set `_render` and/or `_haze` (same meaning), or `source: "figma-haze-plugin"`.
 */
export interface RenderPayload {
  /** Legacy / primary marker */
  _render?: true;
  /** Alternative marker (Figma To Haze and related plugins) */
  _haze?: true;
  /** Identifies official plugin payloads when boolean markers are omitted (still accept markers). */
  source?: string;
  /** Informational; any string is accepted (do not reject unknown versions). */
  version?: string;
  exportedAt?: string;
  pageName?: string;
  preview?: string | null;
  frame: FigmaNode;
  assets?: Record<string, string | { data?: string; base64?: string; svg?: string; png?: string }>;
  /** Deduped bitmaps by Figma `imageHash` — merged into asset lookup */
  images?: Record<string, string | { data?: string; base64?: string; svg?: string; png?: string }>;
  /** Often `nodeId_svg` strings — merged last */
  exports?: Record<string, string | { data?: string; base64?: string; format?: string; svg?: string; png?: string }>;
}

/** Convert Figma {hex, alpha} paint to CSS rgba string */
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Map Figma font style names (SemiBold, Medium, …) to CSS font-weight when numeric weight is missing */
export function fontStyleToFontWeight(style: string | null | undefined): number | undefined {
  if (!style) return undefined;
  const s = style.toLowerCase().replace(/\s+/g, "");
  if (s.includes("thin")) return 100;
  if (s.includes("extralight") || s === "ultralight") return 200;
  if (s.includes("light") && !s.includes("semi")) return 300;
  if (s.includes("regular") || s === "normal" || s === "book") return 400;
  if (s.includes("medium")) return 500;
  if (s.includes("semibold") || s.includes("demibold")) return 600;
  if (s.includes("bold") && !s.includes("semi")) return 700;
  if (s.includes("extrabold") || s === "ultrabold") return 800;
  if (s.includes("black") || s.includes("heavy")) return 900;
  if (s.includes("italic")) return undefined;
  return undefined;
}

/** Convert SOLID paint to CSS color - supports hex or Figma color {r,g,b,a} */
export function paintToSolidColor(fill: Paint): string | undefined {
  const alpha = fill.alpha ?? fill.opacity ?? 1;
  if (fill.hex) return hexAlpha(fill.hex, alpha);
  const c = fill.color as { r?: number; g?: number; b?: number; a?: number } | undefined;
  if (c && typeof c.r === "number" && typeof c.g === "number" && typeof c.b === "number") {
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);
    const a = typeof c.a === "number" ? c.a : alpha;
    return `rgba(${r},${g},${b},${a})`;
  }
  return undefined;
}

/** True if payload uses a supported clipboard marker (any one is enough). */
export function isHazeRenderMarker(d: Record<string, unknown>): boolean {
  return (
    d._render === true ||
    d._haze === true ||
    d.source === "figma-haze-plugin"
  );
}

/** Type guard for validating a pasted object as RenderPayload. Minified JSON is fine. `version` is not required. */
export function isRenderPayload(data: unknown): data is RenderPayload {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (!isHazeRenderMarker(d) || !d.frame) return false;
  if (typeof d.frame !== "object" || d.frame === null) return false;
  return true;
}
