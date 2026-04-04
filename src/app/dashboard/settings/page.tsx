"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? (theme === "system" ? resolvedTheme : theme) : "dark";

  return (
    <div className={styles.settings}>
      <div className={styles.settingsHeader}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back
        </Link>
        <h1 className={styles.settingsTitle}>Settings</h1>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <p className={styles.sectionDesc}>
          Applies across the marketing and dashboard shell (stored in your browser).
        </p>
        <div className={styles.themeToggle}>
          <button
            type="button"
            className={`${styles.themeBtn} ${active === "light" ? styles.themeBtnActive : ""}`}
            onClick={() => setTheme("light")}
            disabled={!mounted}
          >
            <Sun size={18} />
            Light
          </button>
          <button
            type="button"
            className={`${styles.themeBtn} ${active === "dark" ? styles.themeBtnActive : ""}`}
            onClick={() => setTheme("dark")}
            disabled={!mounted}
          >
            <Moon size={18} />
            Dark
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Project</h2>
        <p className={styles.sectionDesc}>Default project settings and preferences.</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <p className={styles.sectionDesc}>
          Haze — Visual Tauri GUI Builder. Build real desktop applications visually.
        </p>
      </div>
    </div>
  );
}
