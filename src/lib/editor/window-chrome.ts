import { nanoid } from "nanoid";
import type { SceneNode } from "./types";

/** Native-style window controls: Windows vs macOS. */
export type SystemChromeStyle = "windows" | "macos";

/**
 * Default title-bar control style for the current device.
 * SSR / non-browser: falls back to Windows (common server default).
 */
export function getDefaultSystemChromeStyle(): SystemChromeStyle {
  if (typeof navigator === "undefined") return "windows";
  const ua = navigator.userAgent || "";
  const uad = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = (uad?.platform ?? navigator.platform ?? "").toLowerCase();
  const isMobileUa = /iPhone|iPad|iPod|Android/i.test(ua);
  if (platform.includes("win")) return "windows";
  if (!isMobileUa && platform.includes("mac")) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macos";
  return "windows";
}

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
  const chromeStyle = getDefaultSystemChromeStyle();
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

  const titleNode: SceneNode = {
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
      textAlign: chromeStyle === "windows" ? "left" : "center",
      color: DEFAULT_CHROME_TITLE_COLOR,
    },
  };

  const children: SceneNode[] =
    chromeStyle === "macos"
      ? [
          rect("Close", 12, 13, "#ef4444"),
          rect("Minimize", 30, 13, "#f59e0b"),
          rect("Maximize", 48, 13, "#22c55e"),
          titleNode,
        ]
      : [titleNode];

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
      style: chromeStyle,
      showTitle: true,
      showControls: true,
    },
  };
}
