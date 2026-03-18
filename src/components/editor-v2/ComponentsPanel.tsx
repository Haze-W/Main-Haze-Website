"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Sparkles } from "lucide-react";
import { COMPONENT_CATEGORIES, COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import styles from "./ComponentsPanel.module.css";

interface ComponentsPanelProps {
  onAddComponent: (key: string, x?: number, y?: number) => void;
  onOpenIconPicker: () => void;
}

function DraggableComponent({
  presetKey,
  onAdd,
}: {
  presetKey: string;
  onAdd: (key: string) => void;
}) {
  const preset = COMPONENT_PRESETS[presetKey];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-${presetKey}`,
    data: { type: "component", key: presetKey },
  });
  if (!preset) return null;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.componentItem} ${isDragging ? styles.dragging : ""}`}
      onClick={() => onAdd(presetKey)}
    >
      <div className={styles.componentIcon}>{getIcon(preset.type)}</div>
      <span>{preset.name}</span>
    </div>
  );
}

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    FRAME: "⊞",
    TEXT: "T",
    BUTTON: "⬚",
    INPUT: "▭",
    CHECKBOX: "☐",
    SELECT: "▾",
    IMAGE: "🖼",
    ICON: "◆",
    CONTAINER: "▦",
    PANEL: "▤",
    DIVIDER: "—",
    SPACER: "□",
    LIST: "≡",
    RECTANGLE: "▢",
  };
  return icons[type] ?? "•";
}

export function ComponentsPanel({
  onAddComponent,
  onOpenIconPicker,
}: ComponentsPanelProps) {
  const [search, setSearch] = useState("");

  const filtered = COMPONENT_CATEGORIES.map((cat) => ({
    ...cat,
    keys: cat.keys.filter(
      (k) =>
        !search ||
        COMPONENT_PRESETS[k]?.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((c) => c.keys.length > 0);

  return (
    <div className={styles.panel}>
      <div className={styles.searchContainer}>
        <svg
          className={styles.searchIcon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Filter components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          spellCheck={false}
        />
      </div>

      <button
        type="button"
        className={styles.iconLibraryBtn}
        onClick={onOpenIconPicker}
      >
        <Sparkles size={16} className={styles.iconLibraryIcon} />
        Browse Icons
      </button>

      <div className={styles.list}>
        {filtered.map((cat) => (
          <div key={cat.label} className={styles.category}>
            <div className={styles.categoryLabel}>{cat.label}</div>
            {cat.keys.map((key) => (
              <DraggableComponent
                key={key}
                presetKey={key}
                onAdd={(k) => onAddComponent(k)}
              />
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 12, color: "var(--shade-06)", fontSize: 13, textAlign: "center" }}>
            No components found
          </div>
        )}
      </div>
    </div>
  );
}
