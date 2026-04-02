"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo, type ComponentType } from "react";
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
  MonitorPlay,
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
  X,
  Loader2,
  Share2,
} from "lucide-react";
import { useEditorStore, type EditorPage } from "@/lib/editor/store";
import { useAuth } from "@/lib/auth-context";
import {
  resolveCollabRole,
  ensureProjectShareOwner,
  getCapabilities,
  ingestShareTokenFromUrl,
  loadShareMeta,
  saveShareMeta,
  saveCollaborators,
} from "@/lib/editor/collaboration";
import { tryPasteFromClipboard } from "@/lib/figma/paste-listener";
import { isRenderPayload } from "@/lib/figma/types";
import { COMPONENT_PRESETS } from "@/lib/editor/component-presets";
import { resolvePlacementParent } from "@/lib/editor/placement";
import { Canvas } from "./Canvas";
import { BackendPanel } from "./BackendPanel";
import { SettingsPopover } from "./SettingsPopover";
import { SaveAsModal } from "./SaveAsModal";
import { ExportModal } from "@/components/editor/ExportModal";
import { ShareModal } from "./ShareModal";
import { IconPickerModal } from "@/components/editor/IconPickerModal";
import { ComponentsPanel } from "./ComponentsPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { AIPanel } from "./AIPanel";
import { PreviewPanel } from "./PreviewPanel";
import { BottomAIPrompt } from "./BottomAIPrompt";
import type { SceneNode } from "@/lib/editor/types";
import { addLayoutPresetToCanvas, type LayoutPresetId } from "@/lib/editor/layout-presets";
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
  const canEditScene = useEditorStore((s) => getCapabilities(s.collabRole).canEditScene);
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
  const { user } = useAuth();
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const searchParams = useSearchParams();
  const currentProjectId = searchParams.get("project");
  const shareToken = searchParams.get("token");
  const setCollabRole = useEditorStore((s) => s.setCollabRole);
  const collabRole = useEditorStore((s) => s.collabRole);
  const caps = useMemo(() => getCapabilities(collabRole), [collabRole]);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [settingsPopoverOpen, setSettingsPopoverOpen] = useState(false);
  const [sidebarLeftVisible, setSidebarLeftVisible] = useState(true);
  const [leftTab, setLeftTab] = useState<"layers" | "components">("layers");
  const [rightTab, setRightTab] = useState<"properties" | "chat">("properties");
  const [projectName, setProjectName] = useState("Untitled");
  const [editingName, setEditingName] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Which layer row is in rename mode (double-click name) */
  const [layerEditingId, setLayerEditingId] = useState<string | null>(null);
  /** Pages panel: which page name is being edited */
  const [renamingPage, setRenamingPage] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pid = currentProjectId;
    ingestShareTokenFromUrl(pid, shareToken);
    if (pid && user?.email) ensureProjectShareOwner(pid, user.email, user.id);
    setCollabRole(
      resolveCollabRole(pid, { userEmail: user?.email ?? null, tokenFromUrl: shareToken })
    );
  }, [currentProjectId, user?.email, user?.id, shareToken, setCollabRole, projectName]);

  useEffect(() => {
    if (!caps.canManageProject) setEditingName(false);
  }, [caps.canManageProject]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const openChat = () => setRightTab("chat");
    window.addEventListener("haze-open-chat", openChat);
    return () => window.removeEventListener("haze-open-chat", openChat);
  }, []);

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
        if (project.shareMeta) {
          const cur = loadShareMeta(projectId);
          saveShareMeta(projectId, {
            ...cur,
            ...project.shareMeta,
            linkAccess:
              project.shareMeta.linkAccess === "view" ||
              project.shareMeta.linkAccess === "edit" ||
              project.shareMeta.linkAccess === "off"
                ? project.shareMeta.linkAccess
                : cur.linkAccess,
          });
        }
        if (project.collaborators?.length) {
          saveCollaborators(projectId, project.collaborators);
        }
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
    const s = useEditorStore.getState();
    const resolved = resolvePlacementParent(s.nodes, pos.x, pos.y, s.enteredFrameId);
    addNode({
      type: preset.type,
      name: preset.name,
      x: resolved?.x ?? pos.x,
      y: resolved?.y ?? pos.y,
      width: preset.width,
      height: preset.height,
      props: preset.props,
    }, resolved?.parentId);
  };

  const handleAddIcon = (iconName: string, x?: number, y?: number) => {
    const pos = x != null && y != null ? { x, y } : getPlacement();
    const s = useEditorStore.getState();
    const resolved = resolvePlacementParent(s.nodes, pos.x, pos.y, s.enteredFrameId);
    addNode({
      type: "ICON",
      name: "Icon",
      x: resolved?.x ?? pos.x,
      y: resolved?.y ?? pos.y,
      width: 24,
      height: 24,
      props: { iconName },
    }, resolved?.parentId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const data = active.data.current as
      | { type?: string; key?: string; iconName?: string; componentId?: string; preset?: LayoutPresetId }
      | undefined;
    const pos = getPlacement();
    if (data?.type === "layoutPreset" && data.preset) {
      if (over?.id === "canvas-drop") {
        addLayoutPresetToCanvas(data.preset, { x: pos.x, y: pos.y });
      } else {
        addLayoutPresetToCanvas(data.preset);
      }
    } else if (data?.type === "component" && data.key) {
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
        if (!getCapabilities(useEditorStore.getState().collabRole).canEditScene) return;
        e.preventDefault();
        createComponent([...selectedIds]);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        if (!getCapabilities(useEditorStore.getState().collabRole).canEditScene) return;
        e.preventDefault();
        moveNodes([...selectedIds], 0, -step);
        pushHistory();
      }
      if (e.key === "ArrowDown") {
        if (!getCapabilities(useEditorStore.getState().collabRole).canEditScene) return;
        e.preventDefault();
        moveNodes([...selectedIds], 0, step);
        pushHistory();
      }
      if (e.key === "ArrowLeft") {
        if (!getCapabilities(useEditorStore.getState().collabRole).canEditScene) return;
        e.preventDefault();
        moveNodes([...selectedIds], -step, 0);
        pushHistory();
      }
      if (e.key === "ArrowRight") {
        if (!getCapabilities(useEditorStore.getState().collabRole).canEditScene) return;
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

  /* Debug telemetry removed for security */

  const filteredLayerTree = useMemo(
    () => filterLayersForSearch(nodes, searchQuery),
    [nodes, searchQuery]
  );

  const openImportPicker = () => {
    if (!caps.canEditScene) return;
    importInputRef.current?.click();
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
      show("Please select a .json file.", "info");
      return;
    }
    let text = "";
    try {
      text = await file.text();
    } catch {
      show("Could not read file.", "error");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      show("Invalid JSON file.", "error");
      return;
    }
    const maybeRenderCopy =
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Record<string, unknown>)._renderCopy === true &&
      Array.isArray((parsed as Record<string, unknown>).nodes);
    if (!isRenderPayload(parsed) && !maybeRenderCopy) {
      show("JSON format is not a valid Haze/Figma import payload.", "error");
      return;
    }
    const ok = await tryPasteFromClipboard(text);
    show(
      ok ? "Imported JSON into canvas." : "Import failed: unsupported payload.",
      ok ? "success" : "error"
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div
        ref={shellRef}
        className={styles.shell}
        data-editor-theme={theme}
        data-sidebar-left-hidden={!sidebarLeftVisible}
      >
        {collabRole !== "owner" && (
          <div className={styles.collabBanner} role="status">
            {collabRole === "viewer"
              ? "You have view-only access to this project."
              : "You can edit the canvas. Project settings, export, share, and backend are owner-only."}
          </div>
        )}
        {/* ── Left Sidebar ───────────────────────────────────────── */}
        {sidebarLeftVisible && (
        <aside className={styles.sidebarLeft}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarLogoRow}>
              <Link href="/dashboard" className={styles.sidebarLogoBrand}>
                <div className={styles.logoContainer}>
                  <img src="/haze-logo.svg" alt="Haze" className={styles.logoImg} />
                </div>
                <span className={styles.logoText}>Haze</span>
              </Link>
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
            {editingName && caps.canManageProject ? (
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
                onClick={() => caps.canManageProject && setEditingName(true)}
                disabled={!caps.canManageProject}
                title={!caps.canManageProject ? "Only the project owner can rename" : undefined}
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
                  <button
                    type="button"
                    className={styles.pagesAddBtn}
                    onClick={addPage}
                    title="Add page"
                    disabled={!caps.canEditScene}
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className={`${styles.pageItem} ${page.id === currentPageId ? styles.pageItemActive : ""}`}
                    onClick={() => switchPage(page.id)}
                    onDoubleClick={() => caps.canEditScene && setRenamingPage(page.id)}
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
                        disabled={!caps.canEditScene}
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
                onOpenIconPicker={() => setIconPickerOpen(true)}
                onRequestLayersTab={() => setLeftTab("layers")}
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
              className={styles.shareBtn}
              title={caps.canShare ? "Share project" : "Only the owner can share"}
              onClick={() => caps.canShare && setShareOpen(true)}
              disabled={!caps.canShare}
            >
              <Share2 size={16} strokeWidth={2} aria-hidden />
              Share
            </button>
            <button
              type="button"
              className={styles.exportBtnSidebar}
              title={caps.canExport ? "Export" : "Only the owner can export"}
              onClick={() => caps.canExport && setExportOpen(true)}
              disabled={!caps.canExport}
            >
              Export
            </button>
          </div>
          <div className={styles.rightTabs}>
            <div className={styles.rightTabsPill}>
              <button
                type="button"
                className={`${styles.rightTabBtn} ${rightTab === "properties" ? styles.rightTabBtnActive : ""}`}
                onClick={() => {
                  setRightTab("properties");
                  setMode("design");
                }}
              >
                Properties
              </button>
              <button
                type="button"
                className={`${styles.rightTabBtn} ${rightTab === "chat" ? styles.rightTabBtnActive : ""}`}
                onClick={() => setRightTab("chat")}
              >
                Chat
              </button>
            </div>
          </div>
          <div className={styles.rightPanelContent}>
            {rightTab === "properties" && <PropertiesPanel />}
            {rightTab === "chat" && <AIPanel />}
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
              onClick={() => caps.canEditScene && setTool("FRAME")}
              title={caps.canEditScene ? "Frame (F)" : "View only"}
              disabled={!caps.canEditScene}
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
              className={`${styles.toolBtn} ${mode === "preview" ? styles.toolBtnActive : ""}`}
              onClick={() => setMode(mode === "preview" ? "design" : "preview")}
              title="Preview prototype"
            >
              <MonitorPlay size={20} strokeWidth={2} />
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
            title={!caps.canEditCode ? "View only" : undefined}
            disabled={!caps.canEditCode}
            onClick={() => {
              setMode("code");
              setRightTab("properties");
            }}
          >
            View Code
          </button>
          <button
            type="button"
            className={`${styles.toolbarDarkBtn} ${mode === "backend" ? styles.toolbarDarkBtnActive : ""}`}
            title={caps.canBackend ? undefined : "Only the owner can edit backend"}
            disabled={!caps.canBackend}
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
          {mode === "design" && <Canvas />}
          {mode === "code" && <CodePanel />}
          {mode === "preview" && <PreviewPanel />}
          {mode === "backend" && <BackendPanel projectId={currentProjectId} />}
        </main>

        <SettingsPopover
          anchorRef={settingsBtnRef}
          isOpen={settingsPopoverOpen}
          onClose={() => setSettingsPopoverOpen(false)}
          exportDisabled={!caps.canExport}
          saveAsDisabled={!caps.canManageProject}
          importDisabled={!caps.canEditScene}
          onImportJson={openImportPicker}
          onExport={() => setExportOpen(true)}
          onSave={() => {
            const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
            const projectId = params.get("project");
            if (projectId && /^[a-zA-Z0-9_-]+$/.test(projectId)) {
              import("@/lib/projects").then(({ saveProject }) => {
                saveProject(projectId, { nodes: nodes as unknown[], name: projectName });
              });
            }
          }}
          onSaveAs={() => setSaveAsOpen(true)}
        />
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className={styles.hiddenFileInput}
          onChange={handleImportJsonFile}
        />

        {/* ── Bottom: AI prompt (dock) ─────────────────────── */}
        <div className={styles.bottomDockCluster}>
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
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={currentProjectId}
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
