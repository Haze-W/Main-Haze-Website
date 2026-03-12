"use client";

import { useState, useEffect, useRef, type ComponentType } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
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
  ChevronRight,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { useEditorStore as useLegacyStore } from "@/lib/editor-store";
import { sceneNodesToFrames } from "@/lib/editor/adapter";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { Canvas } from "./Canvas";
import { CodePanel } from "@/components/editor/CodePanel";
import { SettingsPanel } from "@/components/editor/SettingsPanel";
import { ExportModal } from "@/components/editor/ExportModal";
import { IconPickerModal } from "@/components/editor/IconPickerModal";
import { ComponentsPanel } from "./ComponentsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./EditorShell.module.css";

// ---------- Properly-typed menu item types (fixes build error) ----------
type LucideIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

interface MenuActionItem {
  id: string;
  divider?: false;
  label: string;
  shortcut?: string;
  action: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface MenuDividerItem {
  id: string;
  divider: true;
}

type MenuEntry = MenuActionItem | MenuDividerItem;

interface MenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuEntry[];
}
// -----------------------------------------------------------------------

function getTypeIcon(type: string): string {
  const map: Record<string, string> = {
    FRAME: "⊞",
    TEXT: "T",
    BUTTON: "⬚",
    INPUT: "▭",
    RECTANGLE: "▢",
    ICON: "◆",
    IMAGE: "🖼",
    CONTAINER: "▦",
    PANEL: "▤",
    DIVIDER: "—",
    SPACER: "□",
    LIST: "≡",
    CHECKBOX: "☐",
    SELECT: "▾",
  };
  return map[type] ?? "•";
}

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
        className={`${styles.layerItem} ${isSelected ? styles.layerSelected : ""}`}
        style={{ paddingLeft: depth * 14 + 6 }}
        onClick={() => setSelectedIds([node.id])}
      >
        <button
          type="button"
          className={styles.expandBtn}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <ChevronRight
            size={10}
            style={{
              transition: "transform 120ms ease",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        </button>
        <span className={styles.layerTypeIcon}>{getTypeIcon(node.type)}</span>
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
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<"layers" | "assets">("layers");
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Untitled");
  const [editingName, setEditingName] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    nodes,
    selectedIds,
    deleteNodes,
    undo,
    redo,
    moveNodes,
    tool,
    setTool,
    mode,
    setMode,
    addNode,
    viewport,
    setViewport,
    duplicateNodes,
  } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getPlacement = () => {
    const offset = nodes.length * 24;
    return { x: 120 + offset, y: 120 };
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
    const data = active.data.current as
      | { type?: string; key?: string; iconName?: string }
      | undefined;
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;

      if (e.key === "v" || e.key === "V") {
        setTool("SELECT");
        return;
      }
      if (e.key === "f" || e.key === "F") {
        setTool("FRAME");
        return;
      }
      if (e.key === "h" || e.key === "H") {
        setTool("HAND");
        return;
      }
      if (e.key === "Escape") {
        useEditorStore.getState().setSelectedIds([]);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteNodes([...selectedIds]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateNodes([...selectedIds]);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
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
  }, [selectedIds, deleteNodes, undo, redo, moveNodes, duplicateNodes, setTool]);

  // Close menu on outside click
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

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.select();
    }
  }, [editingName]);

  const menuActions: Record<string, () => void> = {
    "File.New": () => {
      useEditorStore.getState().setNodes([]);
      setMenuOpen(false);
    },
    "File.Export": () => {
      setExportOpen(true);
      setMenuOpen(false);
    },
    "Edit.Undo": () => {
      undo();
      setMenuOpen(false);
    },
    "Edit.Redo": () => {
      redo();
      setMenuOpen(false);
    },
    "Edit.Duplicate": () => {
      duplicateNodes([...selectedIds]);
      setMenuOpen(false);
    },
    "Edit.Delete": () => {
      deleteNodes([...selectedIds]);
      setMenuOpen(false);
    },
    "View.Zoom In": () => {
      setViewport({ zoom: Math.min(40, viewport.zoom * 1.25) });
      setMenuOpen(false);
    },
    "View.Zoom Out": () => {
      setViewport({ zoom: Math.max(0.1, viewport.zoom / 1.25) });
      setMenuOpen(false);
    },
    "View.Reset Zoom": () => {
      setViewport({ zoom: 1, panX: 0, panY: 0 });
      setMenuOpen(false);
    },
    "Insert.Frame": () => {
      setTool("FRAME");
      setMenuOpen(false);
    },
    "Insert.Component": () => {
      setLeftTab("assets");
      setMenuOpen(false);
    },
  };

  const menuStructure: MenuGroup[] = [
    {
      id: "file",
      label: "File",
      icon: FilePlus,
      items: [
        { id: "new", label: "New", shortcut: "Ctrl+N", action: "File.New", icon: FilePlus },
        {
          id: "open",
          label: "Open…",
          shortcut: "Ctrl+O",
          action: "File.Open",
          icon: FolderOpen,
          disabled: true,
        },
        {
          id: "save",
          label: "Save",
          shortcut: "Ctrl+S",
          action: "File.Save",
          icon: Save,
          disabled: true,
        },
        { id: "div1", divider: true },
        { id: "export", label: "Export", shortcut: "Ctrl+E", action: "File.Export", icon: Download },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      icon: Clipboard,
      items: [
        { id: "undo", label: "Undo", shortcut: "Ctrl+Z", action: "Edit.Undo", icon: Undo2 },
        {
          id: "redo",
          label: "Redo",
          shortcut: "Ctrl+Shift+Z",
          action: "Edit.Redo",
          icon: Redo2,
        },
        { id: "div2", divider: true },
        {
          id: "cut",
          label: "Cut",
          shortcut: "Ctrl+X",
          action: "Edit.Cut",
          icon: Scissors,
          disabled: true,
        },
        {
          id: "copy",
          label: "Copy",
          shortcut: "Ctrl+C",
          action: "Edit.Copy",
          icon: Copy,
          disabled: true,
        },
        {
          id: "paste",
          label: "Paste",
          shortcut: "Ctrl+V",
          action: "Edit.Paste",
          icon: ClipboardPaste,
          disabled: true,
        },
        { id: "div3", divider: true },
        {
          id: "duplicate",
          label: "Duplicate",
          shortcut: "Ctrl+D",
          action: "Edit.Duplicate",
          icon: Copy,
        },
        { id: "delete", label: "Delete", shortcut: "Del", action: "Edit.Delete", icon: Scissors },
      ],
    },
    {
      id: "view",
      label: "View",
      icon: ZoomIn,
      items: [
        {
          id: "zoomin",
          label: "Zoom In",
          shortcut: "Ctrl++",
          action: "View.Zoom In",
          icon: ZoomIn,
        },
        {
          id: "zoomout",
          label: "Zoom Out",
          shortcut: "Ctrl+-",
          action: "View.Zoom Out",
          icon: ZoomOut,
        },
        {
          id: "reset",
          label: "Reset Zoom",
          shortcut: "Ctrl+0",
          action: "View.Reset Zoom",
          icon: RotateCcw,
        },
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
        {
          id: "docs",
          label: "Documentation",
          action: "Help.Docs",
          icon: BookOpen,
          disabled: true,
        },
        {
          id: "shortcuts",
          label: "Keyboard Shortcuts",
          action: "Help.Shortcuts",
          icon: Keyboard,
          disabled: true,
        },
      ],
    },
  ];

  return (
    <div className={styles.shell}>
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className={styles.topbar}>
        {/* Left: logo/menu + project name */}
        <div className={styles.topbarLeft} ref={menuRef}>
          <button
            type="button"
            className={styles.logoBtn}
            onClick={() => {
              setMenuOpen((v) => !v);
              setSubmenuOpen(null);
            }}
            title="Menu"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <span className={styles.logoMark}>R</span>
          </button>

          {editingName ? (
            <input
              ref={nameInputRef}
              className={styles.nameInput}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setEditingName(false);
              }}
            />
          ) : (
            <button
              type="button"
              className={styles.nameBtn}
              onClick={() => setEditingName(true)}
              title="Rename project"
            >
              {projectName}
            </button>
          )}

          {/* App menu dropdown */}
          {menuOpen && (
            <div className={styles.menuDropdown}>
              {menuStructure.map((group) => (
                <div
                  key={group.id}
                  className={styles.menuGroup}
                  onMouseEnter={() => setSubmenuOpen(group.id)}
                  onMouseLeave={() => setSubmenuOpen(null)}
                >
                  <div className={styles.menuGroupRow}>
                    <group.icon size={13} className={styles.menuGroupIcon} />
                    <span>{group.label}</span>
                    <ChevronRight size={10} className={styles.menuArrow} />
                  </div>
                  {submenuOpen === group.id && (
                    <div className={styles.submenu}>
                      {group.items.map((item, idx) =>
                        item.divider ? (
                          <div key={`div-${idx}`} className={styles.menuDivider} />
                        ) : (
                          <button
                            key={item.id}
                            type="button"
                            className={styles.submenuItem}
                            disabled={item.disabled}
                            onClick={() => {
                              const action = menuActions[item.action];
                              action?.();
                            }}
                          >
                            <item.icon size={13} className={styles.submenuIcon} />
                            <span className={styles.submenuLabel}>{item.label}</span>
                            {item.shortcut && (
                              <span className={styles.shortcut}>{item.shortcut}</span>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center: tool buttons */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${tool === "SELECT" ? styles.toolActive : ""}`}
            onClick={() => setTool("SELECT")}
            title="Select (V)"
          >
            <MousePointer2 size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${tool === "FRAME" ? styles.toolActive : ""}`}
            onClick={() => setTool("FRAME")}
            title="Frame (F)"
          >
            <Layout size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${tool === "HAND" ? styles.toolActive : ""}`}
            onClick={() => setTool("HAND")}
            title="Hand (H)"
          >
            <Hand size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className={styles.modeTabs}>
          {(["design", "code"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeTab} ${mode === m ? styles.modeActive : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "design" ? "Design" : "Code"}
            </button>
          ))}
        </div>

        <div className={styles.spacer} />

        {/* Right: undo/redo + zoom + export */}
        <div className={styles.topbarRight}>
          <button type="button" className={styles.iconBtn} onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={redo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>

          <div className={styles.divider} />

          <div className={styles.zoomControl} title="Ctrl/Cmd + scroll or Shift + scroll to zoom">
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.max(0.01, viewport.zoom / 1.25) })}
              title="Zoom out"
            >
              <Minus size={12} strokeWidth={2.5} />
            </button>
            <span className={styles.zoomLabel}>{Math.round(viewport.zoom * 100)}%</span>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.min(40, viewport.zoom * 1.25) })}
              title="Zoom in"
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
          </div>

          <div className={styles.divider} />

          <button
            type="button"
            className={styles.exportBtn}
            onClick={() => setExportOpen(true)}
          >
            Export
          </button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={styles.body}>
          {/* Left panel */}
          <aside className={styles.leftPanel}>
            <div className={styles.panelTabs}>
              <button
                type="button"
                className={`${styles.panelTab} ${leftTab === "layers" ? styles.tabActive : ""}`}
                onClick={() => setLeftTab("layers")}
              >
                Layers
              </button>
              <button
                type="button"
                className={`${styles.panelTab} ${leftTab === "assets" ? styles.tabActive : ""}`}
                onClick={() => setLeftTab("assets")}
              >
                Assets
              </button>
            </div>

            {leftTab === "layers" ? (
              <div className={styles.layerTree}>
                {nodes.length === 0 ? (
                  <div className={styles.layerEmpty}>No layers yet</div>
                ) : (
                  nodes.map((node, i) => (
                    <LayerItem
                      key={`${node.id}-${i}`}
                      node={node}
                      isSelected={selectedIds.has(node.id)}
                      depth={0}
                    />
                  ))
                )}
              </div>
            ) : (
              <ComponentsPanel
                onAddComponent={handleAddComponent}
                onOpenIconPicker={() => setIconPickerOpen(true)}
              />
            )}
          </aside>

          {/* Canvas / code view */}
          <main className={styles.canvasArea}>
            {mode === "design" && <Canvas />}
            {mode === "code" && <CodePanel />}
            {mode === "settings" && <SettingsPanel />}
          </main>

          {/* Right panel */}
          {mode === "design" && (
            <aside className={styles.rightPanel}>
              <PropertiesPanel />
            </aside>
          )}
        </div>
      </DndContext>

      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconName) => {
          handleAddIcon(iconName);
          setIconPickerOpen(false);
        }}
      />

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
