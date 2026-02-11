import JSZip from "jszip";
import { generateHtml, generateCss } from "./code-generator";
import { getIconIcoBytes } from "./icon-data";
import type { CanvasNode, Frame } from "./types";
import type { ExportSettings } from "./editor/export-settings";

const TAURI_CONF = (name: string) => JSON.stringify(
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
          width: 1200,
          height: 800,
          resizable: true,
          fullscreen: false,
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
  const html = generateHtml(nodes, activeFrame ?? undefined, { appName, titleBarStyle });
  const css = generateCss(titleBarStyle);
  const name = appName;

  return {
    "package.json": PACKAGE_JSON(name),
    "vite.config.ts": VITE_CONFIG,
    "src/index.html": html,
    "src/styles.css": css,
    "src-tauri/tauri.conf.json": TAURI_CONF(name),
    "src-tauri/Cargo.toml": CARGO_TOML(name),
    "src-tauri/src/main.rs": MAIN_RS,
    "src-tauri/build.rs": BUILD_RS,
    "src-tauri/capabilities/default.json": CAPABILITIES,
    "src-tauri/icons/icon.ico": "(binary - 16x16 ICO)",
    "README.md": README,
  };
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
  const html = generateHtml(nodes, activeFrame ?? undefined, { appName, titleBarStyle });
  const css = generateCss(titleBarStyle);
  const name = appName;

  zip.file("package.json", PACKAGE_JSON(name));
  zip.file("vite.config.ts", VITE_CONFIG);

  const src = zip.folder("src")!;
  src.file("index.html", html);
  src.file("styles.css", css);

  const srcTauri = zip.folder("src-tauri")!;
  srcTauri.file("tauri.conf.json", TAURI_CONF(name));
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
