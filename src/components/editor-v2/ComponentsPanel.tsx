"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search, Sparkles, Wand2, Loader2, RotateCcw } from "lucide-react";
import { COMPONENT_CATEGORIES, COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./ComponentsPanel.module.css";

export type AIGenerateMode = "replace" | "append";

interface ComponentsPanelProps {
  onAddComponent: (key: string, x?: number, y?: number) => void;
  onOpenIconPicker: () => void;
  onAIGenerate?: (nodes: SceneNode[], options?: { mode: AIGenerateMode }) => void;
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

const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const AI_STYLES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ComponentsPanel({ onAddComponent, onOpenIconPicker, onAIGenerate }: ComponentsPanelProps) {
  const [search, setSearch] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<AIGenerateMode>("append");
  const [aiModel, setAiModel] = useState("gpt-4o");
  const [aiStyle, setAiStyle] = useState<"light" | "dark">("dark");

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !onAIGenerate) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          model: aiModel,
          style: aiStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (data.nodes?.length) {
        onAIGenerate(data.nodes, { mode: aiMode });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRetry = () => {
    setAiError(null);
    handleAIGenerate();
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
          <div className={styles.aiOptions}>
            <div className={styles.aiOptionRow}>
              <span className={styles.aiOptionLabel}>Add to canvas</span>
              <div className={styles.aiToggle}>
                <button
                  type="button"
                  className={aiMode === "replace" ? styles.aiToggleActive : ""}
                  onClick={() => setAiMode("replace")}
                  disabled={aiLoading}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className={aiMode === "append" ? styles.aiToggleActive : ""}
                  onClick={() => setAiMode("append")}
                  disabled={aiLoading}
                >
                  Append
                </button>
              </div>
            </div>
            <div className={styles.aiOptionRow}>
              <span className={styles.aiOptionLabel}>Theme</span>
              <select
                className={styles.aiSelect}
                value={aiStyle}
                onChange={(e) => setAiStyle(e.target.value as "light" | "dark")}
                disabled={aiLoading}
              >
                {AI_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.aiOptionRow}>
              <span className={styles.aiOptionLabel}>Model</span>
              <select
                className={styles.aiSelect}
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                disabled={aiLoading}
              >
                {AI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            className={styles.aiInput}
            placeholder="e.g. Modern SaaS dashboard with sidebar and KPI cards"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            disabled={aiLoading}
          />
          {aiLoading && (
            <div className={styles.aiSkeleton}>
              <div className={styles.aiSkeletonBar} />
              <div className={styles.aiSkeletonBar} style={{ width: "80%" }} />
              <div className={styles.aiSkeletonBar} style={{ width: "60%" }} />
            </div>
          )}
          <button
            type="button"
            className={styles.aiBtn}
            onClick={handleAIGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
          >
            {aiLoading ? <Loader2 size={14} className={styles.aiSpinner} /> : <Sparkles size={14} />}
            {aiLoading ? "Generating…" : "Generate UI"}
          </button>
          {aiError && (
            <div className={styles.aiErrorBlock}>
              <div className={styles.aiError}>{aiError}</div>
              <button type="button" className={styles.aiRetryBtn} onClick={handleRetry}>
                <RotateCcw size={12} /> Retry
              </button>
            </div>
          )}
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
