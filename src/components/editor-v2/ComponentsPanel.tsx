"use client";

import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search, Sparkles } from "lucide-react";
import { COMPONENT_CATEGORIES, COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
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

function DraggableSceneComponent({ node }: { node: SceneNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scene-component-${node.id}`,
    data: { type: "sceneComponent", componentId: node.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.sceneComponentTile} ${isDragging ? styles.dragging : ""}`}
      title={node.name}
    >
      <span className={styles.sceneComponentGlyph}>⊞</span>
      <span className={styles.sceneComponentLabel}>{node.name}</span>
    </div>
  );
}

function collectSceneMasterComponents(nodes: SceneNode[]): SceneNode[] {
  const out: SceneNode[] = [];
  function walk(ns: SceneNode[]) {
    for (const n of ns) {
      if (n.type === "COMPONENT" && (n.props as { isComponent?: boolean } | undefined)?.isComponent === true) {
        out.push(n);
      }
      walk(n.children ?? []);
    }
  }
  walk(nodes);
  return out;
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




export function ComponentsPanel({ onAddComponent, onOpenIconPicker }: ComponentsPanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const sceneMasterComponents = useMemo(() => collectSceneMasterComponents(nodes), [nodes]);
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
        <Search size={14} className={styles.searchIcon} />
        <input
          id="components-panel-filter"
          name="component_filter"
          type="search"
          placeholder="Filter components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          spellCheck={false}
          autoComplete="off"
          aria-label="Filter components"
        />
      </div>

      {sceneMasterComponents.length > 0 && (
        <div className={styles.sceneComponentsBlock}>
          <div className={styles.sceneComponentsHeading}>Scene components</div>
          <div className={styles.sceneComponentsGrid}>
            {sceneMasterComponents.map((n) => (
              <DraggableSceneComponent key={n.id} node={n} />
            ))}
          </div>
        </div>
      )}

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
          <div style={{ padding: 12, color: "var(--fg-muted)", fontSize: 13, textAlign: "center" }}>
            No components found
          </div>
        )}
      </div>
    </div>
  );
}
