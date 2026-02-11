"use client";

import { useEditorStore } from "@/lib/editor-store";
import styles from "./SettingsPanel.module.css";

export function SettingsPanel() {
  const {
    wireframeMode,
    setWireframeMode,
    customWidth,
    customHeight,
    setCustomDimensions,
  } = useEditorStore();

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Settings</h2>

      <section className={styles.section}>
        <h3>Default Wireframe</h3>
        <p className={styles.description}>
          Preset used when adding new frames to the canvas.
        </p>
        <div className={styles.row}>
          <label>Layout preset</label>
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
        {wireframeMode === "custom" && (
          <>
            <div className={styles.row}>
              <label>Width</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomDimensions(Number(e.target.value), customHeight)}
                className={styles.input}
                min={200}
                max={4096}
              />
            </div>
            <div className={styles.row}>
              <label>Height</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomDimensions(customWidth, Number(e.target.value))}
                className={styles.input}
                min={200}
                max={4096}
              />
            </div>
          </>
        )}
      </section>

      <section className={styles.section}>
        <h3>Export</h3>
        <p className={styles.description}>
          Exported Tauri projects include a README with setup instructions.
          Requires Rust (rustup.rs) to build.
        </p>
      </section>

      <section className={styles.section}>
        <h3>About</h3>
        <p className={styles.description}>
          Render — Visual Tauri GUI Builder. Build real desktop applications visually.
        </p>
      </section>
    </div>
  );
}
