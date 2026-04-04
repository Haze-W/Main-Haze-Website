import type { CanvasNode, Frame } from "./types";
import { getIconSvg } from "./icon-svg";
import type { TitleBarStyle } from "./editor/export-settings";
import { getDefaultSystemChromeStyle } from "./editor/window-chrome";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nodeToHtml(node: CanvasNode, indent = 0): string {
  const pad = "  ".repeat(indent);
  const layout = node.layout ?? { x: 0, y: 0, width: 100, height: 40 };
  const style: Record<string, string> = {
    position: "absolute",
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    width: `${layout.width}px`,
    height: `${layout.height}px`,
  };

  if (node.type === "frame" || node.type === "container") {
    const flexDir = (layout.flexDirection as string) ?? "column";
    const gap = (layout.gap as number) ?? 8;
    const padding = (layout.padding as number) ?? 16;
    style.display = "flex";
    style.flexDirection = flexDir;
    style.gap = `${gap}px`;
    style.padding = `${padding}px`;
    style.alignItems = (layout.alignItems as string) ?? "flex-start";
    style.justifyContent = (layout.justifyContent as string) ?? "flex-start";
  }

  const styleStr = Object.entries(style)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
    .join("; ");

  const props = node.props ?? {};
  const color = props.color as string | undefined;
  const backgroundColor = props.backgroundColor as string | undefined;
  const extraStyle = [
    color ? `color:${color}` : "",
    backgroundColor ? `background-color:${backgroundColor}` : "",
  ].filter(Boolean).join("; ");
  const fullStyle = extraStyle ? `${styleStr}; ${extraStyle}` : styleStr;

  switch (node.type) {
    case "frame":
    case "container": {
      const frameStyle = extraStyle ? `${styleStr}; ${extraStyle}` : styleStr;
      const childHtml = node.children.map((c) => nodeToHtml(c, indent + 1)).join("\n");
      return `${pad}<div class="frame" style="${escapeHtml(frameStyle)}">\n${childHtml}\n${pad}</div>`;
    }
    case "text":
      return `${pad}<span class="text" style="${escapeHtml(fullStyle)}">${escapeHtml((props.content as string) ?? "Text")}</span>`;
    case "button":
      return `${pad}<button class="btn" style="${escapeHtml(fullStyle)}">${escapeHtml((props.label as string) ?? "Button")}</button>`;
    case "input":
      return `${pad}<input type="text" class="input" placeholder="${escapeHtml((props.placeholder as string) ?? "")}" style="${escapeHtml(styleStr)}" />`;
    case "panel":
      const panelChildren = node.children.map((c) => nodeToHtml(c, indent + 2)).join("\n");
      return `${pad}<div class="panel" style="${escapeHtml(styleStr)}">\n${pad}  <div class="panel-header">${escapeHtml((props.title as string) ?? "Panel")}</div>\n${pad}  <div class="panel-body">\n${panelChildren}\n${pad}  </div>\n${pad}</div>`;
    case "image":
      return `${pad}<img class="img" src="${escapeHtml((props.src as string) ?? "")}" alt="${escapeHtml((props.alt as string) ?? "")}" style="${escapeHtml(fullStyle)}" />`;
    case "icon": {
      const iconName = (props.iconName as string) ?? "star";
      const iconSize = (props.size as number) ?? 24;
      const iconColor = (props.color as string) ?? "currentColor";
      const strokeWidth = (props.strokeWidth as number) ?? 2;
      const svg = getIconSvg(iconName, iconSize, iconColor, strokeWidth);
      return `${pad}<span class="icon-wrapper" style="${escapeHtml(styleStr)}">${svg}</span>`;
    }
    default:
      return `${pad}<div class="placeholder" style="${escapeHtml(styleStr)}">${node.type}</div>`;
  }
}

export interface GenerateHtmlOptions {
  appName?: string;
  titleBarStyle?: TitleBarStyle;
}

function generateTitleBar(appName: string, style: TitleBarStyle): string {
  const buttons =
    style === "macos"
      ? `<div class="titlebar-btns macos">
  <span class="tb-btn close"></span>
  <span class="tb-btn min"></span>
  <span class="tb-btn max"></span>
</div>`
      : `<div class="titlebar-btns windows">
  <button class="tb-btn win-min">−</button>
  <button class="tb-btn win-max">□</button>
  <button class="tb-btn win-close">×</button>
</div>`;
  return `  <div class="titlebar titlebar-${style}">
    ${style === "macos" ? buttons : ""}
    <span class="titlebar-title">${escapeHtml(appName)}</span>
    ${style === "windows" ? buttons : ""}
  </div>`;
}

export function generateHtml(
  nodes: CanvasNode[],
  frame?: Frame,
  options?: GenerateHtmlOptions
): string {
  const appName = options?.appName ?? "my-tauri-app";
  const titleBarStyle = options?.titleBarStyle ?? getDefaultSystemChromeStyle();
  const titleBar = generateTitleBar(appName, titleBarStyle);

  const inner = nodes.map((n) => nodeToHtml(n, 2)).join("\n");
  const rootStyle = frame
    ? `width:${frame.width}px;height:${frame.height}px;overflow:hidden;flex:1;`
    : "flex:1;";
  const appRoot = frame
    ? `  <div class="app-root" style="${rootStyle}">\n${inner}\n  </div>`
    : inner;
  const body = `  <div class="app-layout">
${titleBar}
${appRoot}
  </div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${body}
</body>
</html>
`;
}

export function generateCss(titleBarStyle: TitleBarStyle = getDefaultSystemChromeStyle()): string {
  const titleBarCss =
    titleBarStyle === "macos"
      ? `
.app-layout { display: flex; flex-direction: column; height: 100vh; }
.titlebar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 38px;
  padding: 0 16px;
  background: #2d2d2d;
  -webkit-app-region: drag;
  user-select: none;
}
.titlebar-btns.macos {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}
.tb-btn.close { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; }
.tb-btn.min { width: 12px; height: 12px; border-radius: 50%; background: #febc2e; }
.tb-btn.max { width: 12px; height: 12px; border-radius: 50%; background: #28c840; }
.titlebar-title { flex: 1; text-align: center; font-size: 13px; color: #e6edf3; }
`
      : `
.app-layout { display: flex; flex-direction: column; height: 100vh; }
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 8px 0 16px;
  background: #2d2d2d;
  -webkit-app-region: drag;
  user-select: none;
}
.titlebar-btns.windows {
  display: flex;
  -webkit-app-region: no-drag;
}
.tb-btn.win-min, .tb-btn.win-max, .tb-btn.win-close {
  width: 46px; height: 32px;
  border: none; background: transparent;
  color: #e6edf3; font-size: 12px; cursor: pointer;
}
.tb-btn.win-min:hover, .tb-btn.win-max:hover { background: rgba(255,255,255,0.1); }
.tb-btn.win-close:hover { background: #e81123; color: white; }
.titlebar-title { font-size: 12px; color: #e6edf3; }
`;
  return `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0d0f12;
  color: #e6edf3;
  overflow: hidden;
}
${titleBarCss}

.frame {
  background: #181c22;
  border: 1px solid #30363d;
  border-radius: 4px;
}

.text {
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn {
  padding: 8px 16px;
  font-size: 14px;
  color: #e6edf3;
  background: rgba(88, 166, 255, 0.08);
  border: 1px solid #30363d;
  border-radius: 4px;
  cursor: pointer;
}

.btn:hover {
  background: rgba(88, 166, 255, 0.15);
  border-color: #58a6ff;
}

.input {
  padding: 8px 12px;
  font-size: 14px;
  color: #e6edf3;
  background: #0d0f12;
  border: 1px solid #30363d;
  border-radius: 4px;
}

.panel {
  display: flex;
  flex-direction: column;
  background: #181c22;
  border: 1px solid #30363d;
  border-radius: 4px;
  overflow: hidden;
}

.panel-header {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  background: #0d0f12;
  border-bottom: 1px solid #21262d;
}

.panel-body {
  flex: 1;
  padding: 12px;
  overflow: auto;
}

.img {
  object-fit: cover;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrapper svg {
  flex-shrink: 0;
}
`;
}
