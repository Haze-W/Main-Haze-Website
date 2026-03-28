import { nanoid } from "nanoid";
import type { SceneNode } from "./types";

/** Default window title bar prepended to new root frames (manual draw + export). */
export function buildWindowChromeTopBar(parentFrameId: string, parentWidth: number): SceneNode {
  const topBarId = nanoid();
  const d = 12;

  const rect = (name: string, x: number, y: number, bg: string): SceneNode => ({
    id: nanoid(),
    type: "RECTANGLE",
    name,
    x,
    y,
    width: d,
    height: d,
    parentId: topBarId,
    visible: true,
    locked: false,
    children: [],
    props: { backgroundColor: bg, borderRadius: 6 },
  });
  const titleId = nanoid();

  const children: SceneNode[] = [
    rect("Close", 12, 13, "#ef4444"),
    rect("Minimize", 30, 13, "#f59e0b"),
    rect("Maximize", 48, 13, "#22c55e"),
    {
      id: titleId,
      type: "TEXT",
      name: "Window Title",
      x: 0,
      y: 0,
      width: parentWidth,
      height: 40,
      parentId: topBarId,
      visible: true,
      locked: false,
      children: [],
      props: {
        content: "My Tauri App",
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        color: "#a1a1aa",
      },
    },
  ];

  return {
    id: topBarId,
    type: "TOPBAR",
    name: "Top Bar",
    x: 0,
    y: 0,
    width: parentWidth,
    height: 40,
    parentId: parentFrameId,
    visible: true,
    locked: false,
    children,
    props: {
      backgroundColor: "#1a1a1e",
      isTopBar: true,
      style: "macos",
      showTitle: true,
      showControls: true,
    },
  };
}
