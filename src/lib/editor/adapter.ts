/**
 * Convert new SceneNode format to legacy Frame/CanvasNode for export
 * Includes frame's direct children + root-level nodes that fall inside frame bounds
 */

import type { SceneNode } from "./types";
import type { Frame, CanvasNode } from "@/lib/types";

function sceneToCanvasNode(n: SceneNode, offsetX = 0, offsetY = 0): CanvasNode {
  return {
    id: n.id,
    type: mapType(n.type),
    props: (n.props ?? {}) as Record<string, string | number | boolean | undefined>,
    children: (n.children ?? []).map((c) => sceneToCanvasNode(c)),
    layout: {
      x: n.x - offsetX,
      y: n.y - offsetY,
      width: n.width,
      height: n.height,
      flexDirection: "column",
      gap: 8,
      padding: 16,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
  };
}

function isInsideFrame(node: SceneNode, frame: SceneNode): boolean {
  const nodeCenterX = node.x + node.width / 2;
  const nodeCenterY = node.y + node.height / 2;
  return (
    nodeCenterX >= frame.x &&
    nodeCenterX <= frame.x + frame.width &&
    nodeCenterY >= frame.y &&
    nodeCenterY <= frame.y + frame.height
  );
}

function mapType(t: string): CanvasNode["type"] {
  const map: Record<string, CanvasNode["type"]> = {
    FRAME: "frame",
    GROUP: "container",
    RECTANGLE: "container",
    TEXT: "text",
    BUTTON: "button",
    INPUT: "input",
    IMAGE: "image",
    ICON: "icon",
    CONTAINER: "container",
    PANEL: "panel",
    LIST: "list",
    CHECKBOX: "checkbox",
    SELECT: "select",
    DIVIDER: "divider",
    SPACER: "spacer",
  };
  return (map[t] ?? "container") as CanvasNode["type"];
}

export function sceneNodesToFrames(nodes: SceneNode[]): Frame[] {
  if (nodes.length === 0) {
    return [{
      id: "empty",
      name: "Empty",
      type: "desktop",
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      children: [],
    }];
  }

  const nonFrames = nodes.filter((n) => n.type !== "FRAME");

  return nodes.flatMap((n) => {
    if (n.type !== "FRAME") return [];
    const frameChildren = (n.children ?? []).map((c) => sceneToCanvasNode(c));
    const rootNodesInside = nonFrames.filter((node) => isInsideFrame(node, n));
    const rootAsChildren = rootNodesInside.map((node) =>
      sceneToCanvasNode(node, n.x, n.y)
    );
    const allChildren = [...frameChildren, ...rootAsChildren];
    return {
      id: n.id,
      name: n.name,
      type: "desktop" as const,
      width: n.width,
      height: n.height,
      x: n.x,
      y: n.y,
      children: allChildren,
    };
  });
}
