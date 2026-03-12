/**
 * AI UI Schema - Structured editable UI tree for the website builder
 * Maps to SceneNode format used by the editor
 */

export const SPACING_SCALE = [4, 8, 16, 24, 32] as const;
export const DEFAULT_WIDTH = 1440;
export const MIN_WIDTH = 1200;
export const MAX_WIDTH = 1920;
export const GRID_COLUMNS = 12;

export type UIComponentType =
  | "navbar"
  | "sidebar"
  | "hero"
  | "dashboard"
  | "card"
  | "table"
  | "form"
  | "pricing"
  | "analytics"
  | "modal"
  | "login"
  | "gallery"
  | "settings"
  | "menu"
  | "topbar"
  | "frame"
  | "text"
  | "button"
  | "input"
  | "image"
  | "rectangle"
  | "container"
  | "divider"
  | "spacer"
  | "icon";

export interface AIStyleProps {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: "left" | "center" | "right";
  borderRadius?: number;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  gap?: number;
  borderColor?: string;
  borderWidth?: number;
}

export interface AIUIElement {
  id: string;
  type: UIComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color?: string;
  backgroundColor?: string;
  styles?: AIStyleProps;
  children?: AIUIElement[];
  props?: Record<string, unknown>;
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
}

export interface AIUIFrame {
  width: number;
  height: number;
  background: string;
  children: AIUIElement[];
}

export interface AIUILayout {
  frame: AIUIFrame;
  metadata?: {
    prompt?: string;
    generatedAt?: string;
    version?: string;
  };
}
