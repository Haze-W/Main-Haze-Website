"use client";

import { useCallback } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { ResizeHandles } from "./ResizeHandles";

interface FrameNodeProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
}

export function FrameNode({ node, isSelected, zoom }: FrameNodeProps) {
  const { setSelectedIds, toggleSelection, moveNodes, resizeNode, pushHistory } = useEditorStore();

  const handleResizeStart = useCallback(
    (handle: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      const last = { clientX: e.clientX, clientY: e.clientY };
      const onMove = (move: PointerEvent) => {
        const dx = (move.clientX - last.clientX) / zoom;
        const dy = (move.clientY - last.clientY) / zoom;
        resizeNode(node.id, handle, dx, dy);
        last.clientX = move.clientX;
        last.clientY = move.clientY;
      };
      const onUp = () => {
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
        border: "1px solid var(--border-default)",
        borderRadius: 4,
        background: (node.props?.backgroundColor as string) ?? "var(--bg-overlay)",
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
        const last = { clientX: e.clientX, clientY: e.clientY };
        const onMove = (move: PointerEvent) => {
          const dx = (move.clientX - last.clientX) / zoom;
          const dy = (move.clientY - last.clientY) / zoom;
          moveNodes([node.id], dx, dy);
          last.clientX = move.clientX;
          last.clientY = move.clientY;
        };
        const onUp = () => {
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          pushHistory();
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      }}
    >
      {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      <div
        style={{
          padding: 8,
          fontSize: 11,
          color: "var(--fg-muted)",
          borderBottom: "1px solid var(--border-muted)",
        }}
      >
        {node.name}
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: node.height - 40 }}>
        {node.children?.map((child) => (
          <div
            key={child.id}
            style={{
              position: "absolute",
              left: child.x,
              top: child.y,
              width: child.width,
              height: child.height,
              background: "var(--bg-hover)",
              border: "1px dashed var(--border-muted)",
              borderRadius: 4,
              fontSize: 10,
              color: "var(--fg-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {child.type}
          </div>
        ))}
      </div>
    </div>
  );
}
