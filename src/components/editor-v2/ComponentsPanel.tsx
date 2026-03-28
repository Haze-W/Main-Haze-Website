"use client";

import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { nanoid } from "nanoid";
import {
  Search,
  Monitor,
  AppWindow,
  Smartphone,
  RectangleHorizontal,
  LayoutTemplate,
  Square,
  LayoutGrid,
  Columns2,
  Rows3,
  Minus,
  SquareStack,
  Box,
  PanelRight,
} from "lucide-react";
import { buildWindowChromeTopBar } from "@/lib/editor/window-chrome";
import { addLayoutPresetToCanvas, type LayoutPresetId } from "@/lib/editor/layout-presets";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./ComponentsPanel.module.css";

interface ComponentsPanelProps {
  onOpenIconPicker: () => void;
  onRequestLayersTab?: () => void;
}

const FRAME_PRESETS: { id: string; name: string; width: number; height: number; Icon: typeof Monitor }[] = [
  { id: "ide", name: "IDE", width: 1440, height: 900, Icon: Monitor },
  { id: "desktop", name: "Desktop", width: 1280, height: 800, Icon: AppWindow },
  { id: "app", name: "App", width: 375, height: 812, Icon: Smartphone },
  { id: "wide", name: "Wide", width: 1920, height: 1080, Icon: RectangleHorizontal },
];

const LAYOUT_ROWS: { id: LayoutPresetId; name: string; Icon: typeof Square }[] = [
  { id: "container", name: "Container", Icon: LayoutTemplate },
  { id: "panel", name: "Panel", Icon: PanelRight },
  { id: "grid", name: "Grid", Icon: LayoutGrid },
  { id: "flex-row", name: "Flex Row", Icon: Rows3 },
  { id: "flex-col", name: "Flex Col", Icon: Columns2 },
  { id: "divider", name: "Divider", Icon: Minus },
  { id: "spacer", name: "Spacer", Icon: Square },
  { id: "rectangle", name: "Rectangle", Icon: SquareStack },
];

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

function useCanvasPlacement() {
  const lastCanvasPoint = useEditorStore((s) => s.lastCanvasPoint);
  const nodeCount = useEditorStore((s) => s.nodes.length);
  return () => {
    if (lastCanvasPoint) return { x: lastCanvasPoint.x, y: lastCanvasPoint.y };
    const offset = nodeCount * 24;
    return { x: 120 + offset, y: 120 + offset };
  };
}

function addRootFrameWithChrome(
  width: number,
  height: number,
  name: string,
  pos: { x: number; y: number },
  pushHistory: () => void
) {
  const frameId = nanoid();
  const topBar = buildWindowChromeTopBar(frameId, width);
  const frame: SceneNode = {
    id: frameId,
    type: "FRAME",
    name,
    x: pos.x,
    y: pos.y,
    width,
    height,
    overflow: "HIDDEN",
    visible: true,
    locked: false,
    children: [topBar],
    props: { backgroundColor: "#0f172a" },
  };
  useEditorStore.setState((s) => ({
    nodes: [...s.nodes, frame],
    selectedIds: new Set([frameId]),
  }));
  pushHistory();
}

function DraggableLayoutRow({
  preset,
  name,
  Icon,
  onActivate,
}: {
  preset: LayoutPresetId;
  name: string;
  Icon: typeof Square;
  onActivate: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-preset-${preset}`,
    data: { type: "layoutPreset", preset },
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.assetRow} ${isDragging ? styles.dragging : ""}`}
      onClick={() => onActivate()}
    >
      <span className={styles.assetRowIcon}>
        <Icon size={14} strokeWidth={2} />
      </span>
      <span className={styles.assetRowLabel}>{name}</span>
    </button>
  );
}

function presetGlyph(type: string): string {
  const map: Record<string, string> = {
    FRAME: "⊞",
    TEXT: "T",
    BUTTON: "⬚",
    INPUT: "▭",
    RECTANGLE: "▢",
    ICON: "◇",
    CONTAINER: "▦",
    PANEL: "▤",
    IMAGE: "🖼",
    COMPONENT: "◫",
    CHECKBOX: "☐",
    SELECT: "▾",
    LIST: "≡",
    DIVIDER: "—",
    SPACER: "□",
    TOPBAR: "▬",
  };
  return map[type] ?? "▣";
}

function DraggableLibraryPreset({
  presetKey,
  label,
  glyph,
  onActivate,
}: {
  presetKey: string;
  label: string;
  glyph: string;
  onActivate: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `component-preset-${presetKey}`,
    data: { type: "component", key: presetKey },
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.assetRow} ${isDragging ? styles.dragging : ""}`}
      onClick={() => onActivate()}
      title={label}
    >
      <span className={styles.assetRowIcon}>
        <span className={styles.assetGlyphText}>{glyph}</span>
      </span>
      <span className={styles.assetRowLabel}>{label}</span>
    </button>
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

export function ComponentsPanel({ onOpenIconPicker, onRequestLayersTab }: ComponentsPanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const sceneMasterComponents = useMemo(() => collectSceneMasterComponents(nodes), [nodes]);
  const [search, setSearch] = useState("");
  const getPos = useCanvasPlacement();

  const q = search.trim().toLowerCase();
  const layoutFiltered = LAYOUT_ROWS.filter((r) => !q || r.name.toLowerCase().includes(q));
  const framesFiltered = FRAME_PRESETS.filter((r) => !q || r.name.toLowerCase().includes(q));

  const applyLayoutPreset = (preset: LayoutPresetId) => {
    addLayoutPresetToCanvas(preset, getPos());
  };

  return (
    <div className={styles.panel}>
      <div className={styles.pillTabs}>
        <button
          type="button"
          className={styles.pillTab}
          onClick={() => onRequestLayersTab?.()}
        >
          Layers
        </button>
        <button type="button" className={`${styles.pillTab} ${styles.pillTabActive}`} disabled>
          Assets
        </button>
      </div>

      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} strokeWidth={2} aria-hidden />
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

      <button type="button" className={styles.browseIconsRow} onClick={onOpenIconPicker}>
        Browse Icons
      </button>

      <div className={styles.unifiedScroll}>
        <div className={styles.sectionLabel}>Frames</div>
        {framesFiltered.map((row) => (
          <button
            key={row.id}
            type="button"
            className={styles.assetRow}
            onClick={() => addRootFrameWithChrome(row.width, row.height, row.name, getPos(), pushHistory)}
          >
            <span className={styles.assetRowIcon}>
              <row.Icon size={14} strokeWidth={2} />
            </span>
            <span className={styles.assetRowLabel}>{row.name}</span>
          </button>
        ))}

        <div className={styles.sectionLabel}>Layout</div>
        {layoutFiltered.map((row) => (
          <DraggableLayoutRow
            key={row.id}
            preset={row.id}
            name={row.name}
            Icon={row.Icon}
            onActivate={() => applyLayoutPreset(row.id)}
          />
        ))}

        <div className={styles.sectionLabel}>Library</div>
        {libraryFiltered.length === 0 ? (
          <p className={styles.emptyHint}>No matching elements.</p>
        ) : (
          libraryFiltered.map(({ key, preset }) => (
            <DraggableLibraryPreset
              key={key}
              presetKey={key}
              label={preset.name}
              glyph={presetGlyph(preset.type)}
              onActivate={() => applyComponentPreset(key)}
            />
          ))
        )}

        <div className={styles.sectionLabel}>Components</div>
        {sceneMasterComponents.length === 0 ? (
          <p className={styles.emptyHint}>No components yet. Select elements and press Ctrl+Alt+K.</p>
        ) : (
          <div className={styles.sceneComponentsGrid}>
            {sceneMasterComponents.map((n) => (
              <DraggableSceneComponent key={n.id} node={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
