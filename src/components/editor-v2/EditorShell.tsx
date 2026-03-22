"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo, type ComponentType } from "react";
import dynamic from "next/dynamic";
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
  X,
  Loader2,
} from "lucide-react";
import { useEditorStore, type EditorPage } from "@/lib/editor/store";
import { tryPasteFromClipboard } from "@/lib/figma/paste-listener";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { Canvas } from "./Canvas";
import { BackendPanel } from "./BackendPanel";
import { SettingsPopover } from "./SettingsPopover";
import { SaveAsModal } from "./SaveAsModal";
import { ExportModal } from "@/components/editor/ExportModal";
import { IconPickerModal } from "@/components/editor/IconPickerModal";
import { ComponentsPanel } from "./ComponentsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AIChatPanel } from "./AIChatPanel";
import { PreviewPanel } from "./PreviewPanel";
import { BottomAIPrompt } from "./BottomAIPrompt";
import type { SceneNode } from "@/lib/editor/types";
import { useToast } from "@/components/Toast";
import styles from "./EditorShell.module.css";

/** Monaco + file tree load on demand — keeps initial editor bundle smaller & faster. */
const CodePanel = dynamic(
  () => import("@/components/editor/CodePanel").then((m) => ({ default: m.CodePanel })),
  {
    ssr: false,
    loading: () => (
      <div className={styles.codePanelLoading} role="status">
        <Loader2 className={styles.codePanelLoadingSpinner} size={22} aria-hidden />
        <span>Loading code workspace…</span>
      </div>
    ),
  }
);

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

/** Layer panel type icon accent (Figma-style) */
function getTypeIconColor(type: string): string {
  const map: Record<string, string> = {
    FRAME: "#3b82f6",
    TEXT: "#f59e0b",
    BUTTON: "#22c55e",
    INPUT: "#8b5cf6",
    RECTANGLE: "#6b7280",
    CONTAINER: "#6b7280",
    IMAGE: "#14b8a6",
    ICON: "#eab308",
  };
  return map[type] ?? "#6b7280";
}

/** Show nodes matching search + ancestors; matching nodes keep full subtree. */
function filterLayersForSearch(nodes: SceneNode[], q: string): SceneNode[] {
  const lower = q.trim().toLowerCase();
  if (!lower) return nodes;
  const out: SceneNode[] = [];
  for (const n of nodes) {
    const childFiltered = filterLayersForSearch(n.children ?? [], q);
    const selfMatch = n.name.toLowerCase().includes(lower);
    if (selfMatch) {
      out.push({ ...n, children: n.children ?? [] });
    } else if (childFiltered.length > 0) {
      out.push({ ...n, children: childFiltered });
    }
  }
  return out;
}

function LayerItem({
  node,
  isSelected,
  depth,
  editingId,
  setEditingId,
}: {
  node: SceneNode;
  isSelected: boolean;
  depth: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const skipRenameBlurRef = useRef(false);

  const selectedIds = useEditorStore((s) => s.selectedIds);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const updateNode = useEditorStore((s) => s.updateNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isHidden = node.visible === false;
  const isLocked = !!node.locked;

  return (
    <div className={styles.layerGroup}>
      <div
        className={`${styles.layerItem} ${isSelected ? styles.layerItemSelected : ""} ${isHidden ? styles.layerHidden : ""}`}
        style={{ paddingLeft: depth * 14 + 6, position: "relative" }}
        onClick={(e) => {
          if (editingId === node.id) return;
          if (isLocked) return;
          if (e.shiftKey) toggleSelection(node.id);
          else setSelectedIds([node.id]);
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
          {expanded ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
        </button>
        <div className={styles.layerIcon}>
          <span className={styles.layerTypeIcon} style={{ color: getTypeIconColor(node.type) }}>
            {getTypeIcon(node.type)}
          </span>
        </div>
        {editingId === node.id ? (
          <input
            autoFocus
            defaultValue={node.name}
            className={styles.layerRenameInput}
            onBlur={(e) => {
              if (skipRenameBlurRef.current) {
                skipRenameBlurRef.current = false;
                return;
              }
              const v = e.target.value.trim();
              updateNode(node.id, { name: v || node.name });
              pushHistory();
              setEditingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                skipRenameBlurRef.current = true;
                setEditingId(null);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            autoComplete="off"
            aria-label="Rename layer"
            name="layer_name"
            id={`editor-layer-rename-${node.id}`}
          />
        ) : (
          <span
            className={styles.layerName}
            style={{ opacity: isHidden ? 0.4 : 1 }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingId(node.id);
            }}
          >
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
            editingId={editingId}
            setEditingId={setEditingId}
          />
        ))}
    </div>
  );
}

export function EditorShell() {
  const { show } = useToast();
  const [exportOpen, setExportOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const searchParams = useSearchParams();
  const currentProjectId = searchParams.get("project");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [settingsPopoverOpen, setSettingsPopoverOpen] = useState(false);
  const [sidebarLeftVisible, setSidebarLeftVisible] = useState(true);
  const [leftTab, setLeftTab] = useState<"layers" | "components">("layers");
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [rightTab, setRightTab] = useState<"design" | "code">("design");
  const [projectName, setProjectName] = useState("Untitled");
  const [editingName, setEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Which layer row is in rename mode (double-click name) */
  const [layerEditingId, setLayerEditingId] = useState<string | null>(null);
  /** Pages panel: which page name is being edited */
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const theme = useEditorStore((s) => s.theme);
  const aiBuild = useEditorStore((s) => s.aiBuild);

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
    createComponent,
    pages,
    currentPageId,
    addPage,
    deletePage,
    renamePage,
    switchPage,
    prototypeMode,
    setPrototypeMode,
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
          const s = useEditorStore.getState();
          const pagesWithCurrent = s.pages.map((p) =>
            p.id === s.currentPageId ? { ...p, nodes: s.nodes } : p
          );
          saveProject(projectId, {
            nodes: s.nodes as unknown[],
            editorPages: pagesWithCurrent as unknown[],
            currentPageId: s.currentPageId,
          });
        });
      } catch {
        /* ignore */
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [nodes, pages, currentPageId]);

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
        if (project.editorPages && Array.isArray(project.editorPages) && project.editorPages.length > 0) {
          const ep = project.editorPages as EditorPage[];
          const cid =
            project.currentPageId && ep.some((p) => p.id === project.currentPageId)
              ? project.currentPageId
              : ep[0].id;
          const cur = ep.find((p) => p.id === cid);
          const loadedNodes = (cur?.nodes ?? []) as SceneNode[];
          const nodesClone = JSON.parse(JSON.stringify(loadedNodes)) as SceneNode[];
          useEditorStore.setState({
            pages: ep,
            currentPageId: cid,
            nodes: nodesClone,
            history: [{ nodes: JSON.parse(JSON.stringify(nodesClone)) }],
            historyIndex: 0,
            selectedIds: new Set(),
          });
        } else if (project.nodes && Array.isArray(project.nodes) && project.nodes.length > 0) {
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
      | { type?: string; key?: string; iconName?: string; componentId?: string }
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
    } else if (data?.type === "sceneComponent" && data.componentId) {
      const s = useEditorStore.getState();
      if (over?.id === "canvas-drop") {
        s.createInstance(data.componentId, { x: pos.x, y: pos.y });
      } else {
        s.createInstance(data.componentId);
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
      if (e.ctrlKey && e.altKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        createComponent([...selectedIds]);
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
    createComponent,
    pushHistory,
  ]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useLayoutEffect(() => {
    // #region agent log
    const el = shellRef.current;
    const cs = el ? getComputedStyle(el) : null;
    const box = el?.getBoundingClientRect();
    fetch("http://127.0.0.1:7414/ingest/06c84fbc-4d5d-429d-95c7-09038428f9b6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a51597" },
      body: JSON.stringify({
        sessionId: "a51597",
        runId: "post-fix",
        hypothesisId: "A",
        location: "EditorShell.tsx:useLayoutEffect",
        message: "EditorShell root computed layout",
        data: {
          innerWidth: typeof window !== "undefined" ? window.innerWidth : null,
          shellDisplay: cs?.display,
          shellVisibility: cs?.visibility,
          shellOpacity: cs?.opacity,
          shellW: box?.width,
          shellH: box?.height,
          likelyHiddenBy1340Rule:
            typeof window !== "undefined" && window.innerWidth <= 1340,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  });

  const filteredLayerTree = useMemo(
    () => filterLayersForSearch(nodes, searchQuery),
    [nodes, searchQuery]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div
        ref={shellRef}
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
                id="editor-project-name"
                name="project_name"
                ref={nameInputRef}
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") setEditingName(false);
                }}
                className={styles.projectNameInput}
                autoComplete="off"
                aria-label="Project name"
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
              <div className={styles.searchBar}>
                <form className={styles.searchForm}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    id="editor-layers-search"
                    name="layer_search"
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search layers"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                    aria-label="Search layers"
                  />
                  <span className={styles.key}>⌘ K</span>
                </form>
              </div>
              <div className={styles.layerTreeWrap}>
                <div className={styles.layerTree}>
                  {filteredLayerTree.length === 0 ? (
                    <div className={styles.layerEmpty}>
                      {nodes.length === 0 ? "No layers yet" : "No matching layers"}
                    </div>
                  ) : (
                    filteredLayerTree.map((node, i) => (
                      <LayerItem
                        key={`${node.id}-${i}`}
                        node={node}
                        isSelected={selectedIds.has(node.id)}
                        depth={0}
                        editingId={layerEditingId}
                        setEditingId={setLayerEditingId}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className={styles.pagesSection}>
                <div className={styles.pagesSectionHeader}>
                  <span>Pages</span>
                  <button type="button" className={styles.pagesAddBtn} onClick={addPage} title="Add page">
                    <Plus size={12} />
                  </button>
                </div>
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`${styles.pageItem} ${page.id === currentPageId ? styles.pageItemActive : ""}`}
                    onClick={() => switchPage(page.id)}
                    onDoubleClick={() => setRenamingPage(page.id)}
                  >
                    {renamingPage === page.id ? (
                      <input
                        className={styles.pageItemInput}
                        autoFocus
                        defaultValue={page.name}
                        onBlur={(e) => {
                          renamePage(page.id, e.target.value);
                          setRenamingPage(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") setRenamingPage(null);
                        }}
                      />
                    ) : (
                      <span className={styles.pageItemLabel}>{page.name}</span>
                    )}
                    {pages.length > 1 && (
                      <button
                        type="button"
                        className={styles.pageItemDelete}
                        title="Delete page"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {leftTab === "components" && (
            <div className={styles.panelContent}>
              <ComponentsPanel
                onAddComponent={handleAddComponent}
                onOpenIconPicker={() => setIconPickerOpen(true)}
                onAIGenerate={(newNodes) => {
                  const s = useEditorStore.getState();
                  s.setNodes(newNodes);
                  s.pushHistory();
                  s.setMode("preview");
                  setRightTab("design");
                }}
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
            <button
              type="button"
              className={styles.shareBtn}
              title="Copy editor link"
              onClick={() => {
                if (typeof window === "undefined") return;
                const url = window.location.href;
                void navigator.clipboard?.writeText?.(url).catch(() => {
                  window.prompt("Copy this link:", url);
                });
              }}
            >
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
            <button
              type="button"
              className={`${styles.toolbarIconBtn} ${styles.commentsBtn}`}
              title="Comments (coming soon)"
              onClick={() =>
                show("Comments and real-time collaboration are coming soon.", "info")
              }
            >
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
          <button
            type="button"
            className={`${styles.toolbarDarkBtn} ${mode === "backend" ? styles.toolbarDarkBtnActive : ""}`}
            onClick={() => setMode("backend")}
          >
            Backend
          </button>
          <button
            type="button"
            className={`${styles.toolbarDarkBtn} ${prototypeMode ? styles.toolbarDarkBtnActive : ""}`}
            onClick={() => setPrototypeMode(!prototypeMode)}
            title="Prototype mode — show connection arrows on the canvas"
          >
            Prototype
            {prototypeMode && <span className={styles.prototypeDot} aria-hidden />}
          </button>
        </div>

        {/* ── Canvas Area ────────────────────────────────────────── */}
        <main className={styles.canvasArea}>
          {aiBuild && (
            <div className={styles.aiBuildOverlay} role="status" aria-live="polite">
              <div className={styles.aiBuildCard}>
                <Loader2 className={styles.aiBuildSpinner} size={22} aria-hidden />
                <div className={styles.aiBuildTitle}>AI is building your screen</div>
                <p className={styles.aiBuildHint}>Watch the log — this mirrors layout generation on the canvas.</p>
                <ul className={styles.aiBuildLog}>
                  {aiBuild.lines.map((line, i) => (
                    <li
                      key={`${i}-${line.slice(0, 24)}`}
                      className={i === aiBuild.lines.length - 1 ? styles.aiBuildLogActive : undefined}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {mode === "design" && <Canvas />}
          {mode === "code" && <CodePanel />}
          {mode === "preview" && <PreviewPanel />}
          {mode === "backend" && <BackendPanel />}
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

        {/* ── Bottom: AI Chat + prompt (dock) ─────────────────────── */}
        {aiChatOpen && (
          <div
            className={styles.aiChatBackdrop}
            aria-hidden
            onClick={() => setAiChatOpen(false)}
          />
        )}
        {aiChatOpen && (
          <div
            id="editor-ai-chat-sheet"
            className={styles.aiChatSheet}
            role="dialog"
            aria-label="AI chat refine"
          >
            <div className={styles.aiChatSheetBar}>
              <span className={styles.aiChatSheetTitle}>AI refine</span>
              <button
                type="button"
                className={styles.aiChatSheetClose}
                onClick={() => setAiChatOpen(false)}
                aria-label="Close AI chat"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.aiChatSheetBody}>
              <AIChatPanel
                embedded
                nodes={nodes}
                onApplyNodes={(newNodes) => {
                  const s = useEditorStore.getState();
                  s.setNodes(newNodes);
                  s.pushHistory();
                  s.setMode("preview");
                  setRightTab("design");
                }}
              />
            </div>
          </div>
        )}
        <div className={styles.bottomDockCluster}>
          <button
            type="button"
            className={`${styles.aiChatDockBtn} ${aiChatOpen ? styles.aiChatDockBtnActive : ""}`}
            onClick={() => setAiChatOpen((v) => !v)}
            aria-expanded={aiChatOpen}
            aria-controls="editor-ai-chat-sheet"
          >
            <MessageSquare size={18} strokeWidth={2} />
            AI Chat
          </button>
          <BottomAIPrompt layout="inline" />
        </div>
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
