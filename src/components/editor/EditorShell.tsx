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
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  FolderTree,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { tryPasteFromClipboard } from "@/lib/figma/paste-listener";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { Canvas } from "./Canvas";
import { CodePanel } from "@/components/editor/CodePanel";
import { SettingsPanel } from "@/components/editor/SettingsPanel";
import { ExportModal } from "@/components/editor/ExportModal";
import { IconPickerModal } from "@/components/editor/IconPickerModal";
import { ComponentsPanel } from "@/components/editor-v2/ComponentsPanel";
import { PropertiesPanel } from "@/components/editor-v2/PropertiesPanel";
import { PreviewPanel } from "@/components/editor-v2/PreviewPanel";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./EditorShell.module.css";

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
    TOPBAR: "▬",
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
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(node.name);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const updateNode = useEditorStore((s) => s.updateNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isHidden = node.visible === false;
  const isLocked = !!node.locked;

  const commitRename = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== node.name) {
      updateNode(node.id, { name: trimmed });
      pushHistory();
    } else {
      setNameValue(node.name);
    }
    setRenaming(false);
  };

  return (
    <div className={styles.layerGroup}>
      <div
        className={`${styles.layerItem} ${isSelected ? styles.layerSelected : ""} ${isHidden ? styles.layerHidden : ""}`}
        style={{ paddingLeft: depth * 14 + 6 }}
        onClick={(e) => {
          if (renaming) return;
          if (isLocked) return;
          if (e.shiftKey) toggleSelection(node.id);
          else setSelectedIds([node.id]);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setRenaming(true);
          setNameValue(node.name);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button
          type="button"
          className={styles.expandBtn}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          <ChevronRight
            size={10}
            style={{ transition: "transform 120ms ease", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>

        <span className={styles.layerTypeIcon}>{getTypeIcon(node.type)}</span>

        {renaming ? (
          <input
            autoFocus
            className={styles.layerRenameInput}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setNameValue(node.name); setRenaming(false); }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.layerName} style={{ opacity: isHidden ? 0.4 : 1 }}>{node.name}</span>
        )}

        {isLocked && !hovered && (
          <span className={styles.layerBadge} title="Locked"><Lock size={9} /></span>
        )}

        {hovered && !renaming && (
          <div className={styles.layerActions}>
            <button
              type="button"
              className={styles.layerAction}
              title={isHidden ? "Show" : "Hide"}
              onClick={(e) => {
                e.stopPropagation();
                updateNode(node.id, { visible: isHidden ? true : false });
                pushHistory();
              }}
            >
              {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button
              type="button"
              className={styles.layerAction}
              title={isLocked ? "Unlock" : "Lock"}
              onClick={(e) => {
                e.stopPropagation();
                updateNode(node.id, { locked: !isLocked });
                pushHistory();
              }}
            >
              {isLocked ? <Unlock size={11} /> : <Lock size={11} />}
            </button>
            <button
              type="button"
              className={styles.layerAction}
              title="Delete"
              onClick={(e) => { e.stopPropagation(); deleteNodes([node.id]); }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
      {expanded && hasChildren && node.children!.map((child) => (
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
  const [leftTab, setLeftTab] = useState<"explorer" | "assets">("explorer");
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
    pushHistory,
    moveNodes,
    tool,
    setTool,
    mode,
    setMode,
    addNode,
    setNodes,
    viewport,
    setViewport,
    duplicateNodes,
    bringToFront,
    sendToBack,
    groupNodes,
    ungroupNodes,
  } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const lastCanvasPoint = useEditorStore((s) => s.lastCanvasPoint);

  // Auto-save nodes to project storage whenever the scene changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project");
    if (!projectId) return;
    const t = setTimeout(() => {
      try {
        import("@/lib/projects").then(({ saveProject }) => {
          saveProject(projectId, { nodes: nodes as unknown[] });
        });
      } catch { /* ignore */ }
    }, 1000);
    return () => clearTimeout(t);
  }, [nodes]);

  // Load saved project nodes on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project");
    if (!projectId) return;
    import("@/lib/projects").then(({ getProject }) => {
      const project = getProject(projectId);
      if (project?.nodes && Array.isArray(project.nodes) && project.nodes.length > 0) {
        setNodes(project.nodes as Parameters<typeof setNodes>[0]);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPlacement = () => {
    if (lastCanvasPoint) {
      return { x: lastCanvasPoint.x, y: lastCanvasPoint.y };
    }
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
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
      if ((e.key === "h" || e.key === "H") && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setTool("HAND");
        return;
      }
      if (e.key === "Escape") {
        const store = useEditorStore.getState();
        if (store.enteredFrameId) {
          store.exitFrame();
        } else {
          store.setSelectedIds([]);
        }
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
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const nodes = [...selectedIds].map((id) => useEditorStore.getState().getNode(id)).filter(Boolean);
          if (nodes.length > 0) {
            navigator.clipboard.writeText(JSON.stringify({ _renderCopy: true, nodes })).catch(() => {});
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (text) tryPasteFromClipboard(text).catch(() => {});
        }).catch(() => {});
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateNodes([...selectedIds]);
        return;
      }
      if (e.key === "]") {
        e.preventDefault();
        bringToFront([...selectedIds]);
        return;
      }
      if (e.key === "[") {
        e.preventDefault();
        sendToBack([...selectedIds]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupNodes([...selectedIds]);
        else groupNodes([...selectedIds]);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveNodes([...selectedIds], 0, -step);
        pushHistory();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveNodes([...selectedIds], 0, step);
        pushHistory();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveNodes([...selectedIds], -step, 0);
        pushHistory();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveNodes([...selectedIds], step, 0);
        pushHistory();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, deleteNodes, undo, redo, moveNodes, duplicateNodes, setTool, bringToFront, sendToBack, groupNodes, ungroupNodes, pushHistory]);

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
      setViewport({ zoom: Math.min(10, viewport.zoom * 1.25) });
      setMenuOpen(false);
    },
    "View.Zoom Out": () => {
      setViewport({ zoom: Math.max(0.05, viewport.zoom / 1.25) });
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
        { id: "open", label: "Open…", shortcut: "Ctrl+O", action: "File.Open", icon: FolderOpen, disabled: true },
        { id: "save", label: "Save", shortcut: "Ctrl+S", action: "File.Save", icon: Save, disabled: true },
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
        { id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", action: "Edit.Redo", icon: Redo2 },
        { id: "div2", divider: true },
        { id: "cut", label: "Cut", shortcut: "Ctrl+X", action: "Edit.Cut", icon: Scissors, disabled: true },
        { id: "copy", label: "Copy", shortcut: "Ctrl+C", action: "Edit.Copy", icon: Copy, disabled: true },
        { id: "paste", label: "Paste", shortcut: "Ctrl+V", action: "Edit.Paste", icon: ClipboardPaste, disabled: true },
        { id: "div3", divider: true },
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
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft} ref={menuRef}>
          <span className={styles.logoMark}>R</span>

          <nav className={styles.menuBar}>
            {menuStructure.map((group) => (
              <div key={group.id} className={styles.menuBarItem}>
                <button
                  type="button"
                  className={`${styles.menuBarBtn} ${submenuOpen === group.id ? styles.menuBarActive : ""}`}
                  onClick={() => {
                    if (submenuOpen === group.id) {
                      setSubmenuOpen(null);
                      setMenuOpen(false);
                    } else {
                      setSubmenuOpen(group.id);
                      setMenuOpen(true);
                    }
                  }}
                  onMouseEnter={() => {
                    if (menuOpen) setSubmenuOpen(group.id);
                  }}
                >
                  {group.label}
                </button>
                {submenuOpen === group.id && (
                  <div className={styles.menuDropdown}>
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
          </nav>

          <div className={styles.menuDividerV} />

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
          {(["design", "code", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeTab} ${mode === m ? styles.modeActive : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "design" ? "Design" : m === "code" ? "Code" : "▶ Preview"}
            </button>
          ))}
        </div>

        <div className={styles.spacer} />

        {/* Right: undo/redo + zoom + export */}
        <div className={styles.topbarRight}>
          <button type="button" className={styles.iconBtn} onClick={undo} title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button type="button" className={styles.iconBtn} onClick={redo} title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={14} />
          </button>

          <div className={styles.divider} />

          <div className={styles.zoomControl}>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.max(0.05, viewport.zoom / 1.25) })}
              title="Zoom out"
            >
              <Minus size={12} strokeWidth={2.5} />
            </button>
            <span className={styles.zoomLabel}>{Math.round(viewport.zoom * 100)}%</span>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.min(10, viewport.zoom * 1.25) })}
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
                className={`${styles.panelTab} ${leftTab === "explorer" ? styles.tabActive : ""}`}
                onClick={() => setLeftTab("explorer")}
              >
                Explorer
              </button>
              <button
                type="button"
                className={`${styles.panelTab} ${leftTab === "assets" ? styles.tabActive : ""}`}
                onClick={() => setLeftTab("assets")}
              >
                Assets
              </button>
            </div>

            {leftTab === "explorer" ? (
              <div className={styles.explorerPanel}>
                <div className={styles.explorerHeader}>
                  <FolderTree size={13} className={styles.explorerIcon} />
                  <span className={styles.explorerTitle}>Explorer</span>
                  <span className={styles.explorerCount}>{nodes.length}</span>
                </div>
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
            {mode === "preview" && <PreviewPanel />}
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
          const { downloadProjectFromSceneNodes } = await import("@/lib/tauri-export");
          const nodes = useEditorStore.getState().nodes;
          const exportName = (settings.appName ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "my-tauri-app";
          await downloadProjectFromSceneNodes(nodes, exportName, settings);
        }}
      />
    </div>
  );
}
