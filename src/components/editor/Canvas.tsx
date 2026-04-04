"use client";

import { useCallback, useState, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useEditorStore } from "@/lib/editor-store";
import { CanvasNode } from "./CanvasNode";
import styles from "./Canvas.module.css";

function CanvasInner() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const {
    frames,
    activeFrameId,
    zoom,
    pan,
    setZoom,
    setPan,
    setIsPanning,
    selectedIds,
    deleteNode,
    addNode,
  } = useEditorStore();

  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  const nodes = activeFrame?.children ?? [];
  const dims = activeFrame
    ? { width: activeFrame.width, height: activeFrame.height }
    : { width: 1200, height: 800 };

  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop" });

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      setIsPanning(false);
    };
  }, [setIsPanning]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(
          useEditorStore.getState().zoom + (e.deltaY > 0 ? -0.05 : 0.05)
        );
      } else {
        setPan({
          x: useEditorStore.getState().pan.x - e.deltaX,
          y: useEditorStore.getState().pan.y - e.deltaY,
        });
      }
    },
    [setZoom, setPan]
  );

  const isPanning = useEditorStore((s) => s.isPanning);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
      }
    },
    [setIsPanning]
  );

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      const { pan: p } = useEditorStore.getState();
      setPan({ x: p.x + e.movementX, y: p.y + e.movementY });
    };
    const onUp = () => setIsPanning(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning, setPan, setIsPanning]);


  const handleMouseLeave = useCallback(() => {
    if (useEditorStore.getState().isPanning) setIsPanning(false);
  }, [setIsPanning]);

  return (
    <div
      className={`${styles.canvasWrapper} ${isPanning ? styles.panning : ""}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <div
        className={styles.canvasTransform}
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          ref={setNodeRef}
          className={`${styles.canvas} ${isOver ? styles.dropOver : ""}`}
          style={{
            width: dims.width,
            height: dims.height,
            minWidth: dims.width,
            minHeight: dims.height,
          }}
        >
          <div className={styles.grid} aria-hidden />
          <div className={styles.frameLayer}>
            <div className={styles.nodesLayer}>
              {nodes.map((node) => (
                <CanvasNode
                  key={node.id}
                  node={node}
                  isSelected={selectedIds.includes(node.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {activeFrame && (
            <button
              type="button"
              onClick={() => {
                addNode({ type: "container", props: {} });
                setContextMenu(null);
              }}
            >
              Add Container
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => deleteNode(id));
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Canvas() {
  return <CanvasInner />;
}
