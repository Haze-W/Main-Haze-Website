"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  CanvasNode,
  ComponentType,
  Frame,
  FrameType,
  WireframeMode,
  ComponentProps,
} from "./types";
import { WIREFRAME_PRESETS } from "./types";

interface HistoryState {
  past: { frames: Frame[] }[];
  future: { frames: Frame[] }[];
}

interface EditorState {
  frames: Frame[];
  activeFrameId: string | null;
  selectedIds: string[];
  wireframeMode: WireframeMode;
  customWidth: number;
  customHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  mode: "design" | "code" | "settings";
  history: HistoryState;
}

interface EditorActions {
  setFrames: (frames: Frame[]) => void;
  setActiveFrame: (id: string | null) => void;
  addFrame: (type?: FrameType) => void;
  updateFrame: (id: string, updates: Partial<Frame>) => void;
  duplicateFrame: (id: string) => void;
  deleteFrame: (id: string) => void;
  addNode: (node: Omit<CanvasNode, "id" | "children">, parentId?: string) => void;
  updateNode: (id: string, props: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  nudgeNode: (id: string, dx: number, dy: number) => void;
  setWireframeMode: (mode: WireframeMode) => void;
  setCustomDimensions: (w: number, h: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setIsPanning: (v: boolean) => void;
  setMode: (mode: "design" | "code" | "settings") => void;
  undo: () => void;
  redo: () => void;
}

const createEmptyNode = (
  type: ComponentType,
  props: ComponentProps = {},
  getState?: () => EditorState
): CanvasNode => {
  const state = getState?.();
  const dims =
    state?.wireframeMode === "custom"
      ? { width: state.customWidth, height: state.customHeight }
      : WIREFRAME_PRESETS[state?.wireframeMode ?? "ide"];
  const iconSize = type === "icon" ? (props.iconName ? 40 : 40) : 0;
  return {
    id: nanoid(),
    type,
    props: { ...getDefaultProps(type), ...props },
    children: [],
    layout: {
      x: type === "frame" ? 0 : 20,
      y: type === "frame" ? 0 : 20,
      width: type === "frame" ? dims.width : type === "button" ? 120 : type === "icon" ? iconSize : 200,
      height: type === "frame" ? dims.height : type === "button" ? 36 : type === "icon" ? iconSize : 32,
      flexDirection: "column",
      gap: 8,
      padding: type === "frame" ? 0 : 16,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
  };
};

function getDefaultProps(type: ComponentType): ComponentProps {
  switch (type) {
    case "text":
      return { content: "Text", fontSize: 14 };
    case "heading":
      return { content: "Heading", level: 1 };
    case "button":
      return { label: "Button", variant: "primary" };
    case "input":
      return { placeholder: "Placeholder..." };
    case "frame":
    case "container":
      return {};
    case "image":
      return { src: "", alt: "Image" };
    case "panel":
      return { title: "Panel" };
    case "icon":
      return { iconName: "star", size: 24, color: "currentColor", strokeWidth: 2 };
    default:
      return {};
  }
}

function createDefaultFrame(type: FrameType = "desktop"): Frame {
  const dims = WIREFRAME_PRESETS.ide;
  return {
    id: nanoid(),
    name: type === "desktop" ? "Main Window" : type === "dialog" ? "Dialog" : "Frame",
    type,
    width: dims.width,
    height: dims.height,
    x: 40,
    y: 40,
    children: [],
  };
}

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  frames: (() => {
    const f = createDefaultFrame();
    return [f];
  })(),
  activeFrameId: null as string | null,
  selectedIds: [],
  wireframeMode: "ide",
  customWidth: 1200,
  customHeight: 800,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isPanning: false,
  mode: "design",
  history: { past: [], future: [] },

  setFrames: (frames) => set({ frames }),

  setActiveFrame: (id) => set({ activeFrameId: id }),

  addFrame: (type = "desktop") => {
    const frame = createDefaultFrame(type);
    set((state) => {
      const frames = [...state.frames, frame];
      return {
        frames,
        activeFrameId: frame.id,
        history: {
          past: [...state.history.past, { frames: state.frames }],
          future: [],
        },
      };
    });
  },

  updateFrame: (id, updates) => {
    set((state) => ({
      frames: state.frames.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  duplicateFrame: (id) => {
    const frame = get().frames.find((f) => f.id === id);
    if (!frame) return;
    const copy: Frame = {
      ...frame,
      id: nanoid(),
      name: `${frame.name} (copy)`,
      children: JSON.parse(JSON.stringify(frame.children)),
    };
    set((state) => ({
      frames: [...state.frames, copy],
      activeFrameId: copy.id,
    }));
  },

  deleteFrame: (id) => {
    set((state) => {
      const frames = state.frames.filter((f) => f.id !== id);
      const nextActive =
        state.activeFrameId === id
          ? frames[0]?.id ?? null
          : state.activeFrameId;
      return {
        frames: frames.length > 0 ? frames : [createDefaultFrame()],
        activeFrameId: nextActive ?? frames[0]?.id ?? null,
      };
    });
  },

  addNode: (node, parentId) => {
    const base = createEmptyNode(
      node.type as ComponentType,
      node.props ?? {},
      get
    );
    const newNode = { ...base, ...node, id: nanoid(), children: [] } as CanvasNode;

    set((state) => {
      const activeId = state.activeFrameId ?? state.frames[0]?.id;
      if (!activeId) return state;

      const updateFrameChildren = (frame: Frame): Frame => {
        if (frame.id !== activeId) return frame;
        let newChildren: CanvasNode[];
        if (parentId) {
          const insertInto = (nodes: CanvasNode[]): CanvasNode[] =>
            nodes.map((n) =>
              n.id === parentId
                ? { ...n, children: [...n.children, newNode] }
                : { ...n, children: insertInto(n.children) }
            );
          newChildren = insertInto(frame.children);
        } else {
          newChildren = [...frame.children, newNode];
        }
        return { ...frame, children: newChildren };
      };

      return {
        frames: state.frames.map(updateFrameChildren),
        selectedIds: [newNode.id],
        history: {
          past: [...state.history.past, { frames: state.frames }],
          future: [],
        },
      };
    });
  },

  updateNode: (id, updates) => {
    set((state) => {
      const updateIn = (nodes: CanvasNode[]): CanvasNode[] =>
        nodes.map((n) =>
          n.id === id ? { ...n, ...updates } : { ...n, children: updateIn(n.children) }
        );
      return {
        frames: state.frames.map((f) => ({
          ...f,
          children: updateIn(f.children),
        })),
      };
    });
  },

  deleteNode: (id) => {
    set((state) => {
      const removeFrom = (nodes: CanvasNode[]): CanvasNode[] =>
        nodes
          .filter((n) => n.id !== id)
          .map((n) => ({ ...n, children: removeFrom(n.children) }));
      const activeId = state.activeFrameId ?? state.frames[0]?.id;
      return {
        frames: state.frames.map((f) =>
          f.id === activeId ? { ...f, children: removeFrom(f.children) } : f
        ),
        selectedIds: state.selectedIds.filter((s) => s !== id),
      };
    });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  nudgeNode: (id, dx, dy) => {
    const { frames, activeFrameId } = get();
    const frame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
    const findN = (nodes: CanvasNode[], nid: string): CanvasNode | null => {
      for (const n of nodes) {
        if (n.id === nid) return n;
        const f = findN(n.children, nid);
        if (f) return f;
      }
      return null;
    };
    const node = findN(frame?.children ?? [], id);
    if (node?.layout) {
      get().updateNode(id, {
        layout: {
          ...node.layout,
          x: node.layout.x + dx,
          y: node.layout.y + dy,
        },
      });
    }
  },

  setWireframeMode: (mode) => set({ wireframeMode: mode }),

  setCustomDimensions: (w, h) =>
    set({ customWidth: w, customHeight: h, wireframeMode: "custom" }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),

  setPan: (pan) => set({ pan }),

  setIsPanning: (v) => set({ isPanning: v }),

  setMode: (mode) => set({ mode }),

  undo: () => {
    const { history, frames } = get();
    if (history.past.length === 0) return;
    const prev = history.past[history.past.length - 1];
    set({
      frames: prev.frames,
      history: {
        past: history.past.slice(0, -1),
        future: [{ frames }, ...history.future],
      },
    });
  },

  redo: () => {
    const { history, frames } = get();
    if (history.future.length === 0) return;
    const next = history.future[0];
    set({
      frames: next.frames,
      history: {
        past: [...history.past, { frames }],
        future: history.future.slice(1),
      },
    });
  },
}));
