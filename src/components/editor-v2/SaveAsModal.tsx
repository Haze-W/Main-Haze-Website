"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, FilePlus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { listAllProjects, createProject, saveProject } from "@/lib/projects";
import { getFolders, createFolder, type FolderItem } from "@/lib/folders";
import styles from "./SaveAsModal.module.css";

interface SaveAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string | null;
  currentNodes: unknown[];
  currentProjectName: string;
}

export function SaveAsModal({
  isOpen,
  onClose,
  currentProjectId,
  currentNodes,
  currentProjectName,
}: SaveAsModalProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [newProjectName, setNewProjectName] = useState(currentProjectName || "Untitled");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "new-project" | "new-folder">("choose");

  useEffect(() => {
    if (isOpen) {
      const allFolders = getFolders();
      setProjects(listAllProjects().map((p) => ({ id: p.id, name: p.name })));
      setFolders(allFolders);
      setNewProjectName(currentProjectName || "Untitled");
      setSelectedFolderId(allFolders[0]?.id ?? null);
      setMode("choose");
    }
  }, [isOpen, currentProjectName]);

  const handleSaveToProject = (projectId: string) => {
    saveProject(projectId, { nodes: currentNodes });
    onClose();
    router.push(`/editor?project=${projectId}`);
  };

  const handleCreateNewProject = () => {
    const folderId = selectedFolderId ?? folders[0]?.id;
    if (!folderId) return;
    const project = createProject(newProjectName.trim() || "Untitled", undefined, {
      folderId,
      runtimeTarget: "tauri",
    });
    saveProject(project.id, { nodes: currentNodes });
    onClose();
    router.push(`/editor?project=${project.id}`);
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;
    const item = createFolder(newFolderName.trim());
    setFolders([item, ...folders]);
    setSelectedFolderId(item.id);
    setNewFolderName("");
    setMode("choose");
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} onEscapeKeyDown={onClose}>
          <div className={styles.header}>
            <h2 className={styles.title}>Save As</h2>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {mode === "choose" && (
            <div className={styles.content}>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Save to project</span>
                <div className={styles.projectList}>
                  {projects
                    .filter((p) => p.id !== currentProjectId)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={styles.projectItem}
                        onClick={() => handleSaveToProject(p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  {projects.filter((p) => p.id !== currentProjectId).length === 0 && (
                    <p className={styles.emptyHint}>No other projects yet</p>
                  )}
                </div>
              </div>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Or</span>
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setMode("new-project")}
                  >
                    <FilePlus size={18} strokeWidth={2} />
                    Create new project
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setMode("new-folder")}
                  >
                    <FolderPlus size={18} strokeWidth={2} />
                    Create new folder
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "new-project" && (
            <div className={styles.content}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Folder</label>
                <select
                  className={styles.input}
                  value={selectedFolderId ?? ""}
                  onChange={(e) => setSelectedFolderId(e.target.value || null)}
                >
                  <option value="">Select folder</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Project name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Untitled"
                  autoFocus
                />
              </div>
              <div className={styles.footer}>
                <button type="button" className={styles.cancelBtn} onClick={() => setMode("choose")}>
                  Back
                </button>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleCreateNewProject}
                >
                  Create & Save
                </button>
              </div>
            </div>
          )}

          {mode === "new-folder" && (
            <div className={styles.content}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Folder name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder"
                  autoFocus
                />
              </div>
              <div className={styles.footer}>
                <button type="button" className={styles.cancelBtn} onClick={() => setMode("choose")}>
                  Back
                </button>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleCreateNewFolder}
                >
                  Create folder
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
