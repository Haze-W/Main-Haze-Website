"use client";

import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { nanoid } from "nanoid";
import type { LucideIcon } from "lucide-react";
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
  PanelRight,
  Component,
} from "lucide-react";
import { buildWindowChromeTopBar } from "@/lib/editor/window-chrome";
import { addLayoutPresetToCanvas, type LayoutPresetId } from "@/lib/editor/layout-presets";
import {
  COMPONENT_PRESETS,
  COMPONENT_CATEGORIES,
  LIBRARY_EXCLUDED_PRESET_KEYS,
} from "@/lib/editor/component-presets";
import { getComponentPresetIcon } from "@/lib/editor/component-preset-icons";
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

function DraggableLibraryPreset({
  presetKey,
  label,
  Icon,
  onActivate,
}: {
  presetKey: string;
  label: string;
  Icon: LucideIcon;
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
        <Icon size={15} strokeWidth={2} aria-hidden />
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
      <span className={styles.sceneComponentIcon}>
        <Component size={20} strokeWidth={2} aria-hidden />
      </span>
      <span className={styles.sceneComponentLabel}>{node.name}</span>
    </div>
  );
}

export function ComponentsPanel({ onOpenIconPicker, onRequestLayersTab }: ComponentsPanelProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const addNode = useEditorStore((s) => s.addNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const sceneMasterComponents = useMemo(() => collectSceneMasterComponents(nodes), [nodes]);
  const [search, setSearch] = useState("");
  const getPos = useCanvasPlacement();

  const q = search.trim().toLowerCase();
  const layoutFiltered = LAYOUT_ROWS.filter((r) => !q || r.name.toLowerCase().includes(q));
  const framesFiltered = FRAME_PRESETS.filter((r) => !q || r.name.toLowerCase().includes(q));

  const librarySections = useMemo(() => {
    const ql = q;
    const presetMatches = (key: string) => {
      const preset = COMPONENT_PRESETS[key];
      if (!preset) return false;
      if (!ql) return true;
      return (
        key.toLowerCase().includes(ql) ||
        preset.name.toLowerCase().includes(ql) ||
        preset.type.toLowerCase().includes(ql)
      );
    };

    return COMPONENT_CATEGORIES.map((cat) => {
      const categoryHit = !ql || cat.label.toLowerCase().includes(ql);
      const keys = cat.keys.filter((key) => {
        if (LIBRARY_EXCLUDED_PRESET_KEYS.has(key)) return false;
        if (!COMPONENT_PRESETS[key]) return false;
        if (categoryHit) return true;
        return presetMatches(key);
      });
      return { label: cat.label, keys };
    }).filter((s) => s.keys.length > 0);
  }, [q]);

  const libraryHasAny = librarySections.length > 0;

  const applyLayoutPreset = (preset: LayoutPresetId) => {
    addLayoutPresetToCanvas(preset, getPos());
  };

  const applyComponentPreset = (presetKey: string) => {
    const preset = COMPONENT_PRESETS[presetKey];
    if (!preset) return;
    const pos = getPos();
    addNode(
      {
        type: preset.type,
        name: preset.name,
        ...pos,
        width: preset.width,
        height: preset.height,
        props: preset.props,
      },
      undefined
    );
    pushHistory();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.searchBar}>
        <form className={styles.searchForm}>
          <Search size={14} className={styles.searchIcon} strokeWidth={2} aria-hidden />
          <input
            id="components-panel-filter"
            name="component_filter"
            type="search"
            placeholder="Filter by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            spellCheck={false}
            autoComplete="off"
            aria-label="Filter components"
          />
        </form>
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
        {!libraryHasAny ? (
          <p className={styles.emptyHint}>No matching elements.</p>
        ) : (
          librarySections.map((section) => (
            <div key={section.label} className={styles.libraryCategory}>
              <div className={styles.libraryCategoryLabel}>{section.label}</div>
              {section.keys.map((key) => {
                const preset = COMPONENT_PRESETS[key];
                if (!preset) return null;
                const Icon = getComponentPresetIcon(key, preset.type);
                return (
                  <DraggableLibraryPreset
                    key={key}
                    presetKey={key}
                    label={preset.name}
                    Icon={Icon}
                    onActivate={() => applyComponentPreset(key)}
                  />
                );
              })}
            </div>
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
