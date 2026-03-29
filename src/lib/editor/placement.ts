import type { SceneNode } from "./types";

export function findNodeInTree(nodes: SceneNode[], id: string): SceneNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const c = findNodeInTree(n.children ?? [], id);
    if (c) return c;
  }
  return undefined;
}

/** Top-left of `node` in canvas (root) coordinates. */
export function canvasWorldTopLeft(node: SceneNode, rootNodes: SceneNode[]): { x: number; y: number } {
  let x = node.x;
  let y = node.y;
  let pid: string | undefined = node.parentId;
  while (pid) {
    const p = findNodeInTree(rootNodes, pid);
    if (!p) break;
    x += p.x;
    y += p.y;
    pid = p.parentId;
  }
  return { x, y };
}

function isFrameLikeContainer(n: SceneNode): boolean {
  return n.type === "FRAME" || n.type === "COMPONENT" || n.type === "COMPONENT_INSTANCE";
}

function isMasterComponent(n: SceneNode): boolean {
  return n.type === "COMPONENT" && !!(n.props as { isComponent?: boolean } | undefined)?.isComponent;
}

/**
 * Deepest FRAME / COMPONENT / COMPONENT_INSTANCE whose bounds contain the canvas point.
 */
export function findDeepestFrameLikeAtCanvasPoint(
  rootNodes: SceneNode[],
  px: number,
  py: number
): SceneNode | null {
  const candidates: { node: SceneNode; depth: number }[] = [];

  function walk(list: SceneNode[], depth: number) {
    for (const n of list) {
      if (isFrameLikeContainer(n)) {
        const { x: wx, y: wy } = canvasWorldTopLeft(n, rootNodes);
        const right = wx + n.width;
        const bottom = wy + n.height;
        if (px >= wx && px <= right && py >= wy && py <= bottom) {
          candidates.push({ node: n, depth });
        }
      }
      walk(n.children ?? [], depth + 1);
    }
  }

  walk(rootNodes, 0);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.depth - a.depth);
  return candidates[0]!.node;
}

/**
 * Where to attach a new node: prefer the frame the user double-clicked into, else the deepest frame under the point.
 * Returns parent id and position relative to that parent.
 */
export function resolvePlacementParent(
  rootNodes: SceneNode[],
  canvasX: number,
  canvasY: number,
  enteredFrameId: string | null | undefined
): { parentId: string; x: number; y: number } | null {
  if (enteredFrameId) {
    const entered = findNodeInTree(rootNodes, enteredFrameId);
    if (entered && isFrameLikeContainer(entered)) {
      const w = canvasWorldTopLeft(entered, rootNodes);
      return { parentId: entered.id, x: canvasX - w.x, y: canvasY - w.y };
    }
  }
  const parent = findDeepestFrameLikeAtCanvasPoint(rootNodes, canvasX, canvasY);
  if (!parent) return null;
  const w = canvasWorldTopLeft(parent, rootNodes);
  return { parentId: parent.id, x: canvasX - w.x, y: canvasY - w.y };
}

/**
 * For preview/export: root-level elements that sit visually inside a frame were often saved as canvas siblings.
 * Clone the tree and reparent those nodes into the innermost containing frame (same rules as placement).
 */
export function mergeRootOrphansIntoFrames(rootNodes: SceneNode[]): SceneNode[] {
  const clone = JSON.parse(JSON.stringify(rootNodes)) as SceneNode[];
  const root = clone;

  type Reparent = { orphanId: string; parentId: string };
  const reparents: Reparent[] = [];

  for (const o of root) {
    if (o.type === "FRAME") continue;
    if (isMasterComponent(o)) continue;
    if (o.width <= 0 || o.height <= 0) continue;

    const cx = o.x + o.width / 2;
    const cy = o.y + o.height / 2;
    const parent = findDeepestFrameLikeAtCanvasPoint(clone, cx, cy);
    if (!parent || parent.id === o.id) continue;

    reparents.push({ orphanId: o.id, parentId: parent.id });
  }

  for (const { orphanId, parentId } of reparents) {
    const idx = root.findIndex((n) => n.id === orphanId);
    if (idx === -1) continue;
    const orphan = root[idx]!;
    const parent = findNodeInTree(clone, parentId);
    if (!parent) continue;

    const w = canvasWorldTopLeft(parent, clone);
    orphan.x -= w.x;
    orphan.y -= w.y;
    orphan.parentId = parentId;
    root.splice(idx, 1);
    parent.children = [...(parent.children ?? []), orphan];
  }

  return clone;
}
