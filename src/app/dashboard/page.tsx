"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, LayoutGrid, Filter, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { listProjects, saveProject, deleteProject, type Project } from "@/lib/projects";
import { getFolders } from "@/lib/folders";
import styles from "./dashboard.module.css";
import { useOpenCreateModal } from "./CreateModalContext";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString();
}

/** Simple preview of project contents - mini blocks representing layout */
function ProjectPreview({ project }: { project: Project }) {
  const nodes = (project.nodes ?? []) as { x?: number; y?: number; width?: number; height?: number }[];
  const topLevel = nodes.slice(0, 8);
  const scale = 80 / 1440;

  if (topLevel.length === 0) {
    return (
      <div className={styles.projectPreviewEmpty}>
        <LayoutGrid size={24} strokeWidth={1.5} />
        <span>Empty</span>
      </div>
    );
  }

  return (
    <div className={styles.projectPreview}>
      <svg viewBox="0 0 144 80" preserveAspectRatio="xMidYMid slice" className={styles.projectPreviewSvg}>
        {topLevel.map((n, i) => {
          const x = (n.x ?? 0) * scale;
          const y = (n.y ?? 0) * scale;
          const w = Math.max(4, (n.width ?? 100) * scale);
          const h = Math.max(4, (n.height ?? 50) * scale);
          return (
            <rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" opacity={0.5} rx={2} />
          );
        })}
      </svg>
    </div>
  );
}

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState(getFolders());
  const [projectContext, setProjectContext] = useState<{ x: number; y: number; project: Project } | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);
  const openCreate = useOpenCreateModal();

  const refresh = useCallback(() => {
    setFolders(getFolders());
    if (folderId) {
      setProjects(listProjects(folderId));
    } else {
      setProjects([]);
    }
  }, [folderId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setProjectContext(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleProjectContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectContext({ x: e.clientX, y: e.clientY, project });
  };

  const handleRename = () => {
    if (!projectContext) return;
    setRenameId(projectContext.project.id);
    setRenameValue(projectContext.project.name);
    setProjectContext(null);
  };

  const applyRename = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && renameValue.trim()) {
      if (renameId) {
        saveProject(renameId, { name: renameValue.trim() });
        refresh();
      }
      setRenameId(null);
      setRenameValue("");
    } else if (e.key === "Escape") {
      setRenameId(null);
      setRenameValue("");
    }
  };

  const handleDelete = () => {
    if (!projectContext) return;
    deleteProject(projectContext.project.id);
    refresh();
    setProjectContext(null);
  };

  const handlePreview = () => {
    if (!projectContext) return;
    setPreviewProject(projectContext.project);
    setProjectContext(null);
  };

  if (!folderId) {
    return (
      <div className={styles.emptyFolderState}>
        <div className={styles.emptyFolderIcon}>
          <LayoutGrid size={48} strokeWidth={1.5} />
        </div>
        <h2 className={styles.emptyFolderTitle}>
          {folders.length === 0 ? "Create a folder first" : "Select a folder"}
        </h2>
        <p className={styles.emptyFolderText}>
          {folders.length === 0
            ? "Create a folder in the sidebar to organize your projects. Then open it to add projects."
            : "Click a folder in the sidebar to view its projects and create new ones."}
        </p>
      </div>
    );
  }

  const currentFolder = folders.find((f) => f.id === folderId);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{currentFolder?.name ?? "Folder"}</h1>
          <p className={styles.pageSubtitle}>
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button type="button" className={styles.filterBtn}>
          <Filter size={16} strokeWidth={2} />
          All projects
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.sceneGrid}>
        <button
          type="button"
          className={styles.sceneCardNew}
          onClick={() => openCreate(folderId)}
        >
          <span className={styles.plusIcon}>
            <Plus size={24} strokeWidth={2} />
          </span>
          <span>Create New Project</span>
        </button>
        {projects.map((project) =>
          renameId === project.id ? (
            <div key={project.id} className={styles.sceneCard}>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={applyRename}
                onBlur={() => {
                  if (renameValue.trim()) {
                    saveProject(project.id, { name: renameValue.trim() });
                    refresh();
                  }
                  setRenameId(null);
                  setRenameValue("");
                }}
                className={styles.projectRenameInput}
              />
            </div>
          ) : (
            <div
              key={project.id}
              className={styles.sceneCard}
              onContextMenu={(e) => handleProjectContextMenu(e, project)}
            >
              <Link href={`/editor?project=${project.id}`} className={styles.sceneCardLink}>
                <div className={styles.scenePreview}>
                  <ProjectPreview project={project} />
                </div>
                <div className={styles.sceneInfo}>
                  <h3>{project.name}</h3>
                  <span>{formatRelativeTime(project.updatedAt)}</span>
                </div>
              </Link>
            </div>
          )
        )}
      </div>

      {projectContext && (
        <div
          ref={contextRef}
          className={styles.contextMenu}
          style={{ left: projectContext.x, top: projectContext.y }}
        >
          <div className={styles.contextMenuPreview}>
            <ProjectPreview project={projectContext.project} />
            <span className={styles.contextMenuPreviewLabel}>Preview</span>
          </div>
          <button type="button" className={styles.contextMenuItem} onClick={handlePreview}>
            View preview
          </button>
          <button type="button" className={styles.contextMenuItem} onClick={handleRename}>
            <Pencil size={14} strokeWidth={2} />
            Rename
          </button>
          <button type="button" className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`} onClick={handleDelete}>
            <Trash2 size={14} strokeWidth={2} />
            Delete
          </button>
        </div>
      )}

      {previewProject && (
        <div
          className={styles.previewOverlay}
          onClick={() => setPreviewProject(null)}
        >
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <h3>{previewProject.name}</h3>
            <div className={styles.previewModalContent}>
              <ProjectPreview project={previewProject} />
            </div>
            <button type="button" className={styles.previewCloseBtn} onClick={() => setPreviewProject(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className={styles.emptyFolderState}>Loading...</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}
