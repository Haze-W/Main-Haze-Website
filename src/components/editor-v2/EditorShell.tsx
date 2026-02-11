"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Menu,
  MousePointer2,
  Layout,
  Hand,
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  Layers,
  HelpCircle,
  BookOpen,
  Keyboard,
  Clipboard,
  Plus,
  Minus,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { useEditorStore as useLegacyStore } from "@/lib/editor-store";
import { sceneNodesToFrames } from "@/lib/editor/adapter";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { Canvas } from "./Canvas";
import { CodePanel } from "@/components/editor/CodePanel";
import { SettingsPanel } from "@/components/editor/SettingsPanel";
import { ExportModal } from "@/components/editor/ExportModal";
import { ComponentsPanel } from "./ComponentsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./EditorShell.module.css";

function LayerItem({
  node,
  isSelected,
  depth,
}: {
  node: SceneNode;
  isSelected: boolean;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <div className={styles.layerGroup}>
      <div
        className={`${styles.layerItem} ${isSelected ? styles.selected : ""}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => setSelectedIds([node.id])}
      >
        <button
          type="button"
          className={styles.expandBtn}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <span className={styles.layerIcon}>{node.type === "FRAME" ? "⊞" : "•"}</span>
        <span className={styles.layerName}>{node.name}</span>
      </div>
      {expanded &&
        hasChildren &&
        node.children!.map((child) => (
          <LayerItem
            key={child.id}
            node={child}
            isSelected={selectedIds.has(child.id)}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function EditorShell() {
  const [exportOpen, setExportOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<"layers" | "components">("layers");
  const { nodes, selectedIds, deleteNodes, undo, redo, moveNodes, tool, setTool, mode, setMode, addNode } =
    useEditorStore();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const getPlacement = () => {
    const offset = nodes.length * 28;
    return { x: 150 + offset, y: 150 };
  };

  const handleAddComponent = (key: string, x?: number, y?: number) => {
    const preset = COMPONENT_PRESETS[key];
    if (!preset) return;
    const pos = x != null && y != null ? { x, y } : getPlacement();
    addNode({
      type: preset.type,
      name: preset.name,
      ...pos,
      width: preset.width,
      height: preset.height,
      props: preset.props,
    });
  };

  const handleAddIcon = (iconName: string, x?: number, y?: number) => {
    const pos = x != null && y != null ? { x, y } : getPlacement();
    addNode({
      type: "ICON",
      name: "Icon",
      ...pos,
      width: 24,
      height: 24,
      props: { iconName },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || over.id !== "canvas-drop") return;
    const data = active.data.current as { type?: string; key?: string; iconName?: string } | undefined;
    const pos = getPlacement();
    if (data?.type === "component" && data.key) {
      handleAddComponent(data.key, pos.x, pos.y);
    } else if (data?.type === "icon" && data.iconName) {
      handleAddIcon(data.iconName, pos.x, pos.y);
    }
  };
  const legacySetFrames = useLegacyStore((s) => s.setFrames);
  const legacySetActiveFrame = useLegacyStore((s) => s.setActiveFrame);

  useEffect(() => {
    const frames = sceneNodesToFrames(nodes);
    if (frames.length > 0) {
      legacySetFrames(frames);
      legacySetActiveFrame(frames[0].id);
    }
  }, [nodes, legacySetFrames, legacySetActiveFrame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteNodes([...selectedIds]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      const step = e.shiftKey ? 10 : 5;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveNodes([...selectedIds], 0, -step);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveNodes([...selectedIds], 0, step);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveNodes([...selectedIds], -step, 0);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveNodes([...selectedIds], step, 0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, deleteNodes, undo, redo, moveNodes]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const setViewport = useEditorStore((s) => s.setViewport);
  const viewport = useEditorStore((s) => s.viewport);
  const duplicateNodes = useEditorStore((s) => s.duplicateNodes);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSubmenuOpen(null);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  const menuActions: Record<string, () => void> = {
    "File.New": () => { useEditorStore.getState().setNodes([]); setMenuOpen(false); },
    "File.Export": () => { setExportOpen(true); setMenuOpen(false); },
    "Edit.Undo": () => { undo(); setMenuOpen(false); },
    "Edit.Redo": () => { redo(); setMenuOpen(false); },
    "Edit.Duplicate": () => { duplicateNodes([...selectedIds]); setMenuOpen(false); },
    "Edit.Delete": () => { deleteNodes([...selectedIds]); setMenuOpen(false); },
    "View.Zoom In": () => { setViewport({ zoom: Math.min(40, viewport.zoom * 1.25) }); setMenuOpen(false); },
    "View.Zoom Out": () => { setViewport({ zoom: Math.max(0.1, viewport.zoom / 1.25) }); setMenuOpen(false); },
    "View.Reset Zoom": () => { setViewport({ zoom: 1, panX: 0, panY: 0 }); setMenuOpen(false); },
    "Insert.Frame": () => { setTool("FRAME"); setLeftTab("layers"); setMenuOpen(false); },
    "Insert.Component": () => { setLeftTab("components"); setMenuOpen(false); },
  };

  const menuStructure = [
    {
      id: "file",
      label: "File",
      icon: FilePlus,
      items: [
        { id: "new", label: "New", shortcut: "Ctrl+N", action: "File.New", icon: FilePlus },
        { id: "open", label: "Open...", shortcut: "Ctrl+O", action: "File.Open", icon: FolderOpen, disabled: true },
        { id: "save", label: "Save", shortcut: "Ctrl+S", action: "File.Save", icon: Save, disabled: true },
        { divider: true },
        { id: "export", label: "Export", shortcut: "Ctrl+E", action: "File.Export", icon: Download },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      icon: Clipboard,
      items: [
        { id: "undo", label: "Undo", shortcut: "Ctrl+Z", action: "Edit.Undo", icon: Undo2 },
        { id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", action: "Edit.Redo", icon: Redo2 },
        { divider: true },
        { id: "cut", label: "Cut", shortcut: "Ctrl+X", action: "Edit.Cut", icon: Scissors, disabled: true },
        { id: "copy", label: "Copy", shortcut: "Ctrl+C", action: "Edit.Copy", icon: Copy, disabled: true },
        { id: "paste", label: "Paste", shortcut: "Ctrl+V", action: "Edit.Paste", icon: ClipboardPaste, disabled: true },
        { divider: true },
        { id: "duplicate", label: "Duplicate", shortcut: "Ctrl+D", action: "Edit.Duplicate", icon: Copy },
        { id: "delete", label: "Delete", shortcut: "Del", action: "Edit.Delete", icon: Scissors },
      ],
    },
    {
      id: "view",
      label: "View",
      icon: ZoomIn,
      items: [
        { id: "zoomin", label: "Zoom In", shortcut: "Ctrl++", action: "View.Zoom In", icon: ZoomIn },
        { id: "zoomout", label: "Zoom Out", shortcut: "Ctrl+-", action: "View.Zoom Out", icon: ZoomOut },
        { id: "reset", label: "Reset Zoom", shortcut: "Ctrl+0", action: "View.Reset Zoom", icon: RotateCcw },
      ],
    },
    {
      id: "insert",
      label: "Insert",
      icon: Square,
      items: [
        { id: "frame", label: "Frame", shortcut: "F", action: "Insert.Frame", icon: Layout },
        { id: "component", label: "Component", action: "Insert.Component", icon: Layers },
      ],
    },
    {
      id: "help",
      label: "Help",
      icon: HelpCircle,
      items: [
        { id: "docs", label: "Documentation", action: "Help.Docs", icon: BookOpen, disabled: true },
        { id: "shortcuts", label: "Keyboard Shortcuts", action: "Help.Shortcuts", icon: Keyboard, disabled: true },
      ],
    },
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft} ref={menuRef}>
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMenuOpen(!menuOpen)}
            title="Menu"
            aria-expanded={menuOpen}
          >
            <Menu size={18} strokeWidth={2} />
          </button>
          <span className={styles.brand}>Render</span>
          {menuOpen && (
            <div className={styles.menuDropdown}>
              {menuStructure.map((m) => (
                <div
                  key={m.id}
                  className={styles.menuGroup}
                  onMouseEnter={() => setSubmenuOpen(m.id)}
                  onMouseLeave={() => setSubmenuOpen(null)}
                >
                  <div className={styles.menuItem}>
                    <m.icon size={14} className={styles.menuItemIcon} />
                    <span>{m.label}</span>
                    <span className={styles.menuArrow}>▸</span>
                  </div>
                  {submenuOpen === m.id && (
                    <div className={styles.submenu}>
                      {m.items.map((item, idx) =>
                        "divider" in item && item.divider ? (
                          <div key={`${m.id}-div-${idx}`} className={styles.menuDivider} />
                        ) : "id" in item ? (
                          <button
                            key={item.id}
                            type="button"
                            className={styles.submenuItem}
                            disabled={"disabled" in item && item.disabled}
                            onClick={() => {
                              const action = "action" in item ? menuActions[item.action as string] : null;
                              if (action) action();
                            }}
                          >
                            {"icon" in item && <item.icon size={14} className={styles.submenuIcon} />}
                            <span>{"label" in item && item.label}</span>
                            {"shortcut" in item && item.shortcut && (
                              <span className={styles.shortcut}>{item.shortcut}</span>
                            )}
                          </button>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.modeTabs}>
          {(["design", "code", "settings"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeTab} ${mode === m ? styles.active : ""}`}
              onClick={() => setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        {mode === "design" && (
          <div className={styles.zoomControls}>
            <ZoomIn size={14} className={styles.zoomIcon} aria-hidden />
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.max(0.01, viewport.zoom / 1.25) })}
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus size={14} strokeWidth={2.5} />
            </button>
            <span className={styles.zoomLabel}>{Math.round(viewport.zoom * 100)}%</span>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.min(40, viewport.zoom * 1.25) })}
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.exportBtn}
          onClick={() => setExportOpen(true)}
        >
          Export
        </button>
      </header>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className={styles.content}>
        <aside className={styles.leftPanel}>
          <div className={styles.leftTabs}>
            <button
              type="button"
              className={`${styles.leftTab} ${leftTab === "layers" ? styles.active : ""}`}
              onClick={() => setLeftTab("layers")}
            >
              Layers
            </button>
            <button
              type="button"
              className={`${styles.leftTab} ${leftTab === "components" ? styles.active : ""}`}
              onClick={() => setLeftTab("components")}
            >
              Components
            </button>
          </div>
          {leftTab === "layers" ? (
            <div className={styles.layerTree}>
              {nodes.map((node) => (
                <LayerItem
                  key={node.id}
                  node={node}
                  isSelected={selectedIds.has(node.id)}
                  depth={0}
                />
              ))}
            </div>
          ) : (
            <ComponentsPanel
              onAddComponent={handleAddComponent}
              onAddIcon={handleAddIcon}
            />
          )}
        </aside>
        <main className={styles.canvasArea}>
          {mode === "design" && <Canvas />}
          {mode === "code" && <CodePanel />}
          {mode === "settings" && <SettingsPanel />}
          {mode === "design" && (
            <div className={styles.toolsBar}>
              <button
                type="button"
                className={`${styles.toolBtn} ${tool === "SELECT" ? styles.active : ""}`}
                onClick={() => setTool("SELECT")}
                title="Select (V)"
              >
                <MousePointer2 size={18} strokeWidth={2} />
                <span>Select</span>
              </button>
              <button
                type="button"
                className={`${styles.toolBtn} ${tool === "FRAME" ? styles.active : ""}`}
                onClick={() => setTool("FRAME")}
                title="Frame (F)"
              >
                <Layout size={18} strokeWidth={2} />
                <span>Frame</span>
              </button>
              <button
                type="button"
                className={`${styles.toolBtn} ${tool === "HAND" ? styles.active : ""}`}
                onClick={() => setTool("HAND")}
                title="Hand (H)"
              >
                <Hand size={18} strokeWidth={2} />
                <span>Hand</span>
              </button>
            </div>
          )}
        </main>
        {mode === "design" && (
          <aside className={styles.rightPanel}>
            <PropertiesPanel />
          </aside>
        )}
      </div>
      </DndContext>
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onDownload={async (settings) => {
          const { preloadLucideIcons } = await import("@/lib/icon-svg");
          await preloadLucideIcons();
          const { downloadProject } = await import("@/lib/tauri-export");
          const frames = sceneNodesToFrames(useEditorStore.getState().nodes);
          const activeId = frames[0]?.id ?? null;
          await downloadProject(frames, activeId, "my-tauri-app", settings);
        }}
      />
    </div>
  );
}
