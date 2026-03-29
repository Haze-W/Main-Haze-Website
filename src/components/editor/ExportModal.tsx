"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ExportSettings } from "@/lib/editor/export-settings";
import { useExportSettings } from "@/lib/editor/export-settings";
import styles from "./ExportModal.module.css";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (settings: Partial<ExportSettings>) => Promise<void>;
}

type Tab = "testing" | "production";

export function ExportModal({ isOpen, onClose, onDownload }: ExportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("testing");
  const [copied, setCopied] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { appName, titleBarStyle, setAppName, setTitleBarStyle } = useExportSettings();

  const projectName = appName.trim() || "my-tauri-app";

  const testingCommands = `# 1. Extract the downloaded zip
(Right-click → Extract, or: unzip ${projectName}.zip)
cd ${projectName}

# 2. Install dependencies
npm install

# 3. Run in development mode (hot reload)
npm run tauri dev`;

  const productionCommands = `# 1. Extract the downloaded zip
(Right-click → Extract, or: unzip ${projectName}.zip)
cd ${projectName}

# 2. Install dependencies
npm install

# 3. Build for production
npm run tauri build`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyCommands = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownload({ appName, titleBarStyle });
      onClose();
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <div className={styles.header}>
          <h2 id="export-modal-title" className={styles.title}>
            Export your app
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.lead}>
            Download a ready-to-run Tauri project as a ZIP. After you unzip it, use the steps below in Terminal (you’ll
            need{" "}
            <a href="https://www.rust-lang.org/tools/install" target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
              Rust
            </a>{" "}
            and Node installed).
          </p>

          <div className={styles.settingsCard}>
            <h3 className={styles.sectionLabel}>Before you download</h3>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel} htmlFor="export-app-name">
                Folder &amp; app name
              </label>
              <input
                id="export-app-name"
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value || "my-tauri-app")}
                placeholder="my-tauri-app"
                className={styles.appNameInput}
                autoComplete="off"
              />
              <p className={styles.fieldHint}>This is the project folder name inside the ZIP.</p>
            </div>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Title bar style</span>
              <div className={styles.radioPillRow} role="radiogroup" aria-label="Title bar style">
                <button
                  type="button"
                  role="radio"
                  aria-checked={titleBarStyle === "windows"}
                  className={`${styles.radioPill} ${titleBarStyle === "windows" ? styles.radioPillActive : ""}`}
                  onClick={() => setTitleBarStyle("windows")}
                >
                  <span className={styles.radioDot}>
                    <span className={styles.radioDotInner} />
                  </span>
                  Windows
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={titleBarStyle === "macos"}
                  className={`${styles.radioPill} ${titleBarStyle === "macos" ? styles.radioPillActive : ""}`}
                  onClick={() => setTitleBarStyle("macos")}
                >
                  <span className={styles.radioDot}>
                    <span className={styles.radioDotInner} />
                  </span>
                  macOS
                </button>
              </div>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${tab === "testing" ? styles.tabActive : ""}`}
              onClick={() => setTab("testing")}
            >
              Run locally
            </button>
            <button
              type="button"
              className={`${styles.tab} ${tab === "production" ? styles.tabActive : ""}`}
              onClick={() => setTab("production")}
            >
              Build for release
            </button>
          </div>

          <p className={styles.tabHint}>
            {tab === "testing"
              ? "Hot reload while you develop."
              : "Creates an installable app for your platform."}
          </p>

          <div className={styles.tabContent}>
            {tab === "testing" && (
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeLabel}>Terminal</span>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copyCommands(testingCommands, "testing")}
                  >
                    {copied === "testing" ? "Copied!" : "Copy all"}
                  </button>
                </div>
                <pre className={styles.code}>
                  <code>{testingCommands}</code>
                </pre>
              </div>
            )}
            {tab === "production" && (
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeLabel}>Terminal</span>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copyCommands(productionCommands, "production")}
                  >
                    {copied === "production" ? "Copied!" : "Copy all"}
                  </button>
                </div>
                <pre className={styles.code}>
                  <code>{productionCommands}</code>
                </pre>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>
              {downloading ? "Preparing download…" : "Download ZIP"}
            </button>
            <p className={styles.footerNote}>This window closes automatically when the ZIP is ready.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
