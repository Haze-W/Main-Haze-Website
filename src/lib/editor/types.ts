/**
 * Figma-like editor types - unified scene graph
 */

export type SceneNodeType =
  | "FRAME"
  | "GROUP"
  | "RECTANGLE"
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
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  layoutWrap?: "NO_WRAP" | "WRAP";
  overflow?: "VISIBLE" | "HIDDEN" | "SCROLL";
  // Fill
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number } }>;
  strokes?: Array<{ type: string; color?: { r: number; g: number; b: number; a: number }; weight?: number }>;
  // Component reference
  mainComponentId?: string;
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
