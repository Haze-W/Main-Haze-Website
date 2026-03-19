"use client";

import { useEditorStore } from "@/lib/editor/store";
import { Moon, Sun } from "lucide-react";
import styles from "./EditorSettingsPanel.module.css";

export function EditorSettingsPanel() {
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const setMode = useEditorStore((s) => s.setMode);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settings</h2>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => setMode("design")}
        >
          ← Back
        </button>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Appearance</h3>
          <div className={styles.themeRow}>
            <span className={styles.label}>Theme</span>
            <div className={styles.themeToggle}>
              <button
                type="button"
                className={`${styles.themeBtn} ${theme === "light" ? styles.themeBtnActive : ""}`}
                onClick={() => setTheme("light")}
              >
                <Sun size={18} />
                Light
              </button>
              <button
                type="button"
                className={`${styles.themeBtn} ${theme === "dark" ? styles.themeBtnActive : ""}`}
                onClick={() => setTheme("dark")}
              >
                <Moon size={18} />
                Dark
              </button>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>About</h3>
          <p className={styles.description}>
            Haze — Visual Tauri GUI Builder. Build real desktop applications visually.
          </p>
        </section>
      </div>
    </div>
  );
}
