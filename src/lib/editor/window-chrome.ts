import { nanoid } from "nanoid";
import type { SceneNode } from "./types";

/** Neutral workspace fill for new IDE / Desktop / App / Wide frames and draw-to-create. */
export const DEFAULT_FRAME_WORKSPACE_BG = "#e4e6eb";

/** Light system title bar (matches native app chrome). */
export const DEFAULT_CHROME_BAR_BG = "#ffffff";

/** Title text on light chrome — readable on white. */
export const DEFAULT_CHROME_TITLE_COLOR = "#3f3f46";

/** Title on dark custom chrome bars (when bar luminance is low). */
export const DEFAULT_CHROME_TITLE_ON_DARK_BG = "#e4e4e7";

export function luminanceFromHex(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Picks a readable default title color from the bar background when the text node has no color. */
export function defaultTitleColorForChromeBar(barBg: string, explicitTitleColor?: string): string {
  if (explicitTitleColor) return explicitTitleColor;
  const lum = luminanceFromHex(barBg);
  if (lum != null && lum < 0.42) return DEFAULT_CHROME_TITLE_ON_DARK_BG;
  return DEFAULT_CHROME_TITLE_COLOR;
}

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
        color: DEFAULT_CHROME_TITLE_COLOR,
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
      backgroundColor: DEFAULT_CHROME_BAR_BG,
      isTopBar: true,
      style: "macos",
      showTitle: true,
      showControls: true,
    },
  };
}
