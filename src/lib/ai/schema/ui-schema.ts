// NOTE: This file is used by the AI layout generator + editor runtime.
// Some modules expect "AI*" types/constants (layout generation),
// while others use the more generic UI node types below.

export const DEFAULT_WIDTH = 1440;

// Common 4/8pt spacing ladder used by the rules engine.
export const SPACING_SCALE = [
  0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32,
  40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160,
  168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256,
  264, 272, 280, 288, 296, 304, 312, 320,
  336, 352, 368, 384, 400, 416, 432, 448, 464, 480, 496, 512,
  640, 768, 896, 1024, 1280, 1440,
] as const;

export type AISceneNodeType =
  | "frame"
  | "container"
  | "sidebar"
  | "topbar"
  | "navbar"
  | "hero"
  | "card"
  | "dashboard"
  | "form"
  | "table"
  | "button"
  | "text"
  | "input"
  | "image"
  | "icon";

export type SceneNode = {
  id: string;
  type: AISceneNodeType | string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  color?: string;
  text?: string;
  styles?: Record<string, unknown>;
  props?: Record<string, unknown>;
  children?: SceneNode[];
};

export type AIUIElement = SceneNode;

export interface AIUIFrame {
  width: number;
  height: number;
  background?: string;
  children: AIUIElement[];
}

export interface AIUILayout {
  frame: AIUIFrame;
  metadata?: Record<string, unknown>;
}

export type UINodeType =
  | "frame"
  | "group"
  | "rectangle"
  | "text"
  | "component"
  | "instance"
  | "line";

export interface UINode {
  id: string;
  type: UINodeType;
  name: string;
  visible: boolean;
  locked?: boolean;
  
  // Layout
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Styling
  fills?: Array<{
    type: 'solid' | 'gradient' | 'image';
    color?: string;
    opacity?: number;
  }>;
  strokes?: Array<{
    color: string;
    weight: number;
  }>;
  cornerRadius?: number;
  
  // Text specific
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  
  // Children
  children?: UINode[];
  
  // Constraints
  constraints?: {
    horizontal: 'left' | 'right' | 'center' | 'stretch';
    vertical: 'top' | 'bottom' | 'center' | 'stretch';
  };
}

export interface UILayout {
  nodes: UINode[];
  width: number;
  height: number;
  backgroundColor?: string;
}