"use client";

import { useEffect, useState, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { Monitor, Smartphone, RefreshCw } from "lucide-react";
import styles from "./PreviewPanel.module.css";

type DeviceSize = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DeviceSize, { width: number; height: number; label: string }> = {
  desktop: { width: 1280, height: 800,  label: "Desktop" },
  tablet:  { width: 768,  height: 1024, label: "Tablet"  },
  mobile:  { width: 390,  height: 844,  label: "Mobile"  },
};

export function PreviewPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const [html, setHtml]         = useState<string>("");
  const [device, setDevice]     = useState<DeviceSize>("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const [error, setError]       = useState<string | null>(null);

  const rebuild = useCallback(() => {
    setError(null);
    import("@/lib/editor/scene-export")
      .then(({ sceneNodesToHtml, sceneExportCss }) => {
        const body = sceneNodesToHtml(nodes, "Preview");
        const css  = sceneExportCss();
        const inlined = body
          .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
          .replace('<script src="window-controls.js"></script>', "");
        setHtml(inlined);
        setFrameKey((k) => k + 1);
      })
      .catch((e) => setError(String(e)));
  }, [nodes]);

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  const { width, height } = DEVICE_SIZES[device];
  const isEmpty = nodes.filter((n) => n.type !== "TOPBAR").length === 0;

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.label}>Preview</span>
          <span className={styles.hint}>Interactions, animations and hover effects are live</span>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.deviceGroup}>
            {(Object.entries(DEVICE_SIZES) as [DeviceSize, { width: number; height: number; label: string }][]).map(([d, val]) => (
              <button
                key={d}
                type="button"
                title={val.label}
                className={`${styles.deviceBtn} ${device === d ? styles.deviceActive : ""}`}
                onClick={() => setDevice(d)}
              >
                {d === "mobile" ? <Smartphone size={14} /> : <Monitor size={d === "desktop" ? 14 : 12} />}
              </button>
            ))}
          </div>
          <span className={styles.sizeLabel}>{width} × {height}</span>
          <button type="button" className={styles.refreshBtn} onClick={rebuild} title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className={styles.previewArea}>
        {isEmpty ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>▶</div>
            <div className={styles.emptyText}>Add elements to the canvas then switch here to preview</div>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚠</div>
            <div className={styles.emptyText}>Preview error: {error}</div>
          </div>
        ) : (
          <div className={styles.previewFrame} style={{ width, height }}>
            {html ? (
              <iframe
                key={frameKey}
                className={styles.iframe}
                srcDoc={html}
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
                style={{ width, height, border: "none", display: "block" }}
              />
            ) : (
              <div className={styles.empty}>
                <div className={styles.spinner} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
