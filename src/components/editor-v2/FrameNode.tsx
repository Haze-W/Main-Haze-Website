"use client";

import { useCallback, memo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { mergeDragTransform } from "@/lib/editor/drag-transform";
import { ResizeHandles } from "./ResizeHandles";
import { FigmaNodeRenderer } from "./FigmaNodeRenderer";
import { SceneNodeRenderer } from "./SceneNodeRenderer";
import { paintsToCss, effectsToBoxShadow, effectsToFilter } from "@/lib/editor/node-surface-style";

function mapPrimaryAxisAlign(v?: string): React.CSSProperties["justifyContent"] {
  switch (v) {
    case "CENTER":
      return "center";
    case "MAX":
      return "flex-end";
    case "SPACE_BETWEEN":
      return "space-between";
    default:
      return "flex-start";
  }
}

function mapCounterAxisAlign(v?: string): React.CSSProperties["alignItems"] {
  switch (v) {
    case "CENTER":
      return "center";
    case "MAX":
      return "flex-end";
    case "STRETCH":
      return "stretch";
    default:
      return "flex-start";
  }
}

function flexContainerAutoSize(node: SceneNode): React.CSSProperties {
  const out: React.CSSProperties = {};
  if (node.layoutMode !== "HORIZONTAL" && node.layoutMode !== "VERTICAL") return out;
  if (node.layoutMode === "HORIZONTAL") {
    if (node.primaryAxisSizingMode === "AUTO") out.width = "fit-content";
    if (node.counterAxisSizingMode === "AUTO") out.height = "fit-content";
  } else {
    if (node.primaryAxisSizingMode === "AUTO") out.height = "fit-content";
    if (node.counterAxisSizingMode === "AUTO") out.width = "fit-content";
  }
  return out;
}

interface FrameNodeProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
  /** When true, parent uses flex — this frame is a flex item (relative, not absolute canvas coords). */
  parentHasLayoutMode?: boolean;
}

function FrameNodeInner({ node, isSelected, zoom, parentHasLayoutMode = false }: FrameNodeProps) {
  if (node.visible === false) return null;
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const resizeNode = useEditorStore((s) => s.resizeNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const enteredFrameId = useEditorStore((s) => s.enteredFrameId);
  const enterFrame = useEditorStore((s) => s.enterFrame);
  const exitFrame = useEditorStore((s) => s.exitFrame);
  const getNode = useEditorStore((s) => s.getNode);
  const dragOffset = useEditorStore(
    useShallow((s) => {
      const d = s.dragSession;
      if (!d || !d.ids.includes(node.id)) return null;
      return { dx: d.deltaX, dy: d.deltaY };
    })
  );

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

  const fillBackground =
    paintsToCss(node.fills) ?? (node.props?.backgroundColor as string | undefined);
  const effectShadow = effectsToBoxShadow(node.effects);
  const propsShadow = node.props?.boxShadow as string | undefined;
  const effectBlur = effectsToFilter(node.effects);
  const mergedShadow = [effectShadow, propsShadow].filter(Boolean).join(", ") || undefined;
  const mergedFilter = effectBlur || undefined;

  const isFlexLayout = node.layoutMode === "VERTICAL" || node.layoutMode === "HORIZONTAL";
  const parentNode = node.parentId ? getNode(node.parentId) : undefined;
  const parentIsAutoLayout =
    parentHasLayoutMode ||
    parentNode?.layoutMode === "HORIZONTAL" ||
    parentNode?.layoutMode === "VERTICAL";

  const positionStyle: React.CSSProperties = parentIsAutoLayout
    ? {
        position: "relative",
        flexShrink: node.layoutGrow === 1 ? 0 : 1,
        flexGrow: node.layoutGrow ?? 0,
        alignSelf: node.layoutAlign === "STRETCH" ? "stretch" : "auto",
        minWidth: node.minWidth ?? undefined,
        maxWidth: node.maxWidth ?? undefined,
        minHeight: node.minHeight ?? undefined,
        maxHeight: node.maxHeight ?? undefined,
        ...(parentNode?.layoutMode === "HORIZONTAL" && node.primaryAxisSizingMode === "AUTO"
          ? { width: "fit-content" as const }
          : {}),
        ...(parentNode?.layoutMode === "VERTICAL" && node.primaryAxisSizingMode === "AUTO"
          ? { height: "fit-content" as const }
          : {}),
      }
    : {
        position: "absolute",
        left: node.x,
        top: node.y,
      };

  const frameOuterBox: React.CSSProperties = {
    ...positionStyle,
    width: node.width,
    height: node.height,
    ...(isFlexLayout ? flexContainerAutoSize(node) : {}),
  };
  const dragT = mergeDragTransform(undefined, dragOffset);
  if (dragT) Object.assign(frameOuterBox, dragT);

  const innerLayoutStyle: React.CSSProperties = isFlexLayout
    ? {
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 1,
        display: "flex",
        flexDirection: node.layoutMode === "VERTICAL" ? "column" : "row",
        flexWrap: node.layoutWrap === "WRAP" ? "wrap" : "nowrap",
        gap: node.itemSpacing ?? 0,
        justifyContent: mapPrimaryAxisAlign(node.primaryAxisAlignItems),
        alignItems: mapCounterAxisAlign(node.counterAxisAlignItems),
      }
    : { position: "relative", width: "100%", height: "100%", minHeight: 1 };

  return (
    <div
      className={`frame-node ${isSelected ? "selected" : ""}`}
      style={{
        ...frameOuterBox,
        border:
          isSelected && !isFrameEntered
            ? "none"
            : customBorder ?? "1px solid rgba(255,255,255,0.06)",
        borderRadius: (node.props?.borderRadius as number) ?? 6,
        background:
          (fillBackground != null && fillBackground !== ""
            ? fillBackground
            : (node.props?.backgroundColor as string) ?? "rgba(30,30,34,0.95)"),
        ...(mergedShadow ? { boxShadow: mergedShadow } : {}),
        ...(mergedFilter ? { filter: mergedFilter } : {}),
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
        const st0 = useEditorStore.getState();
        const sel = st0.selectedIds;
        const dragIds = sel.has(node.id) && sel.size > 0 ? [...sel] : [node.id];
        st0.startDragSession(dragIds);
        const onMove = (move: PointerEvent) => {
          const currentZoom = useEditorStore.getState().viewport.zoom;
          const dx = (move.clientX - last.clientX) / currentZoom;
          const dy = (move.clientY - last.clientY) / currentZoom;
          if (dx !== 0 || dy !== 0) moved = true;
          useEditorStore.getState().appendDragDelta(dx, dy);
          last.clientX = move.clientX;
          last.clientY = move.clientY;
        };
        const onUp = () => {
          target.releasePointerCapture(e.pointerId);
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          if (moved) useEditorStore.getState().commitDragSession();
          else useEditorStore.getState().cancelDragSession();
        };
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      }}
    >
      {isSelected && !isFrameEntered && <ResizeHandles onResizeStart={handleResizeStart} />}
      <div style={innerLayoutStyle}>
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
              parentHasLayoutMode={isFlexLayout}
            />
          );
        })}
      </div>
    </div>
  );
}

export const FrameNode = memo(FrameNodeInner);
