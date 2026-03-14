"use client";

import { useEffect, useRef, useState } from "react";
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
  const [html, setHtml]       = useState<string>("");
  const [device, setDevice]   = useState<DeviceSize>("desktop");
  const [loading, setLoading] = useState(false);
  const [key, setKey]         = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate the preview HTML whenever nodes change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import("@/lib/editor/scene-export").then(({ sceneNodesToHtml, sceneExportCss }) => {
      if (cancelled) return;
      const body   = sceneNodesToHtml(nodes, "Preview");
      const css    = sceneExportCss();
      // Inject the CSS inline so the iframe is fully self-contained
      const inlined = body.replace(
        '<link rel="stylesheet" href="styles.css">',
        `<style>${css}</style>`
      ).replace(
        '<script src="window-controls.js"></script>',
        ""
      );
      setHtml(inlined);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [nodes]);

  const refresh = () => {
    setKey((k) => k + 1);
  };

  const { width, height } = DEVICE_SIZES[device];

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.label}>Preview</span>
          <span className={styles.hint}>Interactions, animations and hover effects are live here</span>
        </div>
        <div className={styles.toolbarRight}>
          {/* Device switcher */}
          <div className={styles.deviceGroup}>
            {(Object.entries(DEVICE_SIZES) as [DeviceSize, typeof DEVICE_SIZES[DeviceSize]][]).map(([key, val]) => (
              <button
                key={key}
                type="button"
                title={val.label}
                className={`${styles.deviceBtn} ${device === key ? styles.deviceActive : ""}`}
                onClick={() => setDevice(key)}
              >
                {key === "desktop"   && <Monitor size={14} />}
                {key === "tablet"    && <Monitor size={12} />}
                {key === "mobile"    && <Smartphone size={14} />}
              </button>
            ))}
          </div>
          <span className={styles.sizeLabel}>{width} × {height}</span>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={refresh}
            title="Refresh preview"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className={styles.previewArea}>
        <div
          className={styles.previewFrame}
          style={{ width, height }}
        >
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
            </div>
          )}
          {html && (
            <iframe
              key={key}
              ref={iframeRef}
              className={styles.iframe}
              srcDoc={html}
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              style={{ width, height }}
            />
          )}
          {!html && !loading && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>▶</div>
              <div className={styles.emptyText}>Add elements to the canvas to see a preview</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
