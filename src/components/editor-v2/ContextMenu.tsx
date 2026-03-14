"use client";

import { useEffect, useRef } from "react";
import styles from "./ContextMenu.module.css";

export interface ContextMenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use a small delay so the same right-click that opened the menu
    // doesn't immediately close it via the contextmenu listener
    const timeout = setTimeout(() => {
      const onPointerDown = (e: PointerEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      const onContextMenu = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("contextmenu", onContextMenu);
      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("contextmenu", onContextMenu);
        window.removeEventListener("keydown", onKeyDown);
      };
    }, 50);
    return () => clearTimeout(timeout);
  }, [onClose]);

  // Keep menu on screen
  const style: React.CSSProperties = { left: x, top: y };
  if (typeof window !== "undefined") {
    if (x + 220 > window.innerWidth) style.left = window.innerWidth - 224;
    if (y + items.length * 32 > window.innerHeight) style.top = window.innerHeight - items.length * 32 - 8;
  }

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {items.map((item) =>
        item.divider ? (
          <div key={item.id} className={styles.divider} />
        ) : (
          <button
            key={item.id}
            type="button"
            className={styles.item}
            disabled={item.disabled}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (!item.disabled) {
                item.onClick?.();
                onClose();
              }
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}
