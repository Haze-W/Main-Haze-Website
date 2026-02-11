"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { COMPONENT_CATEGORIES, COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { IconPickerModal } from "@/components/editor/IconPickerModal";
import styles from "./ComponentsPanel.module.css";

interface ComponentsPanelProps {
  onAddComponent: (key: string, x?: number, y?: number) => void;
  onAddIcon: (iconName: string, x?: number, y?: number) => void;
}

function DraggableComponent({
  presetKey,
  onAdd,
}: {
  presetKey: string;
  onAdd: (key: string) => void;
}) {
  const preset = COMPONENT_PRESETS[presetKey];
  if (!preset) return null;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-${presetKey}`,
    data: { type: "component", key: presetKey },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.componentItem} ${isDragging ? styles.dragging : ""}`}
      onClick={() => onAdd(presetKey)}
    >
      <span className={styles.componentIcon}>{getIcon(preset.type)}</span>
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
    SELECT: "▼",
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

export function ComponentsPanel({ onAddComponent, onAddIcon }: ComponentsPanelProps) {
  const [search, setSearch] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

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
      <div className={styles.header}>Components</div>
      <input
        type="search"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />
      <button
        type="button"
        className={styles.iconLibraryBtn}
        onClick={() => setIconPickerOpen(true)}
      >
        <span className={styles.iconLibraryIcon}>◆</span>
        Icon Library
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
      </div>
      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconName) => {
          onAddIcon(iconName);
          setIconPickerOpen(false);
        }}
      />
    </div>
  );
}
