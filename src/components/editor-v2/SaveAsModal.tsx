"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, FilePlus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { listProjects, createProject, saveProject } from "@/lib/projects";
import { getFolders, saveFolders, type FolderItem } from "@/lib/folders";
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
  const [mode, setMode] = useState<"choose" | "new-project" | "new-folder">("choose");

  useEffect(() => {
    if (isOpen) {
      setProjects(listProjects().map((p) => ({ id: p.id, name: p.name })));
      setFolders(getFolders());
      setNewProjectName(currentProjectName || "Untitled");
      setMode("choose");
    }
  }, [isOpen, currentProjectName]);

  const handleSaveToProject = (projectId: string) => {
    saveProject(projectId, { nodes: currentNodes });
    onClose();
    router.push(`/editor?project=${projectId}`);
  };

  const handleCreateNewProject = () => {
    const project = createProject(newProjectName.trim() || "Untitled", undefined, {
      runtimeTarget: "tauri",
    });
    saveProject(project.id, { nodes: currentNodes });
    onClose();
    router.push(`/editor?project=${project.id}`);
  };

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim()) return;
    const id = `f-${Date.now()}`;
    const newFolder: FolderItem = {
      id,
      name: newFolderName.trim(),
      path: `/dashboard?folder=${id}`,
    };
    const next = [newFolder, ...folders];
    setFolders(next);
    saveFolders(next);
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
                <label htmlFor="save-as-project-name" className={styles.label}>Project name</label>
                <input
                  id="save-as-project-name"
                  name="save_as_project_name"
                  type="text"
                  className={styles.input}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Untitled"
                  autoFocus
                  autoComplete="off"
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
                <label htmlFor="save-as-folder-name" className={styles.label}>Folder name</label>
                <input
                  id="save-as-folder-name"
                  name="save_as_folder_name"
                  type="text"
                  className={styles.input}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder"
                  autoFocus
                  autoComplete="off"
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
