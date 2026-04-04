/**
 * Figma-like editor types - unified scene graph
 */

export type SceneNodeType =
  | "FRAME"
  | "GROUP"
  | "RECTANGLE"
  | "VECTOR"
  | "TEXT"
  | "COMPONENT"
  | "COMPONENT_INSTANCE"
  | "BUTTON"
  | "INPUT"
  | "IMAGE"
  | "ICON"
  | "CONTAINER"
  | "PANEL"
  | "LIST"
  | "CHECKBOX"
  | "SELECT"
  | "DIVIDER"
  | "SPACER"
  | "TOPBAR"
  | string; // Allow custom component types

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SolidPaint = { type: "SOLID"; color: string; opacity?: number };
export type GradientPaint = {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL";
  stops: { position: number; color: string }[];
  angle?: number;
};
export type ImagePaint = { type: "IMAGE"; src?: string; scaleMode?: "FILL" | "FIT" | "CROP" };
export type Paint = SolidPaint | GradientPaint | ImagePaint;

export type DropShadow = {
  type: "DROP_SHADOW";
  color: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread?: number;
};
export type InnerShadow = Omit<DropShadow, "type"> & { type: "INNER_SHADOW" };
export type BlurEffect = { type: "LAYER_BLUR"; radius: number };
export type Effect = DropShadow | InnerShadow | BlurEffect;

export interface SceneNode {
  id: string;
  type: SceneNodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  visible?: boolean;
  opacity?: number;
  children: SceneNode[];
  parentId?: string;
  // Component-specific props
  props?: Record<string, unknown>;
  // Layout (for frames/containers)
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  counterAxisSizingMode?: "FIXED" | "AUTO";
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  layoutAlign?: "STRETCH" | "INHERIT";
  /** Figma auto-layout child positioning: AUTO participates in flow, ABSOLUTE is positioned by x/y. */
  layoutPositioning?: "AUTO" | "ABSOLUTE";
  layoutGrow?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  layoutWrap?: "NO_WRAP" | "WRAP";
  overflow?: "VISIBLE" | "HIDDEN" | "SCROLL";
  // Fill & effects (canvas / scene)
  fills?: Paint[];
  effects?: Effect[];
  strokeWeight?: number;
  strokeColor?: string;
  strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
  strokes?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number }; weight?: number }>;
  // Component reference
  mainComponentId?: string;
  /** Figma-style layout constraints when parent frame resizes */
  constraints?: {
    horizontal: "LEFT" | "RIGHT" | "LEFT_RIGHT" | "CENTER" | "SCALE";
    vertical: "TOP" | "BOTTOM" | "TOP_BOTTOM" | "CENTER" | "SCALE";
  };
}

export interface SnapLine {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
  extent: [number, number];
}

export interface EditorMode {
  type: "SELECT" | "FRAME" | "HAND" | "COMMENT";
}
