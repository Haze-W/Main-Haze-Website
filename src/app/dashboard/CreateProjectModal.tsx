"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { createProject } from "@/lib/projects";
import styles from "./CreateProjectModal.module.css";

const FRAMEWORKS = [
  { value: "tauri", label: "Tauri", disabled: false },
  { value: "electron", label: "Electron", disabled: true },
  { value: "wpf", label: "WPF", disabled: true },
  { value: "imgui", label: "Imgui", disabled: true },
];

export function CreateProjectModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project = createProject(name.trim(), undefined, {
      runtimeTarget: framework || undefined,
    });
    onOpenChange(false);
    setName("");
    setFramework("");
    setImageFile(null);
    setImagePreview(null);
    router.push(`/editor?project=${project.id}`);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setName("");
    setFramework("");
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} onEscapeKeyDown={handleCancel}>
          <Dialog.Title asChild>
            <h2 className={styles.visuallyHidden}>Create New Project</h2>
          </Dialog.Title>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <img src="/tauri-logo.svg" alt="Tauri" className={styles.tauriLogo} />
              </div>
              <div>
                <h2 className={styles.title}>Create New Project</h2>
                <p className={styles.subtitle}>
                  Start a new project from scratch.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Project name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Type here"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>
                  Framework
                </label>
                <select
                  className={styles.select}
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                >
                  <option value="">Choose framework (optional)</option>
                  {FRAMEWORKS.map((f) => (
                    <option key={f.value} value={f.disabled ? "" : f.value} disabled={f.disabled}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.uploadSection}>
              <label className={styles.label}>Attach an image</label>
              <p className={styles.uploadHint}>Drop your image here to continue.</p>
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""} ${imagePreview ? styles.dropzoneFilled : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={handleFileChange}
                />
                {imagePreview ? (
                  <div className={styles.previewWrap}>
                    <img src={imagePreview} alt="Preview" className={styles.previewImg} />
                    <span className={styles.previewLabel}>Click to change</span>
                  </div>
                ) : (
                  <>
                    <CloudUpload size={40} strokeWidth={1.5} className={styles.uploadIcon} />
                    <span className={styles.dropzoneText}>
                      Choose a file or drag and drop it here.
                    </span>
                    <span className={styles.dropzoneHint}>JPG, PNG or WebP — up to 10MB</span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
                Cancel
              </button>
              <button type="submit" className={styles.submitBtn}>
                Create Project
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
