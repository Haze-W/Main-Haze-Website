"use client";

import { useState, useEffect, useRef, type ComponentType } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  MousePointer2,
  Layout,
  Hand,
  Minus,
  Plus,
  Play,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Search,
  Settings,
  PanelLeft,
  MessageSquare,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { tryPasteFromClipboard } from "@/lib/figma/paste-listener";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { Canvas } from "./Canvas";
import { CodePanel } from "@/components/editor/CodePanel";
import { SettingsPopover } from "./SettingsPopover";
import { SaveAsModal } from "./SaveAsModal";
import { ExportModal } from "@/components/editor/ExportModal";
import { IconPickerModal } from "@/components/editor/IconPickerModal";
import { ComponentsPanel } from "./ComponentsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { PreviewPanel } from "./PreviewPanel";
import { BottomAIPrompt } from "./BottomAIPrompt";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./EditorShell.module.css";

type LucideIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

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
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(node.name);

  useEffect(() => {
    if (!renaming) setNameValue(node.name);
  }, [node.name, renaming]);

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
        className={`${styles.layerItem} ${isSelected ? styles.layerItemSelected : ""} ${isHidden ? styles.layerHidden : ""}`}
        style={{ paddingLeft: depth * 14 + 6, position: "relative" }}
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
        <div className={styles.layerIcon}>
          <span className={styles.layerTypeIcon}>{getTypeIcon(node.type)}</span>
        </div>
        {renaming ? (
          <input
            autoFocus
            className={styles.layerRenameInput}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setNameValue(node.name);
                setRenaming(false);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.layerName} style={{ opacity: isHidden ? 0.4 : 1 }}>
            {node.name}
          </span>
        )}
        {isLocked && (
          <span className={styles.layerBadge} title="Locked">
            <Lock size={9} />
          </span>
        )}
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
            onClick={(e) => {
              e.stopPropagation();
              deleteNodes([node.id]);
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
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
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const searchParams = useSearchParams();
  const currentProjectId = searchParams.get("project");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [settingsPopoverOpen, setSettingsPopoverOpen] = useState(false);
  const [sidebarLeftVisible, setSidebarLeftVisible] = useState(true);
  const [leftTab, setLeftTab] = useState<"layers" | "components">("layers");
  const [rightTab, setRightTab] = useState<"design" | "code">("design");
  const [projectName, setProjectName] = useState("Untitled");
  const [editingName, setEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  const theme = useEditorStore((s) => s.theme);

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
      } catch {
        /* ignore */
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [nodes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("project");
    if (!projectId) return;
    import("@/lib/projects")
      .then(({ getProject }) => {
        const project = getProject(projectId);
        if (!project) return;
        setProjectName(project.name || "Untitled");
        if (project.nodes && Array.isArray(project.nodes) && project.nodes.length > 0) {
          setNodes(project.nodes as Parameters<typeof setNodes>[0]);
        }
      })
      .catch(() => {});
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
    const data = active.data.current as
      | { type?: string; key?: string; iconName?: string }
      | undefined;
    const pos = getPlacement();
    if (data?.type === "component" && data.key) {
      if (over?.id === "canvas-drop") {
        handleAddComponent(data.key, pos.x, pos.y);
      } else {
        handleAddComponent(data.key);
      }
    } else if (data?.type === "icon" && data.iconName) {
      if (over?.id === "canvas-drop") {
        handleAddIcon(data.iconName, pos.x, pos.y);
      } else {
        handleAddIcon(data.iconName);
      }
    }
  };

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
          const nodes = [...selectedIds]
            .map((id) => useEditorStore.getState().getNode(id))
            .filter(Boolean);
          if (nodes.length > 0) {
            navigator.clipboard
              .writeText(JSON.stringify({ _renderCopy: true, nodes }))
              .catch(() => {});
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        navigator.clipboard
          .readText()
          .then((text) => {
            if (text) tryPasteFromClipboard(text).catch(() => {});
          })
          .catch(() => {});
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
  }, [
    selectedIds,
    deleteNodes,
    undo,
    redo,
    moveNodes,
    duplicateNodes,
    setTool,
    bringToFront,
    sendToBack,
    groupNodes,
    ungroupNodes,
    pushHistory,
  ]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const filteredNodes = searchQuery
    ? nodes.filter((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nodes;

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div
        className={styles.shell}
        data-editor-theme={theme}
        data-sidebar-left-hidden={!sidebarLeftVisible}
      >
        {/* ── Left Sidebar ───────────────────────────────────────── */}
        {sidebarLeftVisible && (
        <aside className={styles.sidebarLeft}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogoRow}>
              <div className={styles.sidebarLogoBrand}>
                <div className={styles.logoContainer}>
                  <img src="/haze-logo.png" alt="Haze" className={styles.logoImg} />
                </div>
                <span className={styles.logoText}>Haze</span>
              </div>
              <div className={styles.sidebarLogoActions}>
                <button
                  type="button"
                  className={styles.layoutToggleBtn}
                  title="Toggle sidebar"
                  onClick={() => setSidebarLeftVisible((v) => !v)}
                >
                  <PanelLeft size={20} strokeWidth={2} />
                </button>
                <button
                  ref={settingsBtnRef}
                  type="button"
                  className={styles.settingsBtn}
                  title="Settings"
                  onClick={() => setSettingsPopoverOpen((v) => !v)}
                >
                  <Settings size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") setEditingName(false);
                }}
                className={styles.projectNameInput}
              />
            ) : (
              <button
                type="button"
                className={styles.projectSelector}
                onClick={() => setEditingName(true)}
              >
                {projectName}
                <ChevronDown size={16} className={styles.projectChevron} />
              </button>
            )}
            <div className={styles.projectSubtitle}>UI Design Project</div>
          </div>

          <div className={styles.tabsRow}>
            <div className={styles.tabsPill}>
              <button
                type="button"
                className={`${styles.tabBtn} ${leftTab === "layers" ? styles.tabBtnActive : ""}`}
                onClick={() => setLeftTab("layers")}
              >
                Layers
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${leftTab === "components" ? styles.tabBtnActive : ""}`}
                onClick={() => setLeftTab("components")}
              >
                Assets
              </button>
            </div>
          </div>

          {leftTab === "layers" && (
            <>
              <div className={styles.layerTreeWrap}>
                <div className={styles.layerTree}>
                  {filteredNodes.length === 0 ? (
                    <div className={styles.layerEmpty}>No layers yet</div>
                  ) : (
                    filteredNodes.map((node, i) => (
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
              <div className={styles.searchBar}>
                <form className={styles.searchForm}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className={styles.key}>⌘ K</span>
                </form>
              </div>
            </>
          )}

          {leftTab === "components" && (
            <div className={styles.panelContent}>
              <ComponentsPanel
                onAddComponent={handleAddComponent}
                onOpenIconPicker={() => setIconPickerOpen(true)}
              />
            </div>
          )}

        </aside>
        )}

        {/* Show sidebar toggle when collapsed */}
        {!sidebarLeftVisible && (
          <button
            type="button"
            className={styles.sidebarCollapsedBtn}
            onClick={() => setSidebarLeftVisible(true)}
            title="Show sidebar"
          >
            <PanelLeft size={20} strokeWidth={2} style={{ transform: "rotate(180deg)" }} />
          </button>
        )}

        {/* ── Right Sidebar ──────────────────────────────────────── */}
        <aside className={styles.sidebarRight}>
          <div className={styles.sidebarRightHeader}>
            <button
              type="button"
              className={styles.exportBtnSidebar}
              onClick={() => setExportOpen(true)}
            >
              Export
            </button>
            <button type="button" className={styles.shareBtn}>
              Share
            </button>
          </div>
          <div className={styles.rightTabs}>
            <div className={styles.rightTabsPill}>
              <button
                type="button"
                className={`${styles.rightTabBtn} ${rightTab === "design" ? styles.rightTabBtnActive : ""}`}
                onClick={() => {
                  setRightTab("design");
                  setMode("design");
                }}
              >
                Design
              </button>
              <button
                type="button"
                className={`${styles.rightTabBtn} ${rightTab === "code" ? styles.rightTabBtnActive : ""}`}
                onClick={() => setRightTab("code")}
              >
                Properties
              </button>
            </div>
          </div>
          <div className={styles.rightPanelContent}>
            {rightTab === "design" && <PropertiesPanel />}
            {rightTab === "code" && <PreviewPanel />}
          </div>
        </aside>

        {/* ── Floating Toolbar ───────────────────────────────────── */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarTools}>
            <button
              type="button"
              className={`${styles.toolBtn} ${tool === "SELECT" ? styles.toolBtnActive : ""}`}
              onClick={() => setTool("SELECT")}
              title="Select (V)"
            >
              <MousePointer2 size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${tool === "FRAME" ? styles.toolBtnActive : ""}`}
              onClick={() => setTool("FRAME")}
              title="Frame (F)"
            >
              <Layout size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${tool === "HAND" ? styles.toolBtnActive : ""}`}
              onClick={() => setTool("HAND")}
              title="Hand (H)"
            >
              <Hand size={20} strokeWidth={2} />
            </button>
            <button type="button" className={`${styles.toolbarIconBtn} ${styles.commentsBtn}`} title="Comments">
              <MessageSquare size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${mode === "preview" ? styles.toolBtnActive : ""}`}
              onClick={() => setMode(mode === "preview" ? "design" : "preview")}
              title="Preview"
            >
              <Play size={20} strokeWidth={2} />
            </button>
          </div>
          <div className={styles.toolbarDivider} />
          <div className={styles.toolbarZoom}>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.max(0.05, viewport.zoom / 1.25) })}
              title="Zoom out"
              disabled={viewport.zoom <= 0.05}
            >
              <Minus size={20} strokeWidth={2} />
            </button>
            <span className={styles.zoomLabel}>{Math.round(viewport.zoom * 100)}%</span>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={() => setViewport({ zoom: Math.min(10, viewport.zoom * 1.25) })}
              title="Zoom in"
            >
              <Plus size={20} strokeWidth={2} />
            </button>
          </div>
          <div className={styles.toolbarDivider} />
          <button
            type="button"
            className={`${styles.toolbarDarkBtn} ${mode === "design" ? styles.toolbarDarkBtnActive : ""}`}
            onClick={() => setMode("design")}
          >
            Design
          </button>
          <button
            type="button"
            className={styles.toolbarDarkBtn}
            onClick={() => {
              setMode("code");
              setRightTab("code");
            }}
          >
            View Code
          </button>
        </div>

        {/* ── Canvas Area ────────────────────────────────────────── */}
        <main className={styles.canvasArea}>
          {mode === "design" && <Canvas />}
          {mode === "code" && <CodePanel />}
          {mode === "preview" && <PreviewPanel />}
        </main>

        <SettingsPopover
          anchorRef={settingsBtnRef}
          isOpen={settingsPopoverOpen}
          onClose={() => setSettingsPopoverOpen(false)}
          onExport={() => setExportOpen(true)}
          onSave={() => {
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            const projectId = params.get("project");
            if (projectId) {
              import("@/lib/projects").then(({ saveProject }) => {
                saveProject(projectId, { nodes: nodes as unknown[], name: projectName });
              });
            }
          }}
          onSaveAs={() => setSaveAsOpen(true)}
        />

        {/* ── Bottom AI Prompt (1:1 Brainwave) ────────────────────── */}
        <BottomAIPrompt />
      </div>

      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconName) => {
          handleAddIcon(iconName);
          setIconPickerOpen(false);
        }}
      />

      <SaveAsModal
        isOpen={saveAsOpen}
        onClose={() => setSaveAsOpen(false)}
        currentProjectId={currentProjectId}
        currentNodes={nodes as unknown[]}
        currentProjectName={projectName}
      />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onDownload={async (settings) => {
          const { preloadLucideIcons } = await import("@/lib/icon-svg");
          await preloadLucideIcons();
          const { downloadProjectFromSceneNodes } = await import("@/lib/tauri-export");
          const nodes = useEditorStore.getState().nodes;
          const exportName = (settings.appName ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            || "my-tauri-app";
          await downloadProjectFromSceneNodes(nodes, exportName, settings);
        }}
      />
    </DndContext>
  );
}
