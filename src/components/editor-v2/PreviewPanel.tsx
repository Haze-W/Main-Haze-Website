"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import {
  MonitorPlay,
  Monitor,
  Laptop,
  Smartphone,
  Maximize2,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { clampZoom } from "@/lib/editor/viewport";
import { mergeRootOrphansIntoFrames } from "@/lib/editor/placement";
import styles from "./PreviewPanel.module.css";

type DeviceSize = "frame" | "desktop" | "tablet" | "mobile";

const PRESET_VIEWPORTS: Record<"desktop" | "tablet" | "mobile", { width: number; height: number; label: string }> = {
  desktop: { width: 1280, height: 800, label: "Desktop" },
  tablet: { width: 768, height: 1024, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
};

function findFirstFrameId(ns: SceneNode[]): string | null {
  for (const n of ns) {
    if (n.type === "FRAME") return n.id;
    const c = findFirstFrameId(n.children ?? []);
    if (c) return c;
  }
  return null;
}

function findFrameById(ns: SceneNode[], id: string): SceneNode | null {
  for (const n of ns) {
    if (n.id === id && n.type === "FRAME") return n;
    const c = findFrameById(n.children ?? [], id);
    if (c) return c;
  }
  return null;
}

function buildPrototypeRules(
  nodes: SceneNode[]
): Record<string, { action: string; targetId?: string; transition?: string; duration?: number }> {
  const out: Record<string, { action: string; targetId?: string; transition?: string; duration?: number }> = {};
  function walk(ns: SceneNode[]) {
    for (const n of ns) {
      const ix = n.props?.interactions as
        | Array<{ action?: string; targetId?: string; transition?: string; duration?: number }>
        | undefined;
      if (ix?.[0]) {
        out[n.id] = {
          action: String(ix[0].action ?? ""),
          targetId: ix[0].targetId,
          transition: ix[0].transition,
          duration: ix[0].duration,
        };
      }
      walk(n.children ?? []);
    }
  }
  walk(nodes);
  return out;
}

function mapTransitionClass(t: string | undefined): string {
  switch (t) {
    case "Dissolve":
      return styles.protoDissolve;
    case "Push Left":
      return styles.protoPushLeft;
    case "Push Right":
      return styles.protoPushRight;
    case "Slide Up":
      return styles.protoSlideUp;
    default:
      return "";
  }
}

export function PreviewPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const canvasBg = useEditorStore((s) => s.canvasBg);
  const [html, setHtml] = useState<string>("");
  const [device, setDevice] = useState<DeviceSize>("frame");
  const [frameKey, setFrameKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [zoom, setZoom] = useState(0.75);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const areaRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const mergedNodes = useMemo(() => mergeRootOrphansIntoFrames(nodes), [nodes]);
  const firstFrameId = useMemo(() => findFirstFrameId(mergedNodes), [mergedNodes]);
  const [previewFrameId, setPreviewFrameId] = useState<string | null>(null);
  const previewFrame = useMemo(() => {
    if (!previewFrameId) return null;
    return findFrameById(mergedNodes, previewFrameId);
  }, [mergedNodes, previewFrameId]);
  const [history, setHistory] = useState<string[]>([]);
  const [lastNav, setLastNav] = useState<{ transition: string; duration: number } | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    previewRef.current = previewFrameId;
  }, [previewFrameId]);

  useEffect(() => {
    if (firstFrameId && previewFrameId === null) setPreviewFrameId(firstFrameId);
  }, [firstFrameId, previewFrameId]);

  const handleBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setPreviewFrameId(prev || firstFrameId);
      setLastNav({ transition: "Instant", duration: 200 });
      return h.slice(0, -1);
    });
  }, [firstFrameId]);

  const rebuild = useCallback((currentNodes: SceneNode[], bg: string, frameId: string | null) => {
    setError(null);
    if (!frameId) {
      setHtml("");
      return;
    }
    const merged = mergeRootOrphansIntoFrames(currentNodes);
    const frame = findFrameById(merged, frameId);
    if (!frame) {
      setHtml("");
      setError("Frame not found");
      return;
    }
    import("@/lib/editor/scene-export")
      .then(async ({ sceneNodesToHtml, sceneExportCss }) => {
        try {
          const { preloadLucideIcons } = await import("@/lib/icon-svg");
          await preloadLucideIcons();
          const rules = buildPrototypeRules(merged);
          const body = sceneNodesToHtml([frame], "Preview", bg);
          const css = sceneExportCss(bg);
          const protoScript = `<script>(function(){var R=${JSON.stringify(rules)};document.addEventListener('click',function(e){var el=e.target;while(el&&el!==document.documentElement){var id=el.getAttribute&&el.getAttribute('data-node-id');if(id&&R[id]){var r=R[id];if(r.action==='NAVIGATE'&&r.targetId){e.preventDefault();e.stopPropagation();if(window.parent&&window.parent!==window){window.parent.postMessage({type:'haze-prototype',action:'NAVIGATE',targetId:r.targetId,transition:r.transition||'Instant',duration:typeof r.duration==='number'?r.duration:300},'*');}return;}if(r.action==='BACK'){e.preventDefault();e.stopPropagation();if(window.parent&&window.parent!==window){window.parent.postMessage({type:'haze-prototype',action:'BACK'},'*');}return;}}el=el.parentElement;}},true);})();</script>`;
          let inlined = body
            .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
            .replace('<script src="window-controls.js"></script>', "");
          if (inlined.includes("</body>")) {
            inlined = inlined.replace("</body>", `${protoScript}</body>`);
          } else {
            inlined += protoScript;
          }
          setHtml(inlined);
          setIframeReady(false);
          setFrameKey((k) => k + 1);
          setStatus("");
        } catch (e) {
          setError(String(e));
          setStatus("");
        }
      })
      .catch((e) => {
        setError(String(e));
        setStatus("");
      });
  }, []);

  useEffect(() => {
    if (!previewFrameId) return;
    rebuild(nodes, canvasBg, previewFrameId);
  }, [nodes, canvasBg, previewFrameId, rebuild]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || d.type !== "haze-prototype") return;
      if (d.action === "NAVIGATE" && d.targetId) {
        const cur = previewRef.current ?? firstFrameId;
        if (cur) setHistory((h) => [...h, cur]);
        setLastNav({
          transition: typeof d.transition === "string" ? d.transition : "Instant",
          duration: typeof d.duration === "number" ? d.duration : 300,
        });
        setPreviewFrameId(d.targetId);
      }
      if (d.action === "BACK") {
        handleBack();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [firstFrameId, handleBack]);

  const { width, height, viewportLabel } = useMemo(() => {
    if (device === "frame" && previewFrame) {
      return {
        width: Math.max(1, previewFrame.width),
        height: Math.max(1, previewFrame.height),
        viewportLabel: "Frame",
      };
    }
    const key = device === "frame" ? "desktop" : device;
    const p = PRESET_VIEWPORTS[key];
    return { width: p.width, height: p.height, viewportLabel: p.label };
  }, [device, previewFrame]);

  const hasContent = firstFrameId != null;

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
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
    },
    [zoom, panX, panY]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
    },
    [panX, panY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanX(panStartRef.current.panX + dx);
      setPanY(panStartRef.current.panY + dy);
    },
    [isPanning]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsPanning(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const zoomIn = () => setZoom((z) => clampZoom(z * 1.25));
  const zoomOut = () => setZoom((z) => clampZoom(z / 1.25));
  const resetView = () => {
    setZoom(0.75);
    setPanX(0);
    setPanY(0);
  };

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

  const trClass = lastNav ? mapTransitionClass(lastNav.transition) : "";
  const protoDur = `${lastNav?.duration ?? 300}ms`;

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
        <div className={styles.previewTopBar}>
          {history.length > 0 && (
            <button type="button" className={styles.previewBackBtn} onClick={handleBack} title="Go back">
              <ArrowLeft size={14} strokeWidth={2} />
              Back
            </button>
          )}
          <div className={styles.floatingOptions} ref={optionsRef}>
            <button
              type="button"
              className={`${styles.playBtn} ${optionsOpen ? styles.playBtnActive : ""}`}
              onClick={() => setOptionsOpen((o) => !o)}
              title="Device, zoom & refresh"
            >
              <MonitorPlay size={16} strokeWidth={2} aria-hidden />
            </button>
            {optionsOpen && (
              <div className={styles.optionsDropdown}>
                <div className={styles.optionsSection}>
                  <span className={styles.optionsSectionLabel}>Viewport</span>
                  <div className={styles.deviceGroup}>
                    <button
                      type="button"
                      title="Match frame size (IDE, Desktop, App, Wide, …)"
                      className={`${styles.deviceBtn} ${device === "frame" ? styles.deviceActive : ""}`}
                      onClick={() => setDevice("frame")}
                    >
                      <Maximize2 size={14} />
                    </button>
                    {(Object.entries(PRESET_VIEWPORTS) as ["desktop" | "tablet" | "mobile", { width: number; height: number; label: string }][]).map(
                      ([d, val]) => (
                        <button
                          key={d}
                          type="button"
                          title={val.label}
                          className={`${styles.deviceBtn} ${device === d ? styles.deviceActive : ""}`}
                          onClick={() => setDevice(d)}
                        >
                          {d === "mobile" ? (
                            <Smartphone size={14} />
                          ) : d === "tablet" ? (
                            <Laptop size={14} />
                          ) : (
                            <Monitor size={14} />
                          )}
                        </button>
                      )
                    )}
                  </div>
                  <span className={styles.sizeLabel}>
                    {width} × {height} · {viewportLabel}
                  </span>
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
                  <button
                    type="button"
                    className={styles.refreshBtn}
                    onClick={() => {
                      if (previewFrameId) rebuild(nodes, canvasBg, previewFrameId);
                      setOptionsOpen(false);
                    }}
                    title="Refresh preview"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {error ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚠</div>
            <div className={styles.emptyText} style={{ color: "#f04444" }}>
              {error}
            </div>
          </div>
        ) : !hasContent ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>▶</div>
            <div className={styles.emptyText}>Add a frame to the canvas to preview prototyping</div>
          </div>
        ) : !html ? (
          <div className={styles.empty}>
            <div className={styles.spinner} />
          </div>
        ) : (
          <div
            className={styles.previewTransform}
            style={{
              transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <div
              className={`${styles.previewFrame} ${trClass}`}
              style={
                {
                  width,
                  height,
                  ["--proto-dur" as string]: protoDur,
                } as React.CSSProperties
              }
              key={`${previewFrameId}-${frameKey}`}
            >
              <iframe
                className={`${styles.iframe} ${iframeReady ? styles.iframeVisible : ""}`}
                srcDoc={html}
                title="Preview"
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                onLoad={() => setIframeReady(true)}
                style={{ width, height, border: "none", display: "block" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
