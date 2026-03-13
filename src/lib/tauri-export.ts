import JSZip from "jszip";
import { generateHtml, generateCss } from "./code-generator";
import { getIconIcoBytes } from "./icon-data";
import { sceneNodesToHtml, sceneExportCss, getFrameDimensions } from "./editor/scene-export";
import type { SceneNode } from "./editor/types";
import type { CanvasNode, Frame } from "./types";
import type { ExportSettings } from "./editor/export-settings";

const TAURI_CONF = (name: string, frameless = false, width = 1200, height = 800) => JSON.stringify(
  {
    productName: name,
    version: "0.1.0",
    identifier: `com.render.${name.toLowerCase().replace(/\s+/g, "-")}`,
    build: {
      frontendDist: "../dist",
      devUrl: "http://localhost:3000",
      beforeDevCommand: "npm run dev",
      beforeBuildCommand: "npm run build",
    },
    app: {
      withGlobalTauri: false,
      windows: [
        {
          title: name,
          width: Math.max(200, Math.round(width)),
          height: Math.max(100, Math.round(height)),
          resizable: true,
          fullscreen: false,
          ...(frameless ? { decorations: false } : {}),
        },
      ],
      security: { csp: null },
    },
    bundle: {
      active: true,
      targets: "all",
      icon: ["icons/icon.ico"],
      resources: [],
      externalBin: [],
      copyright: "",
      category: "DeveloperTool",
      shortDescription: "",
      longDescription: "",
    },
  },
  null,
  2
);

const CARGO_TOML = (name: string) => `[package]
name = "${name.toLowerCase().replace(/\s+/g, "-")}"
version = "0.1.0"
description = "Tauri app built with Render"
authors = ["Render"]
license = "MIT"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;

const MAIN_RS = `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`;

const WINDOW_CONTROLS_JS = `
// Custom window controls for frameless window
const { getCurrentWindow } = window.__TAURI_INTERNALS__ ?? {};

document.addEventListener('DOMContentLoaded', () => {
  const topbar = document.querySelector('[data-tauri-drag-region]');
  if (topbar) {
    // Double-click to maximize
    topbar.addEventListener('dblclick', async () => {
      const win = getCurrentWindow?.();
      if (!win) return;
      const maximized = await win.isMaximized();
      if (maximized) win.unmaximize();
      else win.maximize();
    });
  }

  // Window control buttons
  document.querySelectorAll('[data-window-control]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-window-control');
      const win = getCurrentWindow?.();
      if (!win) return;
      switch (action) {
        case 'minimize': win.minimize(); break;
        case 'maximize': {
          const maximized = await win.isMaximized();
          if (maximized) win.unmaximize();
          else win.maximize();
          break;
        }
        case 'close': win.close(); break;
      }
    });
  });
});
`;

const BUILD_RS = `fn main() {
    tauri_build::build()
}
`;

const CAPABILITIES = `{
  "\$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-is-maximized",
    "core:window:allow-start-dragging",
    "shell:allow-open"
  ]
}
`;

const PACKAGE_JSON = (name: string) => `{
  "name": "${name.toLowerCase().replace(/\s+/g, "-")}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "tauri": "tauri"
  },
  "dependencies": {},
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "vite": "^5"
  }
}
`;

const VITE_CONFIG = `import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  clearScreen: false,
  server: {
    port: 3000,
  },
});
`;

const README = `# Tauri App - Built with Render

## Prerequisites

**You must install Rust before running this project.** Tauri uses Rust to build the desktop application.

### Install Rust (required)

1. Go to https://rustup.rs/
2. Download and run the installer for your OS
3. Restart your terminal after installation
4. Verify: run \`cargo --version\` — you should see a version number

## Setup & Run

**Important: Run all commands from this folder (the project root), NOT from the src/ folder.**

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development:
   \`\`\`bash
   npm run tauri dev
   \`\`\`

3. Build for production:
   \`\`\`bash
   npm run tauri build
   \`\`\`

## Troubleshooting

- **"cargo: program not found"** — Install Rust from https://rustup.rs/
- **Command fails when run from src/** — \`cd\` to the project root (the folder containing package.json)
- **"icon.ico not found"** — The project includes a default icon. If you see this, re-extract the zip.
`;

export interface TauriProjectFiles {
  [path: string]: string;
}

/** Get all Tauri project file contents for View Code panel (matches export structure) */
export function getTauriProjectFiles(
  frames: Frame[],
  activeFrameId: string | null,
  projectName = "tauri-app",
  exportSettings?: Partial<ExportSettings>
): TauriProjectFiles {
  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  const nodes = activeFrame?.children ?? [];
  const appName = exportSettings?.appName ?? projectName;
  const titleBarStyle = exportSettings?.titleBarStyle ?? "windows";
  const frameless = exportSettings?.frameless ?? false;
  const w = activeFrame?.width ?? 1200;
  const h = activeFrame?.height ?? 800;
  const html = generateHtml(nodes, activeFrame ?? undefined, { appName, titleBarStyle });
  const css = generateCss(titleBarStyle);
  const name = appName;

  const files: TauriProjectFiles = {
    "package.json": PACKAGE_JSON(name),
    "vite.config.ts": VITE_CONFIG,
    "src/index.html": html,
    "src/styles.css": css,
    "src-tauri/tauri.conf.json": TAURI_CONF(name, frameless, w, h),
    "src-tauri/Cargo.toml": CARGO_TOML(name),
    "src-tauri/src/main.rs": MAIN_RS,
    "src-tauri/build.rs": BUILD_RS,
    "src-tauri/capabilities/default.json": CAPABILITIES,
    "src-tauri/icons/icon.ico": "(binary - 16x16 ICO)",
    "README.md": README,
  };

  if (frameless) {
    files["src/window-controls.js"] = WINDOW_CONTROLS_JS;
  }

  return files;
}

export async function createTauriProjectZip(
  frames: Frame[],
  activeFrameId: string | null,
  projectName = "tauri-app",
  exportSettings?: Partial<ExportSettings>
): Promise<Blob> {
  const zip = new JSZip();
  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  const nodes = activeFrame?.children ?? [];
  const appName = exportSettings?.appName ?? projectName;
  const titleBarStyle = exportSettings?.titleBarStyle ?? "windows";
  const frameless = exportSettings?.frameless ?? false;
  const w = activeFrame?.width ?? 1200;
  const h = activeFrame?.height ?? 800;
  const html = generateHtml(nodes, activeFrame ?? undefined, { appName, titleBarStyle });
  const css = generateCss(titleBarStyle);
  const name = appName;

  zip.file("package.json", PACKAGE_JSON(name));
  zip.file("vite.config.ts", VITE_CONFIG);

  const src = zip.folder("src")!;
  src.file("index.html", html);
  src.file("styles.css", css);
  src.file("window-controls.js", WINDOW_CONTROLS_JS);

  const srcTauri = zip.folder("src-tauri")!;
  srcTauri.file("tauri.conf.json", TAURI_CONF(name, frameless, w, h));
  srcTauri.file("Cargo.toml", CARGO_TOML(name));
  srcTauri.file("src/main.rs", MAIN_RS);
  srcTauri.file("build.rs", BUILD_RS);

  const icons = srcTauri.folder("icons")!;
  icons.file("icon.ico", getIconIcoBytes());

  const capabilities = srcTauri.folder("capabilities")!;
  capabilities.file("default.json", CAPABILITIES);

  zip.file("README.md", README);

  return zip.generateAsync({ type: "blob" });
}

export async function downloadProject(
  frames: Frame[],
  activeFrameId: string | null,
  name = "tauri-app",
  exportSettings?: Partial<ExportSettings>
): Promise<void> {
  const blob = await createTauriProjectZip(frames, activeFrameId, name, exportSettings);
  const appName = exportSettings?.appName ?? name;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${appName.toLowerCase().replace(/\s+/g, "-")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export from SceneNodes - 1:1 with Render display.
 * No custom top bar. Uses frame size. Preserves Figma colors, images, vectors.
 */
export async function downloadProjectFromSceneNodes(
  nodes: SceneNode[],
  name = "tauri-app",
  exportSettings?: Partial<ExportSettings>
): Promise<void> {
  const zip = new JSZip();
  const appName = exportSettings?.appName ?? name;
  const { width, height } = getFrameDimensions(nodes);
  const html = sceneNodesToHtml(nodes, appName);
  const css = sceneExportCss();

  zip.file("package.json", PACKAGE_JSON(appName));
  zip.file("vite.config.ts", VITE_CONFIG);

  const src = zip.folder("src")!;
  src.file("index.html", html);
  src.file("styles.css", css);
  src.file("window-controls.js", WINDOW_CONTROLS_JS);

  const srcTauri = zip.folder("src-tauri")!;
  srcTauri.file("tauri.conf.json", TAURI_CONF(appName, false, width, height));
  srcTauri.file("Cargo.toml", CARGO_TOML(appName));
  srcTauri.file("src/main.rs", MAIN_RS);
  srcTauri.file("build.rs", BUILD_RS);

  const icons = srcTauri.folder("icons")!;
  icons.file("icon.ico", getIconIcoBytes());

  const capabilities = srcTauri.folder("capabilities")!;
  capabilities.file("default.json", CAPABILITIES);

  zip.file("README.md", README);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${appName.toLowerCase().replace(/\s+/g, "-")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
