"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { SceneNode } from "./types";

/** Safe deep clone for history - avoids circular refs and non-serializable values (DOM, Window, etc) */
function serializeNodesForHistory(nodes: SceneNode[]): SceneNode[] {
  const seen = new WeakSet<object>();
  const replacer = (_key: string, value: unknown): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value as object)) return undefined;
    if (typeof window !== "undefined" && (value === window || value === document)) return undefined;
    if (typeof value === "function") return undefined;
    if (typeof Node !== "undefined" && value instanceof Node) return undefined;
    if (typeof Event !== "undefined" && value instanceof Event) return undefined;
    seen.add(value as object);
    return value;
  };
  try {
    return JSON.parse(JSON.stringify(nodes, replacer)) as SceneNode[];
  } catch {
    return nodes.map((n) => {
      const props: Record<string, unknown> = {};
      if (n.props && typeof n.props === "object" && !(n.props instanceof Node)) {
        for (const [k, v] of Object.entries(n.props)) {
          if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") props[k] = v;
        }
      }
      return {
        ...n,
        children: serializeNodesForHistory(n.children ?? []),
        props,
      };
    });
  }
}

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export type Tool = "SELECT" | "FRAME" | "HAND";

interface EditorState {
  // Scene
  nodes: SceneNode[];
  // Viewport
  viewport: Viewport;
  // Selection
  selectedIds: Set<string>;
  // Tool
  tool: Tool;
  // Interaction state
  isPanning: boolean;
  isSpacePressed: boolean;
  isMarqueeSelecting: boolean;
  marqueeRect: { x: number; y: number; width: number; height: number } | null;
  isDragging: boolean;
  isResizing: boolean;
  isCreatingFrame: boolean;
  createFrameStart: { x: number; y: number } | null;
  // History
  history: { nodes: SceneNode[] }[];
  historyIndex: number;
  // UI
  mode: "design" | "code" | "settings" | "preview";
  // Canvas appearance
  canvasBg: string;
  showGrid: boolean;
  gridType: "dots" | "lines" | "cross" | "none";
  // Theme
  theme: "light" | "dark";
  // Snap
  snapLines: Array<{ id: string; type: "h" | "v"; pos: number }>;
  // Figma deep selection: which frame is "entered" for child editing
  enteredFrameId: string | null;
  // Last mouse position in canvas coords (for paste/drop placement)
  lastCanvasPoint: { x: number; y: number } | null;
}

type EditorActions = {
  setNodes: (nodes: SceneNode[]) => void;
  addNode: (node: Omit<SceneNode, "id" | "children">, parentId?: string) => void;
  updateNode: (id: string, updates: Partial<SceneNode>) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => void;
  pasteNodes: (nodes: SceneNode[]) => void;
  moveNodes: (ids: string[], dx: number, dy: number) => void;
  resizeNode: (id: string, handle: string, dx: number, dy: number) => void;
  setViewport: (v: Partial<Viewport>) => void;
  setSelectedIds: (ids: string[] | Set<string>) => void;
  toggleSelection: (id: string) => void;
  setTool: (tool: Tool) => void;
  setIsPanning: (v: boolean) => void;
  setSpacePressed: (v: boolean) => void;
  setMarquee: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  setIsDragging: (v: boolean) => void;
  setIsResizing: (v: boolean) => void;
  startCreateFrame: (x: number, y: number) => void;
  updateCreateFrame: (x: number, y: number) => void;
  finishCreateFrame: (x: number, y: number) => void;
  cancelCreateFrame: () => void;
  setSnapLines: (lines: Array<{ id: string; type: "h" | "v"; pos: number }>) => void;
  setMode: (mode: "design" | "code" | "settings" | "preview") => void;
  setCanvasBg: (v: string) => void;
  setShowGrid: (v: boolean) => void;
  setGridType: (v: "dots" | "lines" | "cross" | "none") => void;
  setTheme: (v: "light" | "dark") => void;
  enterFrame: (id: string) => void;
  exitFrame: () => void;
  setLastCanvasPoint: (pt: { x: number; y: number } | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  // Layer ordering
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;
  // Group / ungroup
  groupNodes: (ids: string[]) => void;
  ungroupNodes: (ids: string[]) => void;
  // Helpers
  getNode: (id: string) => SceneNode | undefined;
  getNodeBounds: (id: string) => { x: number; y: number; width: number; height: number } | null;
  findNodesInRect: (rect: { x: number; y: number; width: number; height: number }) => string[];
};

function createNode(partial: Partial<SceneNode>): SceneNode {
  return {
    id: nanoid(),
    type: "FRAME",
    name: "Frame",
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    children: [],
    visible: true,
    locked: false,
    ...partial,
  };
}

function collectAllNodes(nodes: SceneNode[]): SceneNode[] {
  const result: SceneNode[] = [];
  function walk(n: SceneNode) {
    result.push(n);
    n.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

function findNodeById(nodes: SceneNode[], id: string): SceneNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNodeById(n.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

function updateNodeInTree(nodes: SceneNode[], id: string, updates: Partial<SceneNode>): SceneNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...updates };
    return { ...n, children: updateNodeInTree(n.children ?? [], id, updates) };
  });
}

function removeNodesFromTree(nodes: SceneNode[], ids: Set<string>): SceneNode[] {
  return nodes
    .filter((n) => !ids.has(n.id))
    .map((n) => ({ ...n, children: removeNodesFromTree(n.children ?? [], ids) }));
}

function cloneNode(n: SceneNode): SceneNode {
  return {
    ...JSON.parse(JSON.stringify(n)),
    id: nanoid(),
    children: (n.children ?? []).map(cloneNode),
  };
}

const initialNodes: SceneNode[] = [];

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  nodes: initialNodes,
  viewport: { panX: 0, panY: 0, zoom: 1 },
  selectedIds: new Set(),
  tool: "SELECT",
  isPanning: false,
  isSpacePressed: false,
  isMarqueeSelecting: false,
  marqueeRect: null,
  isDragging: false,
  isResizing: false,
  isCreatingFrame: false,
  createFrameStart: null,
  history: [{ nodes: JSON.parse(JSON.stringify(initialNodes)) }],
  historyIndex: 0,
  mode: "design",
  canvasBg: "#2a2a2e",
  showGrid: true,
  gridType: "dots",
  theme: "light",
  snapLines: [],
  enteredFrameId: null,
  lastCanvasPoint: null,

  setNodes: (nodes) => set({ nodes }),
  addNode: (partial, parentId) => {
    const node = createNode(partial as Partial<SceneNode>);
    if (parentId) {
      node.parentId = parentId;
      set((s) => ({
        nodes: updateNodeInTree(s.nodes, parentId, {
          children: [...(findNodeById(s.nodes, parentId)?.children ?? []), node],
        }),
        selectedIds: new Set([node.id]),
      }));
    } else {
      set((s) => ({
        nodes: [...s.nodes, node],
        selectedIds: new Set([node.id]),
      }));
    }
    get().pushHistory();
  },
  updateNode: (id, updates) => {
    set((s) => ({ nodes: updateNodeInTree(s.nodes, id, updates) }));
  },
  deleteNodes: (ids) => {
    const idSet = new Set(ids);
    set((s) => ({
      nodes: removeNodesFromTree(s.nodes, idSet),
      selectedIds: new Set([...s.selectedIds].filter((x) => !idSet.has(x))),
    }));
    get().pushHistory();
  },
  duplicateNodes: (ids) => {
    const clones: SceneNode[] = [];
    for (const id of ids) {
      const n = findNodeById(get().nodes, id);
      if (n) {
        const c = cloneNode(n);
        c.x += 20;
        c.y += 20;
        clones.push(c);
      }
    }
    set((s) => ({
      nodes: [...s.nodes, ...clones],
      selectedIds: new Set(clones.map((c) => c.id)),
    }));
    get().pushHistory();
  },
  pasteNodes: (nodesToPaste) => {
    if (!nodesToPaste || nodesToPaste.length === 0) return;
    const pt = get().lastCanvasPoint;
    const offsetX = pt ? pt.x : 20;
    const offsetY = pt ? pt.y : 20;
    const firstX = nodesToPaste[0].x;
    const firstY = nodesToPaste[0].y;
    const clones = nodesToPaste.map((n) => {
      const c = cloneNode(n);
      c.x += offsetX - firstX;
      c.y += offsetY - firstY;
      return c;
    });
    set((s) => ({
      nodes: [...s.nodes, ...clones],
      selectedIds: new Set(clones.map((c) => c.id)),
    }));
    get().pushHistory();
  },
  moveNodes: (ids, dx, dy) => {
    const idSet = new Set(ids);
    function moveInTree(
      nodes: SceneNode[],
      s: Set<string>,
      dx: number,
      dy: number
    ): SceneNode[] {
      return nodes.map((n) => {
        if (s.has(n.id)) return { ...n, x: n.x + dx, y: n.y + dy };
        return { ...n, children: moveInTree(n.children ?? [], s, dx, dy) };
      });
    }
    set((s) => ({
      nodes: moveInTree(s.nodes, idSet, dx, dy),
    }));
  },
  resizeNode: (id, handle, dx, dy) => {
    const n = findNodeById(get().nodes, id);
    if (!n) return;
    let { x, y, width, height } = n;
    if (handle.includes("e")) width = Math.max(20, width + dx);
    if (handle.includes("w")) {
      const newWidth = Math.max(20, width - dx);
      x += width - newWidth;
      width = newWidth;
    }
    if (handle.includes("s")) height = Math.max(20, height + dy);
    if (handle.includes("n")) {
      const newHeight = Math.max(20, height - dy);
      y += height - newHeight;
      height = newHeight;
    }
    get().updateNode(id, { x, y, width, height });
  },
  setViewport: (v) =>
    set((s) => ({
      viewport: {
        ...s.viewport,
        ...v,
        zoom: v.zoom !== undefined ? Math.max(0.05, Math.min(10, v.zoom)) : s.viewport.zoom,
      },
    })),
  setSelectedIds: (ids) =>
    set({ selectedIds: Array.isArray(ids) ? new Set(ids) : ids }),
  toggleSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  setTool: (tool) => set({ tool }),
  setIsPanning: (v) => set({ isPanning: v }),
  setSpacePressed: (v) => set({ isSpacePressed: v }),
  setMarquee: (marqueeRect) => set({ marqueeRect, isMarqueeSelecting: !!marqueeRect }),
  setIsDragging: (v) => set({ isDragging: v }),
  setIsResizing: (v) => set({ isResizing: v }),
  startCreateFrame: (x, y) =>
    set({ isCreatingFrame: true, createFrameStart: { x, y } }),
  updateCreateFrame: (x, y) => {
    const start = get().createFrameStart;
    if (!start) return;
    const nx = Math.min(start.x, x);
    const ny = Math.min(start.y, y);
    const nw = Math.abs(x - start.x);
    const nh = Math.abs(y - start.y);
    set((s) => ({ nodes: [...s.nodes] })); // Trigger re-render; frame rect computed in component
  },
  finishCreateFrame: (x, y) => {
    const start = get().createFrameStart;
    if (!start) {
      set({ isCreatingFrame: false, createFrameStart: null });
      return;
    }
    const width = Math.max(50, Math.abs(x - start.x));
    const height = Math.max(50, Math.abs(y - start.y));
    const fx = Math.min(start.x, x);
    const fy = Math.min(start.y, y);
    get().addNode(
      {
        type: "FRAME",
        name: "Frame",
        x: fx,
        y: fy,
        width,
        height,
        overflow: "HIDDEN",
      },
      undefined
    );
    set({ isCreatingFrame: false, createFrameStart: null });
  },
  cancelCreateFrame: () => set({ isCreatingFrame: false, createFrameStart: null }),
  setSnapLines: (snapLines) => set({ snapLines }),
  setMode: (mode) => set({ mode }),
  setCanvasBg: (canvasBg) => set({ canvasBg }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setGridType: (gridType) => set({ gridType }),
  setTheme: (theme) => set({ theme }),
  enterFrame: (id) => set({ enteredFrameId: id }),
  exitFrame: () => set({ enteredFrameId: null }),
  setLastCanvasPoint: (pt) => set({ lastCanvasPoint: pt }),
  pushHistory: () => {
    set((s) => {
      const next = { nodes: serializeNodesForHistory(s.nodes) };
      const past = s.history.slice(0, s.historyIndex + 1);
      return {
        history: [...past, next],
        historyIndex: past.length,
      };
    });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set({ nodes: serializeNodesForHistory(prev.nodes), historyIndex: historyIndex - 1 });
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set({ nodes: serializeNodesForHistory(next.nodes), historyIndex: historyIndex + 1 });
  },
  bringToFront: (ids) => {
    const idSet = new Set(ids);
    function reorderBringFront(nodes: SceneNode[]): SceneNode[] {
      // Reorder at this level if any selected nodes are here
      const hasAtThisLevel = nodes.some((n) => idSet.has(n.id));
      let result = nodes.map((n) => ({
        ...n,
        children: n.children ? reorderBringFront(n.children) : n.children,
      }));
      if (hasAtThisLevel) {
        const selected = result.filter((n) => idSet.has(n.id));
        const rest = result.filter((n) => !idSet.has(n.id));
        result = [...rest, ...selected];
      }
      return result;
    }
    set((s) => ({ nodes: reorderBringFront(s.nodes) }));
    get().pushHistory();
  },
  sendToBack: (ids) => {
    const idSet = new Set(ids);
    function reorderSendBack(nodes: SceneNode[]): SceneNode[] {
      const hasAtThisLevel = nodes.some((n) => idSet.has(n.id));
      let result = nodes.map((n) => ({
        ...n,
        children: n.children ? reorderSendBack(n.children) : n.children,
      }));
      if (hasAtThisLevel) {
        const selected = result.filter((n) => idSet.has(n.id));
        const rest = result.filter((n) => !idSet.has(n.id));
        result = [...selected, ...rest];
      }
      return result;
    }
    set((s) => ({ nodes: reorderSendBack(s.nodes) }));
    get().pushHistory();
  },
  bringForward: (ids) => {
    function reorderForward(nodes: SceneNode[]): SceneNode[] {
      const result = nodes.map((n) => ({
        ...n,
        children: n.children ? reorderForward(n.children) : n.children,
      }));
      for (let i = result.length - 2; i >= 0; i--) {
        if (ids.includes(result[i].id) && !ids.includes(result[i + 1].id)) {
          [result[i], result[i + 1]] = [result[i + 1], result[i]];
        }
      }
      return result;
    }
    set((s) => ({ nodes: reorderForward(s.nodes) }));
    get().pushHistory();
  },
  sendBackward: (ids) => {
    function reorderBackward(nodes: SceneNode[]): SceneNode[] {
      const result = nodes.map((n) => ({
        ...n,
        children: n.children ? reorderBackward(n.children) : n.children,
      }));
      for (let i = 1; i < result.length; i++) {
        if (ids.includes(result[i].id) && !ids.includes(result[i - 1].id)) {
          [result[i], result[i - 1]] = [result[i - 1], result[i]];
        }
      }
      return result;
    }
    set((s) => ({ nodes: reorderBackward(s.nodes) }));
    get().pushHistory();
  },
  groupNodes: (ids) => {
    if (ids.length < 2) return;
    const idSet = new Set(ids);
    const selected = get().nodes.filter((n) => idSet.has(n.id));
    if (selected.length === 0) return;
    const minX = Math.min(...selected.map((n) => n.x));
    const minY = Math.min(...selected.map((n) => n.y));
    const maxX = Math.max(...selected.map((n) => n.x + n.width));
    const maxY = Math.max(...selected.map((n) => n.y + n.height));
    const group = createNode({
      type: "FRAME",
      name: "Group",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      children: selected.map((n) => ({ ...n, x: n.x - minX, y: n.y - minY, parentId: undefined })),
    });
    set((s) => ({
      nodes: [...s.nodes.filter((n) => !idSet.has(n.id)), group],
      selectedIds: new Set([group.id]),
    }));
    get().pushHistory();
  },
  ungroupNodes: (ids) => {
    set((s) => {
      let nodes = [...s.nodes];
      const newIds: string[] = [];
      for (const id of ids) {
        const idx = nodes.findIndex((n) => n.id === id);
        if (idx === -1) continue;
        const group = nodes[idx];
        if (!group.children || group.children.length === 0) continue;
        const ungrouped = group.children.map((c) => ({
          ...c,
          x: c.x + group.x,
          y: c.y + group.y,
          parentId: undefined,
        }));
        nodes = [...nodes.slice(0, idx), ...ungrouped, ...nodes.slice(idx + 1)];
        newIds.push(...ungrouped.map((n) => n.id));
      }
      return { nodes, selectedIds: new Set(newIds) };
    });
    get().pushHistory();
  },
  getNode: (id) => findNodeById(get().nodes, id),
  getNodeBounds: (id) => {
    const n = findNodeById(get().nodes, id);
    return n ? { x: n.x, y: n.y, width: n.width, height: n.height } : null;
  },
  findNodesInRect: (rect) => {
    const all = collectAllNodes(get().nodes);
    return all
      .filter((n) => {
        const nx = n.x;
        const ny = n.y;
        const nw = n.width;
        const nh = n.height;
        return !(
          nx + nw < rect.x ||
          ny + nh < rect.y ||
          nx > rect.x + rect.width ||
          ny > rect.y + rect.height
        );
      })
      .map((n) => n.id);
  },
}));
