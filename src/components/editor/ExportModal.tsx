"use client";

import { useState, useEffect } from "react";
import type { ExportSettings, TitleBarStyle } from "@/lib/editor/export-settings";
import { useExportSettings } from "@/lib/editor/export-settings";
import styles from "./ExportModal.module.css";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (settings: Partial<ExportSettings>) => Promise<void>;
}

type Tab = "testing" | "production";

export function ExportModal({
  isOpen,
  onClose,
  onDownload,
}: ExportModalProps) {
  const [tab, setTab] = useState<Tab>("testing");
  const [copied, setCopied] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { appName, titleBarStyle, setAppName, setTitleBarStyle } = useExportSettings();

  const projectName = appName;

  const testingCommands = `# 1. Extract the downloaded zip
#    (Right-click → Extract, or: unzip ${projectName}.zip)
cd ${projectName}

# 2. Install dependencies
npm install

# 3. Run in development mode (hot reload)
npm run tauri dev`;

  const productionCommands = `# 1. Extract the downloaded zip
#    (Right-click → Extract, or: unzip ${projectName}.zip)
cd ${projectName}

# 2. Install dependencies
npm install

# 3. Build for production
npm run tauri build

# Output will be in src-tauri/target/release/`;

  const copyCommands = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Export project"
      >
        <div className={styles.header}>
          <h2>Export & Run Tutorial</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.settingsSection}>
            <h3>Window Settings</h3>
            <div className={styles.settingsRow}>
              <label>App name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value || "my-tauri-app")}
                placeholder="my-tauri-app"
                className={styles.appNameInput}
              />
            </div>
            <div className={styles.settingsRow}>
              <label>Window buttons</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    name="titlebar"
                    checked={titleBarStyle === "windows"}
                    onChange={() => setTitleBarStyle("windows")}
                  />
                  Windows
                </label>
                <label>
                  <input
                    type="radio"
                    name="titlebar"
                    checked={titleBarStyle === "macos"}
                    onChange={() => setTitleBarStyle("macos")}
                  />
                  macOS
                </label>
              </div>
            </div>
          </div>
          <p className={styles.intro}>
            Download your Tauri project, extract it, then run the commands below.
            Make sure you have <a href="https://rustup.rs" target="_blank" rel="noopener noreferrer">Rust</a> installed first.
          </p>

          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${tab === "testing" ? styles.tabActive : ""}`}
              onClick={() => setTab("testing")}
            >
              Testing
            </button>
            <button
              type="button"
              className={`${styles.tab} ${tab === "production" ? styles.tabActive : ""}`}
              onClick={() => setTab("production")}
            >
              Production
            </button>
          </div>

          <div className={styles.tabContent}>
            {tab === "testing" && (
              <>
                <p className={styles.description}>
                  Run your app in development mode with hot reload. Perfect for iterating on your design.
                </p>
                <div className={styles.codeBlock}>
                  <div className={styles.codeHeader}>
                    <span className={styles.codeLabel}>Terminal</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyCommands(testingCommands, "testing")}
                    >
                      {copied === "testing" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className={styles.code}>
                    <code>{testingCommands}</code>
                  </pre>
                </div>
                <div className={styles.commandHighlight}>
                  <code>npm run tauri dev</code>
                </div>
              </>
            )}
            {tab === "production" && (
              <>
                <p className={styles.description}>
                  Build a distributable executable for your target platform. Output goes to{" "}
                  <code>src-tauri/target/release/</code>.
                </p>
                <div className={styles.codeBlock}>
                  <div className={styles.codeHeader}>
                    <span className={styles.codeLabel}>Terminal</span>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyCommands(productionCommands, "production")}
                    >
                      {copied === "production" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className={styles.code}>
                    <code>{productionCommands}</code>
                  </pre>
                </div>
                <div className={styles.commandHighlight}>
                  <code>npm run tauri build</code>
                </div>
              </>
            )}
          </div>

          <div className={styles.runApp}>
            <h3>Run App</h3>
            <p>
              After downloading and extracting, run the commands above in your terminal.
              Your app will open exactly as you designed it.
            </p>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Preparing..." : "Download Project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
