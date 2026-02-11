export type WireframeMode = "ide" | "wide" | "square" | "custom";

export interface CanvasDimensions {
  width: number;
  height: number;
}

export const WIREFRAME_PRESETS: Record<WireframeMode, CanvasDimensions> = {
  ide: { width: 1200, height: 800 },
  wide: { width: 1600, height: 900 },
  square: { width: 1024, height: 1024 },
  custom: { width: 1200, height: 800 },
};

export type FrameType =
  | "desktop"
  | "dialog"
  | "sidebar"
  | "overlay"
  | "custom";

export interface Frame {
  id: string;
  name: string;
  type: FrameType;
  width: number;
  height: number;
  x: number;
  y: number;
  children: CanvasNode[];
}

export type ComponentType =
  | "frame"
  | "container"
  | "flex"
  | "grid"
  | "text"
  | "heading"
  | "button"
  | "input"
  | "image"
  | "list"
  | "panel"
  | "icon"
  | "checkbox"
  | "select"
  | "divider"
  | "spacer"
  | "textarea"
  | "dropdown"
  | "slider"
  | "progress"
  | "table"
  | "card"
  | "titlebar"
  | "menubar"
  | "modal"
  | "toast";

export interface ComponentProps {
  [key: string]: string | number | boolean | undefined;
}

export interface CanvasNode {
  id: string;
  type: ComponentType;
  props: ComponentProps;
  children: CanvasNode[];
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
    flexDirection?: "row" | "column";
    gap?: number;
    padding?: number;
    alignItems?: string;
    justifyContent?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  frames: Frame[];
  wireframeMode: WireframeMode;
  customDimensions?: CanvasDimensions;
  updatedAt: string;
  createdAt: string;
}
