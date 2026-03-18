"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { Play, Monitor, Laptop, Smartphone, RefreshCw, Plus, Minus, RotateCcw } from "lucide-react";
import { clampZoom } from "@/lib/editor/viewport";
import styles from "./PreviewPanel.module.css";

type DeviceSize = "desktop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DeviceSize, { width: number; height: number; label: string }> = {
  desktop: { width: 1280, height: 800,  label: "Desktop" },
  tablet:  { width: 768,  height: 1024, label: "Tablet"  },
  mobile:  { width: 390,  height: 844,  label: "Mobile"  },
};

export function PreviewPanel() {
  const nodes   = useEditorStore((s) => s.nodes);
  const canvasBg = useEditorStore((s) => s.canvasBg);
  const [html, setHtml]         = useState<string>("");
  const [device, setDevice]     = useState<DeviceSize>("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const [error, setError]       = useState<string | null>(null);
  const [status, setStatus]     = useState<string>("");

  const [zoom, setZoom]         = useState(0.75);
  const [panX, setPanX]         = useState(0);
  const [panY, setPanY]         = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const areaRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const rebuild = (currentNodes = nodes, bg = canvasBg) => {
    setError(null);
    setStatus("Building preview...");
    import("@/lib/editor/scene-export")
      .then(({ sceneNodesToHtml, sceneExportCss }) => {
        try {
          const body = sceneNodesToHtml(currentNodes, "Preview", bg);
          const css  = sceneExportCss(bg);
          const inlined = body
            .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
            .replace('<script src="window-controls.js"></script>', "");
          setHtml(inlined);
          setFrameKey((k) => k + 1);
          setStatus("");
        } catch (e) {
          setError(String(e));
          setStatus("");
        }
      })
      .catch((e) => { setError(String(e)); setStatus(""); });
  };

  useEffect(() => { rebuild(nodes, canvasBg); }, [nodes, canvasBg]); // eslint-disable-line react-hooks/exhaustive-deps

  const { width, height } = DEVICE_SIZES[device];
  const hasContent = nodes.filter((n) => n.type !== "TOPBAR").length > 0;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    if (e.shiftKey) {
      const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
      const newZoom = clampZoom(zoom * factor);
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      const mx = vx - panX;
      const my = vy - panY;
      const scale = newZoom / zoom;
      setPanX(vx - mx * scale);
      setPanY(vy - my * scale);
      setZoom(newZoom);
    } else {
      setPanX((p) => p - e.deltaX);
      setPanY((p) => p - e.deltaY);
    }
  }, [zoom, panX, panY]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  }, [panX, panY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPanX(panStartRef.current.panX + dx);
    setPanY(panStartRef.current.panY + dy);
  }, [isPanning]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const zoomIn = () => setZoom((z) => clampZoom(z * 1.25));
  const zoomOut = () => setZoom((z) => clampZoom(z / 1.25));
  const resetView = () => { setZoom(0.75); setPanX(0); setPanY(0); };

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (optionsOpen && optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [optionsOpen]);

  return (
    <div className={styles.panel}>
      <div
        ref={areaRef}
        className={`${styles.previewArea} ${isPanning ? styles.panning : ""}`}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setIsPanning(false)}
      >
        <div className={styles.floatingOptions} ref={optionsRef}>
          <button
            type="button"
            className={`${styles.playBtn} ${optionsOpen ? styles.playBtnActive : ""}`}
            onClick={() => setOptionsOpen((o) => !o)}
            title="Preview options"
          >
            <Play size={14} strokeWidth={2.5} fill="currentColor" />
          </button>
          {optionsOpen && (
            <div className={styles.optionsDropdown}>
              <div className={styles.optionsSection}>
                <span className={styles.optionsSectionLabel}>Device</span>
                <div className={styles.deviceGroup}>
                  {(Object.entries(DEVICE_SIZES) as [DeviceSize, { width: number; height: number; label: string }][]).map(([d, val]) => (
                    <button key={d} type="button" title={val.label}
                      className={`${styles.deviceBtn} ${device === d ? styles.deviceActive : ""}`}
                      onClick={() => setDevice(d)}>
                      {d === "mobile" ? <Smartphone size={14} /> : d === "tablet" ? <Laptop size={14} /> : <Monitor size={14} />}
                    </button>
                  ))}
                </div>
                <span className={styles.sizeLabel}>{width} × {height}</span>
              </div>
              <div className={styles.optionsDivider} />
              <div className={styles.optionsSection}>
                <span className={styles.optionsSectionLabel}>Zoom</span>
                <div className={styles.zoomGroup}>
                  <button type="button" className={styles.zoomBtn} onClick={zoomOut} title="Zoom out">
                    <Minus size={11} strokeWidth={2.5} />
                  </button>
                  <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
                  <button type="button" className={styles.zoomBtn} onClick={zoomIn} title="Zoom in">
                    <Plus size={11} strokeWidth={2.5} />
                  </button>
                  <button type="button" className={styles.zoomBtn} onClick={resetView} title="Reset view">
                    <RotateCcw size={11} />
                  </button>
                </div>
              </div>
              <div className={styles.optionsDivider} />
              <div className={styles.optionsSection}>
                <button type="button" className={styles.refreshBtn} onClick={() => { rebuild(nodes, canvasBg); setOptionsOpen(false); }} title="Refresh preview">
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          )}
        </div>
        {error ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚠</div>
            <div className={styles.emptyText} style={{ color: "#f04444" }}>{error}</div>
          </div>
        ) : !hasContent ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>▶</div>
            <div className={styles.emptyText}>Add elements to the canvas to see a preview</div>
          </div>
        ) : !html ? (
          <div className={styles.empty}><div className={styles.spinner} /></div>
        ) : (
          <div
            className={styles.previewTransform}
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <div className={styles.previewFrame} style={{ width, height }}>
              <iframe key={frameKey} className={styles.iframe} srcDoc={html}
                title="Preview" sandbox="allow-scripts allow-same-origin"
                style={{ width, height, border: "none", display: "block" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
