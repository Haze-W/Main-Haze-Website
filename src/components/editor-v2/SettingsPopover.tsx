"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { useEditorStore } from "@/lib/editor/store";
import { useToast } from "@/components/Toast";
import { Moon, Sun, LayoutDashboard, Keyboard, Save, Copy } from "lucide-react";
import styles from "./SettingsPopover.module.css";

interface SettingsPopoverProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  exportDisabled?: boolean;
  saveAsDisabled?: boolean;
}

export function SettingsPopover({
  anchorRef,
  isOpen,
  onClose,
  onExport,
  onSave,
  onSaveAs,
  exportDisabled,
  saveAsDisabled,
}: SettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { show } = useToast();
  const theme = useEditorStore((s) => s.theme);
  const setTheme = useEditorStore((s) => s.setTheme);

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
        <button type="button" className={`${styles.menuItem} ${styles.menuItemIcon}`} onClick={() => { onSave?.(); onClose(); }}>
          <Save size={16} strokeWidth={2} />
          <span>Save Changes</span>
        </button>
        <button
          type="button"
          className={`${styles.menuItem} ${styles.menuItemIcon}`}
          disabled={saveAsDisabled}
          onClick={() => {
            if (saveAsDisabled) return;
            onSaveAs?.();
            onClose();
          }}
        >
          <Copy size={16} strokeWidth={2} />
          <span>Save As</span>
        </button>
        <button
          type="button"
          className={styles.menuItem}
          disabled={exportDisabled}
          onClick={() => {
            if (exportDisabled) return;
            onExport?.();
            onClose();
          }}
        >
          Export...
          <kbd className={styles.shortcutBadge}>⇧⌘E</kbd>
        </button>
        <Link href="/dashboard" className={styles.menuItem} onClick={onClose}>
          Create new project...
          <kbd className={styles.shortcutBadge}>⌘N</kbd>
        </Link>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            show("Duplicate project is coming soon. Save a copy from the dashboard.", "info");
            onClose();
          }}
        >
          Duplicate
          <kbd className={styles.shortcutBadge}>⌘D</kbd>
        </button>
      </div>
      <div className={styles.menuDivider} />
      <div className={styles.menuSection}>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            show("Rename from the dashboard project list (coming soon in-editor).", "info");
            onClose();
          }}
        >
          Rename
        </button>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            show("Moving projects between folders from the editor is coming soon.", "info");
            onClose();
          }}
        >
          Move to folder...
        </button>
        <button
          type="button"
          className={styles.menuItem}
          onClick={() => {
            show("Delete project from the dashboard. In-editor delete is coming soon.", "info");
            onClose();
          }}
        >
          Delete
        </button>
      </div>
      <div className={styles.menuDivider} />
      <div className={styles.menuSection}>
        <Link href="/dashboard" className={`${styles.menuItem} ${styles.menuItemIcon}`} onClick={onClose}>
          <LayoutDashboard size={16} strokeWidth={2} />
          <span>Return to Dashboard</span>
        </Link>
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
        <button type="button" className={`${styles.menuItem} ${styles.menuItemIcon}`} disabled title="Coming soon">
          <Keyboard size={16} strokeWidth={2} />
          <span>Keybinds</span>
        </button>
      </div>
    </div>
  );
}
