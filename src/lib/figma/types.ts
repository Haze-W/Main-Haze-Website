export interface Paint {
  hex: string;
  alpha: number;
  opacity?: number;
  transparent?: boolean;
  visible?: boolean;
  type?: "SOLID" | "IMAGE" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | string;
  imageRef?: string;
  imageBytes?: string;
  imageData?: string;
  src?: string;
  scaleMode?: string;
  stops?: Array<{ position: number; hex: string; alpha: number }>;
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

export interface TextSegment {
  characters: string;
  fontFamily: string | null;
  fontStyle: string | null;
  fontSize: number;
  fills: Paint[];
  textDecoration?: string;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number | string;
}

export interface TextStyle {
  content: string;
  fontFamily: string | null;
  fontStyle: string | null;
  fontSize: number | null;
  fontWeight: number | null;
  lineHeight: string | number;
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
  clipsContent: boolean;
  overflowDirection?: string;
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  textHasNoBackgroundFill?: boolean;
  imageData?: string;
  src?: string;
  svgData?: string;
  cornerRadius: number | null;
  topLeftRadius: number | null;
  topRightRadius: number | null;
  bottomLeftRadius: number | null;
  bottomRightRadius: number | null;
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
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
  text?: TextStyle;
  children?: FigmaNode[];
}

export interface RenderPayload {
  _render: true;
  version: string;
  exportedAt: string;
  pageName: string;
  preview: string | null;
  frame: FigmaNode;
  assets?: Record<string, string>;
  /** Some plugins use "images" instead of "assets" */
  images?: Record<string, string>;
}

/** Convert Figma {hex, alpha} paint to CSS rgba string */
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Type guard for validating a pasted object as RenderPayload (v2.1) */
export function isRenderPayload(data: unknown): data is RenderPayload {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d._render !== true || !d.frame) return false;
  if (typeof d.frame !== "object" || d.frame === null) return false;
  return true;
}
