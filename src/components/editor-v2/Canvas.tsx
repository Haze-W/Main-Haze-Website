"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useEditorStore } from "@/lib/editor/store";
import { screenToCanvas, clampZoom, clampPan } from "@/lib/editor/viewport";
import { SceneNodeRenderer } from "./SceneNodeRenderer";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import styles from "./Canvas.module.css";

function buildContextMenuItems(
  selectedIds: Set<string>,
  duplicate: (ids: string[]) => void,
  remove: (ids: string[]) => void
): ContextMenuItem[] {
  const ids = [...selectedIds];
  const hasSelection = ids.length > 0;
  return [
    { id: "paste", label: "Paste", shortcut: "Ctrl+V", disabled: true },
    { id: "paste-in-place", label: "Paste in Place", shortcut: "Ctrl+Shift+V", disabled: true },
    { id: "div1", divider: true },
    { id: "duplicate", label: "Duplicate", shortcut: "Ctrl+D", disabled: !hasSelection, onClick: () => duplicate(ids) },
    { id: "div2", divider: true },
    { id: "delete", label: "Delete", shortcut: "Del", disabled: !hasSelection, onClick: () => remove(ids) },
  ];
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: "canvas-drop" });

  const {
    nodes,
    viewport,
    setViewport,
    selectedIds,
    setSelectedIds,
    setMarquee,
    deleteNodes,
    duplicateNodes,
    tool,
    isPanning,
    isSpacePressed,
    setSpacePressed,
    setIsPanning,
    isMarqueeSelecting,
    marqueeRect,
    isCreatingFrame,
    createFrameStart,
    finishCreateFrame,
    cancelCreateFrame,
    findNodesInRect,
    setTool,
    canvasBg,
    showGrid,
    gridType,
  } = useEditorStore();


  const measure = useCallback(() => {
    if (containerRef.current) {
      setContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRect) return { x: 0, y: 0 };
      return screenToCanvas(
        e.clientX,
        e.clientY,
        containerRect,
        viewport.panX,
        viewport.panY,
        viewport.zoom
      );
    },
    [containerRect, viewport]
  );

  const [createFrameCurrent, setCreateFrameCurrent] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const [dragState, setDragState] = useState<{
    type: "pan" | "marquee" | "frame";
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      const pt = getCanvasPoint(e);
      if (e.button === 1 || (e.button === 0 && (isSpacePressed || tool === "HAND"))) {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setDragState({
          type: "pan",
          startX: e.clientX,
          startY: e.clientY,
          startPanX: viewport.panX,
          startPanY: viewport.panY,
        });
        setIsPanning(true);
        return;
      }
      if (e.button === 0 && tool === "FRAME") {
        useEditorStore.getState().startCreateFrame(pt.x, pt.y);
        setCreateFrameCurrent({ x: pt.x, y: pt.y });
        setDragState({ type: "frame", startX: pt.x, startY: pt.y, startPanX: 0, startPanY: 0 });
        return;
      }
      if (e.button === 0 && tool === "SELECT") {
        setDragState({
          type: "marquee",
          startX: pt.x,
          startY: pt.y,
          startPanX: pt.x,
          startPanY: pt.y,
        });
        setMarquee({ x: pt.x, y: pt.y, width: 0, height: 0 });
        return;
      }
    },
    [
      getCanvasPoint,
      isSpacePressed,
      tool,
      viewport.panX,
      viewport.panY,
      setIsPanning,
      setMarquee,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const pt = getCanvasPoint(e);
      if (dragState.type === "pan") {
        const rawPanX = dragState.startPanX + (e.clientX - dragState.startX);
        const rawPanY = dragState.startPanY + (e.clientY - dragState.startY);
        const rect = containerRef.current?.getBoundingClientRect();
        const clamped = rect
          ? clampPan(rawPanX, rawPanY, viewport.zoom, rect.width, rect.height)
          : { panX: rawPanX, panY: rawPanY };
        setViewport(clamped);
      } else if (dragState.type === "marquee") {
        const x = Math.min(dragState.startX, pt.x);
        const y = Math.min(dragState.startY, pt.y);
        const w = Math.abs(pt.x - dragState.startX);
        const h = Math.abs(pt.y - dragState.startY);
        setMarquee({ x, y, width: w, height: h });
      } else if (dragState.type === "frame") {
        useEditorStore.getState().updateCreateFrame(pt.x, pt.y);
        setCreateFrameCurrent({ x: pt.x, y: pt.y });
      }
    },
    [dragState, getCanvasPoint, viewport.zoom, setViewport, setMarquee]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      if (!dragState) return;
      const pt = getCanvasPoint(e);
      if (dragState.type === "pan") {
        setIsPanning(false);
      } else if (dragState.type === "marquee") {
        const x = Math.min(dragState.startX, pt.x);
        const y = Math.min(dragState.startY, pt.y);
        const w = Math.abs(pt.x - dragState.startX);
        const h = Math.abs(pt.y - dragState.startY);
        const ids = w > 2 && h > 2 ? findNodesInRect({ x, y, width: w, height: h }) : [];
        setSelectedIds(ids);
      } else if (dragState.type === "frame") {
        finishCreateFrame(pt.x, pt.y);
      }
      setCreateFrameCurrent(null);
      setMarquee(null);
      setDragState(null);
    },
    [
      dragState,
      getCanvasPoint,
      setIsPanning,
      setMarquee,
      findNodesInRect,
      setSelectedIds,
      finishCreateFrame,
    ]
  );

  // Figma-style: Scroll = pan. Ctrl/Cmd+scroll or Shift+scroll = zoom (cursor-centered).
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!containerRect) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const isZoom = e.ctrlKey || e.metaKey || e.shiftKey;

      if (isZoom) {
        const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
        const newZoom = clampZoom(viewport.zoom * factor);
        const vx = e.clientX - rect.left;
        const vy = e.clientY - rect.top;
        const mx = vx - viewport.panX;
        const my = vy - viewport.panY;
        const scale = newZoom / viewport.zoom;
        const rawPanX = vx - mx * scale;
        const rawPanY = vy - my * scale;
        const clamped = clampPan(rawPanX, rawPanY, newZoom, rect.width, rect.height);
        setViewport({ zoom: newZoom, ...clamped });
      } else {
        const rawPanX = viewport.panX - e.deltaX;
        const rawPanY = viewport.panY - e.deltaY;
        const clamped = clampPan(rawPanX, rawPanY, viewport.zoom, rect.width, rect.height);
        setViewport(clamped);
      }
    },
    [containerRect, viewport, setViewport]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePressed(true);
        setTool("HAND");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
        setTool("SELECT");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [setSpacePressed, setTool]);

  // Native non-passive wheel listener so scroll/zoom can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // Always handle wheel (pan or zoom) on canvas
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Clamp pan when container resizes or zoom changes (e.g. from zoom buttons)
  useEffect(() => {
    if (!containerRect) return;
    const clamped = clampPan(
      viewport.panX,
      viewport.panY,
      viewport.zoom,
      containerRect.width,
      containerRect.height
    );
    if (clamped.panX !== viewport.panX || clamped.panY !== viewport.panY) {
      setViewport(clamped);
    }
  }, [containerRect, viewport.panX, viewport.panY, viewport.zoom, setViewport]);

  const effectivePan = viewport.panX;
  const effectiveZoom = viewport.zoom;

  return (
    <div
      ref={(el) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        setDroppableRef(el as HTMLElement);
      }}
      className={`${styles.wrapper} ${isPanning ? styles.panning : ""}`}
      style={{
        background: canvasBg,
        cursor: isPanning || isSpacePressed ? "grabbing" : tool === "HAND" ? "grab" : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (dragState) {
          setCreateFrameCurrent(null);
          setMarquee(null);
          setDragState(null);
          if (dragState.type === "pan") setIsPanning(false);
          if (dragState.type === "frame") cancelCreateFrame();
        }
      }}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div
        className={styles.transform}
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${effectiveZoom})`,
        }}
      >
        <div className={styles.canvas}>
          {showGrid && gridType !== "none" && (
            <div
              className={`${styles.grid} ${styles[`grid${gridType.charAt(0).toUpperCase() + gridType.slice(1)}`]}`}
              aria-hidden
            />
          )}
          <div className={styles.content}>
            {nodes.map((node, i) => (
              <SceneNodeRenderer
                key={`${node.id}-${i}`}
                node={node}
                isSelected={selectedIds.has(node.id)}
                zoom={viewport.zoom}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.zoomTooltip} title="Ctrl/Cmd + scroll or Shift + scroll to zoom">
        <span className={styles.zoomTooltipValue}>{Math.round(viewport.zoom * 100)}%</span>
        <span className={styles.zoomTooltipHint}>Ctrl + scroll</span>
      </div>

      {marqueeRect && marqueeRect.width > 1 && marqueeRect.height > 1 && (
        <div
          className={styles.marquee}
          style={{
            left: marqueeRect.x * effectiveZoom + viewport.panX,
            top: marqueeRect.y * effectiveZoom + viewport.panY,
            width: marqueeRect.width * effectiveZoom,
            height: marqueeRect.height * effectiveZoom,
          }}
        />
      )}

      {nodes.length === 0 && !isCreatingFrame && (
        <div className={styles.emptyState}>
          <p>Blank canvas</p>
          <p className={styles.emptyHint}>Select Frame tool (F) and drag to create a frame, or add components from the left panel</p>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={buildContextMenuItems(selectedIds, duplicateNodes, deleteNodes)}
        />
      )}

      {isCreatingFrame && createFrameStart && createFrameCurrent && (() => {
        const x = Math.min(createFrameStart.x, createFrameCurrent.x);
        const y = Math.min(createFrameStart.y, createFrameCurrent.y);
        const w = Math.max(20, Math.abs(createFrameCurrent.x - createFrameStart.x));
        const h = Math.max(20, Math.abs(createFrameCurrent.y - createFrameStart.y));
        return (
          <div
            className={styles.createFramePreview}
            style={{
              left: x * effectiveZoom + viewport.panX,
              top: y * effectiveZoom + viewport.panY,
              width: w * effectiveZoom,
              height: h * effectiveZoom,
            }}
          />
        );
      })()}
    </div>
  );
}
