"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search, Sparkles, Wand2, Loader2 } from "lucide-react";
import { COMPONENT_CATEGORIES, COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./ComponentsPanel.module.css";

interface ComponentsPanelProps {
  onAddComponent: (key: string, x?: number, y?: number) => void;
  onOpenIconPicker: () => void;
  onAIGenerate?: (nodes: SceneNode[]) => void;
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

export function ComponentsPanel({ onAddComponent, onOpenIconPicker, onAIGenerate }: ComponentsPanelProps) {
  const [search, setSearch] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !onAIGenerate) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (data.nodes?.length) {
        onAIGenerate(data.nodes);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setAiLoading(false);
    }
  };

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
          type="search"
          placeholder="Filter components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          spellCheck={false}
        />
      </div>

      {onAIGenerate && (
        <div className={styles.aiSection}>
          <div className={styles.aiLabel}>
            <Wand2 size={14} />
            AI Generate
          </div>
          <textarea
            className={styles.aiInput}
            placeholder="e.g. Modern SaaS dashboard with sidebar and KPI cards"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            disabled={aiLoading}
          />
          <button
            type="button"
            className={styles.aiBtn}
            onClick={handleAIGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
          >
            {aiLoading ? <Loader2 size={14} className={styles.aiSpinner} /> : <Sparkles size={14} />}
            {aiLoading ? "Generating…" : "Generate UI"}
          </button>
          {aiError && <div className={styles.aiError}>{aiError}</div>}
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
