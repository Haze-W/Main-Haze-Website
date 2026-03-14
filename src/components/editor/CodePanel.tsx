"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Folder, FolderOpen, FolderPlus, File, FilePlus, Search } from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { sceneNodesToFrames } from "@/lib/editor/adapter";
import { getTauriProjectFiles } from "@/lib/tauri-export";
import { useExportSettings } from "@/lib/editor/export-settings";
import styles from "./CodePanel.module.css";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className={styles.loading} role="status">
        Loading editor...
      </div>
    ),
  }
);

const FILE_ORDER = [
  "package.json",
  "vite.config.ts",
  "src/index.html",
  "src/styles.css",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/src/main.rs",
  "src-tauri/build.rs",
  "src-tauri/capabilities/default.json",
  "src-tauri/icons/icon.ico",
  "README.md",
];

const LANG_MAP: Record<string, string> = {
  "package.json": "json",
  "vite.config.ts": "typescript",
  "src/index.html": "html",
  "src/styles.css": "css",
  "src-tauri/tauri.conf.json": "json",
  "src-tauri/Cargo.toml": "toml",
  "src-tauri/src/main.rs": "rust",
  "src-tauri/build.rs": "rust",
  "src-tauri/capabilities/default.json": "json",
  "src-tauri/icons/icon.ico": "plaintext",
  "README.md": "markdown",
};

function buildFileTree(files: string[]): { byFolder: Record<string, string[]> } {
  const byFolder: Record<string, string[]> = {};
  for (const path of files) {
    const parts = path.split("/");
    if (parts.length === 1) {
      if (!byFolder["."]) byFolder["."] = [];
      byFolder["."].push(path);
    } else {
      const folder = parts.slice(0, -1).join("/");
      if (!byFolder[folder]) byFolder[folder] = [];
      byFolder[folder].push(parts[parts.length - 1]);
    }
  }
  return { byFolder };
}

export function CodePanel() {
  const [activeFile, setActiveFile] = useState<string>("src/index.html");
  const [error, setError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(["src", "src-tauri", "src-tauri/src", "src-tauri/capabilities", "src-tauri/icons"])
  );

  const nodes = useEditorStore((s) => s.nodes);
  const frames = useMemo(() => sceneNodesToFrames(nodes), [nodes]);
  const { appName, titleBarStyle } = useExportSettings();
  const activeFrameId = frames[0]?.id ?? null;

  const projectFiles = useMemo(
    () =>
      getTauriProjectFiles(frames, activeFrameId, appName || "my-tauri-app", {
        appName: appName || "my-tauri-app",
        titleBarStyle,
      }),
    [frames, activeFrameId, appName, titleBarStyle]
  );

  const fileList = useMemo(
    () =>
      FILE_ORDER.filter((p) => p in projectFiles),
    [projectFiles]
  );

  const { byFolder } = useMemo(() => buildFileTree(fileList), [fileList]);

  const value = projectFiles[activeFile] ?? "";
  const language = LANG_MAP[activeFile] ?? "plaintext";

  const toggleFolder = useCallback((folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  }, []);

  const handleEditorMount = useCallback(() => setError(null), []);
  const handleEditorValidation = useCallback((markers: unknown[]) => {
    const errs = (markers as { severity?: number }[]).filter((m) => m.severity === 8);
    setError(errs.length > 0 ? `${errs.length} error(s)` : null);
  }, []);

  // Folders first, then root-level files at the bottom
  const folderOrder = ["src", "src-tauri", "src-tauri/src", "src-tauri/capabilities", "src-tauri/icons", "."];

  const renderTree = () => {
    const items: React.ReactNode[] = [];
    for (const folder of folderOrder) {
      const children = byFolder[folder];
      if (!children) continue;
      const label = folder === "." ? "root" : folder.split("/").pop() ?? folder;
      const isExp = expandedFolders.has(folder);

      if (folder === ".") {
        for (const file of children) {
          if (fileSearch && !file.toLowerCase().includes(fileSearch.toLowerCase())) continue;
          items.push(
            <button
              key={file}
              type="button"
              className={`${styles.fileItem} ${activeFile === file ? styles.fileActive : ""}`}
              onClick={() => setActiveFile(file)}
            >
              <File size={16} className={styles.fileIcon} />
              {file}
            </button>
          );
        }
        continue;
      }

      const filteredChildren = fileSearch
        ? children.filter((f) => f.toLowerCase().includes(fileSearch.toLowerCase()))
        : children;
      if (filteredChildren.length === 0 && fileSearch) continue;

      items.push(
        <div key={folder} className={styles.folderGroup}>
          <button
            type="button"
            className={styles.folderBtn}
            onClick={() => toggleFolder(folder)}
          >
            <span className={styles.folderArrow}>{isExp ? "▾" : "▸"}</span>
            {isExp ? (
              <FolderOpen size={16} className={styles.folderIcon} />
            ) : (
              <Folder size={16} className={styles.folderIcon} />
            )}
            {label}
          </button>
          {isExp &&
            filteredChildren.map((file) => {
              const path = `${folder}/${file}`;
              return (
                <button
                  key={path}
                  type="button"
                  className={`${styles.fileItem} ${styles.fileNested} ${activeFile === path ? styles.fileActive : ""}`}
                  onClick={() => setActiveFile(path)}
                >
                  <File size={16} className={styles.fileIcon} />
                  {file}
                </button>
              );
            })}
        </div>
      );
    }
    return items;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.sidebar}>
        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            placeholder="Search files..."
            value={fileSearch}
            onChange={(e) => setFileSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.sidebarHeader}>
          <FolderPlus size={14} className={styles.headerIcon} />
          {appName || "Project"}
        </div>
        <div className={styles.fileTree}>{renderTree()}</div>
      </div>
      <div className={styles.editorPane}>
        <div className={styles.header}>
          <span className={styles.fileLabel}>{activeFile}</span>
          {error && <span className={styles.errorLabel}>{error}</span>}
        </div>
        <div className={styles.editorWrapper}>
          <MonacoEditor
            key={activeFile}
            height="100%"
            defaultLanguage={language}
            language={language}
            value={value}
            theme="vs-dark"
            loading={null}
            onMount={handleEditorMount}
            onValidate={handleEditorValidation}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 16 },
              readOnly: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}

