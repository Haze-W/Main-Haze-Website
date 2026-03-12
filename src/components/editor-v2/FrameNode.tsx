"use client";

import { useCallback } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { ResizeHandles } from "./ResizeHandles";
import { FigmaNodeRenderer } from "./FigmaNodeRenderer";

interface FrameNodeProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
}

export function FrameNode({ node, isSelected, zoom }: FrameNodeProps) {
  const { setSelectedIds, toggleSelection, moveNodes, resizeNode, pushHistory, selectedIds } = useEditorStore();

  const handleResizeStart = useCallback(
    (handle: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const last = { clientX: e.clientX, clientY: e.clientY };
      const onMove = (move: PointerEvent) => {
        const dx = (move.clientX - last.clientX) / zoom;
        const dy = (move.clientY - last.clientY) / zoom;
        resizeNode(node.id, handle, dx, dy);
        last.clientX = move.clientX;
        last.clientY = move.clientY;
      };
      const onUp = () => {
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        pushHistory();
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [node.id, zoom, resizeNode, pushHistory]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        toggleSelection(node.id);
      } else {
        setSelectedIds([node.id]);
      }
    },
    [node.id, toggleSelection, setSelectedIds]
  );

  return (
    <div
      className={`frame-node ${isSelected ? "selected" : ""}`}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        border: isSelected ? "none" : "1px solid rgba(255,255,255,0.06)",
        borderRadius: 6,
        background: (node.props?.backgroundColor as string) ?? "rgba(30,30,34,0.95)",
        overflow: node.overflow === "HIDDEN" ? "hidden" : "visible",
        cursor: "pointer",
        boxSizing: "border-box",
        outline: isSelected ? "2px solid var(--accent)" : "none",
        outlineOffset: -1,
      }}
      onClick={handleClick}
      onContextMenu={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        const last = { clientX: e.clientX, clientY: e.clientY };
        let moved = false;
        const onMove = (move: PointerEvent) => {
          const dx = (move.clientX - last.clientX) / zoom;
          const dy = (move.clientY - last.clientY) / zoom;
          if (dx !== 0 || dy !== 0) moved = true;
          moveNodes([node.id], dx, dy);
          last.clientX = move.clientX;
          last.clientY = move.clientY;
        };
        const onUp = () => {
          target.releasePointerCapture(e.pointerId);
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          if (moved) pushHistory();
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      }}
    >
      {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {node.children?.map((child) => {
          if (child.props?._figma) {
            return (
              <FigmaNodeRenderer
                key={child.id}
                node={child}
                isSelected={false}
                zoom={zoom}
                isChild={true}
              />
            );
          }
          return (
            <div
              key={child.id}
              style={{
                position: "absolute",
                left: child.x,
                top: child.y,
                width: child.width,
                height: child.height,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
