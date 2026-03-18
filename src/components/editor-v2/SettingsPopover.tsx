"use client";

import { useRef, useEffect } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { Moon, Sun } from "lucide-react";
import styles from "./SettingsPopover.module.css";

interface SettingsPopoverProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
}

export function SettingsPopover({ anchorRef, isOpen, onClose, onExport }: SettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);
  const showGrid = useEditorStore((s) => s.showGrid);
  const setShowGrid = useEditorStore((s) => s.setShowGrid);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      style={{
        top: anchorRef.current
          ? anchorRef.current.getBoundingClientRect().bottom + 8
          : 0,
        left: anchorRef.current
          ? anchorRef.current.getBoundingClientRect().left
          : 0,
      }}
    >
      <div className={styles.menuSection}>
        <button type="button" className={styles.menuItem} onClick={() => { onExport?.(); onClose(); }}>
          Export...
          <kbd className={styles.shortcutBadge}>⇧⌘E</kbd>
        </button>
        <button type="button" className={styles.menuItem} onClick={onClose}>
          Create new project...
          <kbd className={styles.shortcutBadge}>⌘N</kbd>
        </button>
        <button type="button" className={styles.menuItem} onClick={onClose}>
          Duplicate
          <kbd className={styles.shortcutBadge}>⌘D</kbd>
        </button>
      </div>
      <div className={styles.menuDivider} />
      <div className={styles.menuSection}>
        <button type="button" className={styles.menuItem} onClick={onClose}>Rename</button>
        <button type="button" className={styles.menuItem} onClick={onClose}>Move to folder...</button>
        <button type="button" className={styles.menuItem} onClick={onClose}>Delete</button>
      </div>
      <div className={styles.menuDivider} />
      <div className={styles.menuSection}>
        <div className={styles.menuItemRow}>
          <span>Theme</span>
          <div className={styles.themeToggle}>
            <button
              type="button"
              className={`${styles.themeBtn} ${theme === "light" ? styles.themeBtnActive : ""}`}
              onClick={() => setTheme("light")}
            >
              <Sun size={14} />
              Light
            </button>
            <button
              type="button"
              className={`${styles.themeBtn} ${theme === "dark" ? styles.themeBtnActive : ""}`}
              onClick={() => setTheme("dark")}
            >
              <Moon size={14} />
              Dark
            </button>
          </div>
        </div>
        <div className={styles.menuItemRow}>
          <span>Show grid</span>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span className={styles.toggleTrack} />
          </label>
        </div>
      </div>
    </div>
  );
}
