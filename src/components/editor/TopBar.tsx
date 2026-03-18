"use client";

import { useState } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/editor-store";
import { ExportModal } from "./ExportModal";
import styles from "./TopBar.module.css";

const MENUS = [
  { label: "File", items: ["New", "Open", "Save", "Export", "---", "Exit"] },
  { label: "Edit", items: ["Undo", "Redo", "---", "Cut", "Copy", "Paste", "Delete"] },
  { label: "View", items: ["Zoom In", "Zoom Out", "Reset Zoom", "---", "Full Screen"] },
  { label: "Help", items: ["Documentation", "About"] },
];

export function TopBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const {
    mode,
    setMode,
    zoom,
    setZoom,
    wireframeMode,
    setWireframeMode,
    undo,
    redo,
  } = useEditorStore();

  const handleMenuAction = async (action: string) => {
    if (action === "Undo") undo();
    if (action === "Redo") redo();
    if (action === "Zoom In") setZoom(zoom + 0.1);
    if (action === "Zoom Out") setZoom(zoom - 0.1);
    if (action === "Reset Zoom") setZoom(1);
    if (action === "Export") {
      setExportModalOpen(true);
    }
    setActiveMenu(null);
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>◉</span>
          <span>Haze</span>
        </Link>
        {MENUS.map((menu) => (
          <div
            key={menu.label}
            className={styles.menuContainer}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button
              type="button"
              className={`${styles.menuBtn} ${activeMenu === menu.label ? styles.active : ""}`}
              onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
            >
              {menu.label}
            </button>
            {activeMenu === menu.label && (
              <div className={styles.dropdown}>
                {menu.items.map((item) =>
                  item === "---" ? (
                    <div key={item} className={styles.divider} />
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => handleMenuAction(item)}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.center}>
        <div className={styles.modeToggles}>
          {(["design", "code", "settings"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.modeActive : ""}`}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.wireframeSelect}>
          <select
            value={wireframeMode}
            onChange={(e) => setWireframeMode(e.target.value as typeof wireframeMode)}
            className={styles.select}
          >
            <option value="ide">IDE (1200×800)</option>
            <option value="wide">Wide (1600×900)</option>
            <option value="square">Square (1024×1024)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.exportBtn}
          onClick={() => setExportModalOpen(true)}
        >
          Export
        </button>
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          onDownload={async () => {
            const { preloadLucideIcons } = await import("@/lib/icon-svg");
            await preloadLucideIcons();
            const { downloadProject } = await import("@/lib/tauri-export");
            const { frames, activeFrameId } = useEditorStore.getState();
            await downloadProject(frames, activeFrameId, "my-tauri-app");
          }}
        />
        <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <div className={styles.userControls}>
          <span className={styles.avatar}>U</span>
        </div>
      </div>
    </header>
  );
}
