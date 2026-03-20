"use client";

import { useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Search, Sparkles, Wand2, Loader2, ImageIcon, Upload, Monitor, Tablet, Smartphone } from "lucide-react";
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

type AIMode = "prompt" | "screenshot";
type ViewportType = "desktop" | "tablet" | "mobile";

export function ComponentsPanel({ onAddComponent, onOpenIconPicker, onAIGenerate }: ComponentsPanelProps) {
  const [search, setSearch] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiMode, setAiMode] = useState<AIMode>("prompt");
  const [viewport, setViewport] = useState<ViewportType>("desktop");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useTheme, setUseTheme] = useState(false);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !onAIGenerate) return;
    setAiLoading(true);
    setAiError(null);
    try {
      let theme: object | undefined;
      if (useTheme) {
        const themeRes = await fetch("/api/ai/theme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: aiPrompt.trim() }),
        });
        const themeData = await themeRes.json();
        if (themeData.theme) theme = themeData.theme;
      }
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim(), viewport, theme }),
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

  const handleScreenshotExtract = async () => {
    if (!screenshotPreview || !onAIGenerate) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: screenshotPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      if (data.nodes?.length) {
        onAIGenerate(data.nodes);
        setScreenshotPreview(null);
      } else {
        throw new Error("No layout could be extracted from the image");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to extract layout");
    } finally {
      setAiLoading(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAiError("Please select an image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setAiError("Image must be under 4MB");
      return;
    }
    setAiError(null);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "";
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith("image/")) processFile(file);
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

      {onAIGenerate && (
        <div className={styles.aiSection}>
          <div className={styles.aiLabel}>
            <Wand2 size={14} />
            AI Generate
          </div>
          <div className={styles.aiModeTabs}>
            <button
              type="button"
              className={`${styles.aiModeTab} ${aiMode === "prompt" ? styles.aiModeTabActive : ""}`}
              onClick={() => { setAiMode("prompt"); setAiError(null); setScreenshotPreview(null); }}
            >
              <Sparkles size={12} />
              Prompt
            </button>
            <button
              type="button"
              className={`${styles.aiModeTab} ${aiMode === "screenshot" ? styles.aiModeTabActive : ""}`}
              onClick={() => { setAiMode("screenshot"); setAiError(null); }}
            >
              <ImageIcon size={12} />
              Screenshot
            </button>
          </div>
          {aiMode === "prompt" ? (
            <>
              <div className={styles.viewportSelector}>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${viewport === "desktop" ? styles.viewportBtnActive : ""}`}
                  onClick={() => setViewport("desktop")}
                  title="Desktop (1440×900)"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${viewport === "tablet" ? styles.viewportBtnActive : ""}`}
                  onClick={() => setViewport("tablet")}
                  title="Tablet (768×1024)"
                >
                  <Tablet size={14} />
                </button>
                <button
                  type="button"
                  className={`${styles.viewportBtn} ${viewport === "mobile" ? styles.viewportBtnActive : ""}`}
                  onClick={() => setViewport("mobile")}
                  title="Mobile (375×812)"
                >
                  <Smartphone size={14} />
                </button>
              </div>
              <label className={styles.themeCheckbox} htmlFor="ai-generate-use-theme">
                <input
                  id="ai-generate-use-theme"
                  name="ai_use_theme"
                  type="checkbox"
                  checked={useTheme}
                  onChange={(e) => setUseTheme(e.target.checked)}
                  disabled={aiLoading}
                />
                <span>Generate design system theme</span>
              </label>
              <textarea
                id="ai-generate-prompt"
                name="ai_prompt"
                className={styles.aiInput}
                placeholder="e.g. Modern SaaS dashboard with sidebar and KPI cards"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
                disabled={aiLoading}
                autoComplete="off"
                aria-label="AI layout prompt"
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
            </>
          ) : (
            <>
              <input
                id="ai-screenshot-upload"
                name="screenshot"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={styles.aiFileInput}
                onChange={handleFileSelect}
              />
              {screenshotPreview ? (
                <div className={styles.screenshotPreview}>
                  <img src={screenshotPreview} alt="Screenshot preview" className={styles.screenshotImg} />
                  <div className={styles.screenshotActions}>
                    <button
                      type="button"
                      className={styles.aiBtnSecondary}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={aiLoading}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className={styles.aiBtn}
                      onClick={handleScreenshotExtract}
                      disabled={aiLoading}
                    >
                      {aiLoading ? <Loader2 size={14} className={styles.aiSpinner} /> : <Upload size={14} />}
                      {aiLoading ? "Extracting…" : "Extract Layout"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.aiUploadZone}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = ""; }}
                  onDrop={handleDrop}
                  disabled={aiLoading}
                >
                  <ImageIcon size={24} className={styles.uploadIcon} />
                  <span>Drop or click to upload UI screenshot</span>
                  <span className={styles.uploadHint}>PNG, JPG, WebP • Max 4MB</span>
                </button>
              )}
            </>
          )}
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
