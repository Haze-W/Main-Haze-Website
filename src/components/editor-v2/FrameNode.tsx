"use client";

import { useCallback } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { ResizeHandles } from "./ResizeHandles";
import { FigmaNodeRenderer } from "./FigmaNodeRenderer";
import { SceneNodeRenderer } from "./SceneNodeRenderer";

interface FrameNodeProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
}

export function FrameNode({ node, isSelected, zoom }: FrameNodeProps) {
  if (node.visible === false) return null;
  const {
    setSelectedIds,
    toggleSelection,
    moveNodes,
    resizeNode,
    pushHistory,
    selectedIds,
    enteredFrameId,
    enterFrame,
    exitFrame,
  } = useEditorStore();

  const isFrameEntered = enteredFrameId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleResizeStart = useCallback(
    (handle: string) => (e: React.PointerEvent) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const last = { clientX: e.clientX, clientY: e.clientY };
      const onMove = (move: PointerEvent) => {
        const currentZoom = useEditorStore.getState().viewport.zoom;
        const dx = (move.clientX - last.clientX) / currentZoom;
        const dy = (move.clientY - last.clientY) / currentZoom;
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
    [node.id, resizeNode, pushHistory]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        toggleSelection(node.id);
      } else {
        if (isFrameEntered) {
          exitFrame();
        }
        setSelectedIds([node.id]);
      }
    },
    [node.id, toggleSelection, setSelectedIds, isFrameEntered, exitFrame]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        enterFrame(node.id);
      }
    },
    [node.id, hasChildren, enterFrame]
  );

  const frameOutline = isFrameEntered
    ? "2px dashed var(--accent)"
    : isSelected
      ? "2px solid var(--accent)"
      : "none";

  const p = node.props?.padding as number | undefined;
  const framePad =
    p != null || node.props?.paddingTop != null
      ? `${(node.props?.paddingTop as number) ?? p ?? 0}px ${(node.props?.paddingRight as number) ?? p ?? 0}px ${(node.props?.paddingBottom as number) ?? p ?? 0}px ${(node.props?.paddingLeft as number) ?? p ?? 0}px`
      : undefined;
  const bw = node.props?.borderWidth as number | undefined;
  const bc = node.props?.borderColor as string | undefined;
  const customBorder = bw != null && bc ? `${bw}px solid ${bc}` : undefined;

  return (
    <div
      className={`frame-node ${isSelected ? "selected" : ""}`}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        border:
          isSelected && !isFrameEntered
            ? "none"
            : customBorder ?? "1px solid rgba(255,255,255,0.06)",
        borderRadius: (node.props?.borderRadius as number) ?? 6,
        background: (node.props?.backgroundColor as string) ?? "rgba(30,30,34,0.95)",
        ...(node.props?.boxShadow ? { boxShadow: String(node.props.boxShadow) } : {}),
        ...(framePad ? { padding: framePad } : {}),
        overflow: node.overflow === "HIDDEN" ? "hidden" : "visible",
        cursor: "pointer",
        boxSizing: "border-box",
        outline: frameOutline,
        outlineOffset: isFrameEntered ? 2 : -1,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (isFrameEntered) return; // Don't drag frame when editing children
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        const last = { clientX: e.clientX, clientY: e.clientY };
        let moved = false;
        const onMove = (move: PointerEvent) => {
          const currentZoom = useEditorStore.getState().viewport.zoom;
          const dx = (move.clientX - last.clientX) / currentZoom;
          const dy = (move.clientY - last.clientY) / currentZoom;
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
      {isSelected && !isFrameEntered && <ResizeHandles onResizeStart={handleResizeStart} />}
      <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 1 }}>
        {node.children?.map((child) => {
          const childSelected = selectedIds.has(child.id);
          if (child.props?._figma) {
            return (
              <FigmaNodeRenderer
                key={child.id}
                node={child}
                isSelected={childSelected}
                zoom={zoom}
                isChild={true}
                parentLayout={(node.layoutMode as "NONE" | "HORIZONTAL" | "VERTICAL") ?? "NONE"}
              />
            );
          }
          return (
            <SceneNodeRenderer
              key={child.id}
              node={child}
              isSelected={childSelected}
              zoom={zoom}
            />
          );
        })}
      </div>
    </div>
  );
}
