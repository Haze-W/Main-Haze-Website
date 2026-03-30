"use client";

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useDroppable } from "@dnd-kit/core";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import { tryPasteFromClipboard } from "@/lib/figma/paste-listener";
import { getContextMenuShortcutLabels } from "@/lib/editor/context-menu-shortcuts";
import { screenToCanvas, clampZoom, clampPan } from "@/lib/editor/viewport";
import { SceneNodeRenderer } from "./SceneNodeRenderer";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import styles from "./Canvas.module.css";

function collectPrototypeNavigateLinks(nodes: SceneNode[]): { source: SceneNode; target: SceneNode }[] {
  const flat: SceneNode[] = [];
  function walk(ns: SceneNode[]) {
    for (const n of ns) {
      flat.push(n);
      walk(n.children ?? []);
    }
  }
  walk(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const links: { source: SceneNode; target: SceneNode }[] = [];
  for (const n of flat) {
    const ix = n.props?.interactions as Array<{ action?: string; targetId?: string }> | undefined;
    if (ix?.[0]?.action === "NAVIGATE" && ix[0].targetId) {
      const t = byId.get(ix[0].targetId);
      if (t && t.type === "FRAME") links.push({ source: n, target: t });
    }
  }
  return links;
}

function buildContextMenuItems(
  selectedIds: Set<string>,
  store: ReturnType<typeof useEditorStore.getState>
): ContextMenuItem[] {
  const sc = getContextMenuShortcutLabels();
  const ids = [...selectedIds];
  const hasSelection = ids.length > 0;
  const multiSelect = ids.length > 1;

  // Get state of first selected node for toggle labels
  const firstNode = hasSelection ? store.getNode(ids[0]) : null;
  const isHidden = firstNode?.visible === false;
  const isLocked = !!firstNode?.locked;
  const single = ids.length === 1 ? firstNode : null;
  const isMasterComponent =
    single?.type === "COMPONENT" &&
    (single.props as { isComponent?: boolean } | undefined)?.isComponent === true;
  const isComponentInstance = single?.type === "COMPONENT_INSTANCE";
  const masterId = single?.mainComponentId;

  return [
    {
      id: "copy", label: "Copy", shortcut: sc.copy, disabled: !hasSelection,
      onClick: () => {
        const nodes = ids.map((id) => store.getNode(id)).filter(Boolean);
        if (nodes.length > 0) {
          navigator.clipboard.writeText(JSON.stringify({ _renderCopy: true, nodes })).catch(() => {});
        }
      },
    },
    {
      id: "paste", label: "Paste", shortcut: sc.paste,
      onClick: async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) await tryPasteFromClipboard(text);
        } catch { /* ignore */ }
      },
    },
    {
      id: "duplicate", label: "Duplicate", shortcut: sc.duplicate, disabled: !hasSelection,
      onClick: () => store.duplicateNodes(ids),
    },
    { id: "div1", divider: true },
    {
      id: "bring-front", label: "Bring to Front", shortcut: sc.bringFront, disabled: !hasSelection,
      onClick: () => store.bringToFront(ids),
    },
    {
      id: "bring-forward", label: "Bring Forward", disabled: !hasSelection,
      onClick: () => store.bringForward(ids),
    },
    {
      id: "send-backward", label: "Send Backward", disabled: !hasSelection,
      onClick: () => store.sendBackward(ids),
    },
    {
      id: "send-back", label: "Send to Back", shortcut: sc.sendBack, disabled: !hasSelection,
      onClick: () => store.sendToBack(ids),
    },
    { id: "div2", divider: true },
    {
      id: "group", label: "Group", shortcut: sc.group, disabled: !multiSelect,
      onClick: () => store.groupNodes(ids),
    },
    {
      id: "ungroup", label: "Ungroup", shortcut: sc.ungroup, disabled: !hasSelection,
      onClick: () => store.ungroupNodes(ids),
    },
    { id: "div-comp", divider: true },
    {
      id: "create-instance",
      label: "Create Instance",
      disabled: !isMasterComponent,
      onClick: () => {
        if (single && isMasterComponent) store.createInstance(single.id);
      },
    },
    {
      id: "detach-instance",
      label: "Detach Instance",
      disabled: !isComponentInstance,
      onClick: () => {
        if (single && isComponentInstance) store.detachInstance(single.id);
      },
    },
    {
      id: "go-to-master",
      label: "Go to Master",
      disabled: !isComponentInstance || !masterId,
      onClick: () => {
        if (masterId) store.setSelectedIds([masterId]);
      },
    },
    { id: "div3", divider: true },
    {
      id: "show-hide",
      label: isHidden ? "Show" : "Hide",
      disabled: !hasSelection,
      onClick: () => {
        for (const id of ids) {
          const n = store.getNode(id);
          if (n) store.updateNode(id, { visible: n.visible === false ? true : false });
        }
        store.pushHistory();
      },
    },
    {
      id: "lock-unlock",
      label: isLocked ? "Unlock" : "Lock",
      disabled: !hasSelection,
      onClick: () => {
        for (const id of ids) {
          const n = store.getNode(id);
          if (n) store.updateNode(id, { locked: !n.locked });
        }
        store.pushHistory();
      },
    },
    { id: "div4", divider: true },
    {
      id: "flip-h", label: "Flip Horizontal", shortcut: sc.flipH, disabled: !hasSelection,
      onClick: () => {
        for (const id of ids) {
          const n = store.getNode(id);
          if (n) {
            const scaleX = (n.props?.scaleX as number) ?? 1;
            store.updateNode(id, { props: { ...(n.props ?? {}), scaleX: scaleX * -1 } });
          }
        }
        store.pushHistory();
      },
    },
    {
      id: "flip-v", label: "Flip Vertical", shortcut: sc.flipV, disabled: !hasSelection,
      onClick: () => {
        for (const id of ids) {
          const n = store.getNode(id);
          if (n) {
            const scaleY = (n.props?.scaleY as number) ?? 1;
            store.updateNode(id, { props: { ...(n.props ?? {}), scaleY: scaleY * -1 } });
          }
        }
        store.pushHistory();
      },
    },
    { id: "div5", divider: true },
    {
      id: "delete", label: "Delete", shortcut: sc.delete, disabled: !hasSelection,
      onClick: () => store.deleteNodes(ids),
    },
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
    setLastCanvasPoint,
    prototypeMode,
  } = useEditorStore(
    useShallow((s) => ({
      nodes: s.nodes,
      viewport: s.viewport,
      setViewport: s.setViewport,
      selectedIds: s.selectedIds,
      setSelectedIds: s.setSelectedIds,
      setMarquee: s.setMarquee,
      deleteNodes: s.deleteNodes,
      duplicateNodes: s.duplicateNodes,
      tool: s.tool,
      isPanning: s.isPanning,
      isSpacePressed: s.isSpacePressed,
      setSpacePressed: s.setSpacePressed,
      setIsPanning: s.setIsPanning,
      isMarqueeSelecting: s.isMarqueeSelecting,
      marqueeRect: s.marqueeRect,
      isCreatingFrame: s.isCreatingFrame,
      createFrameStart: s.createFrameStart,
      finishCreateFrame: s.finishCreateFrame,
      cancelCreateFrame: s.cancelCreateFrame,
      findNodesInRect: s.findNodesInRect,
      setTool: s.setTool,
      canvasBg: s.canvasBg,
      showGrid: s.showGrid,
      gridType: s.gridType,
      setLastCanvasPoint: s.setLastCanvasPoint,
      prototypeMode: s.prototypeMode,
    }))
  );

  const prototypeLinks = useMemo(
    () => collectPrototypeNavigateLinks(nodes),
    [nodes]
  );

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
        if (ids.length === 0) {
          useEditorStore.getState().exitFrame();
        }
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

  // Scroll = pan. Shift+scroll = zoom.
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!containerRect) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.shiftKey) {
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
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInputFocused()) {
        e.preventDefault();
        setSpacePressed(true);
        setTool("HAND");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isInputFocused()) {
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
      onPointerMove={(e) => {
        handlePointerMove(e);
        if (containerRect) {
          const pt = screenToCanvas(
            e.clientX,
            e.clientY,
            containerRect,
            viewport.panX,
            viewport.panY,
            viewport.zoom
          );
          setLastCanvasPoint(pt);
        }
      }}
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
      onContextMenuCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
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

      <div className={styles.zoomTooltip} title="Shift + scroll to zoom">
        <span className={styles.zoomTooltipValue}>{Math.round(viewport.zoom * 100)}%</span>
        <span className={styles.zoomTooltipHint}>Shift + scroll</span>
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
          items={buildContextMenuItems(selectedIds, useEditorStore.getState())}
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

      {prototypeMode && prototypeLinks.length > 0 && (
        <svg
          aria-hidden
          style={{
            position: "absolute",
            zIndex: 9999,
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <defs>
            <marker
              id="haze-prototype-arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#7B61FF" />
            </marker>
          </defs>
          {prototypeLinks.map((link, i) => {
            const { source, target } = link;
            const sx = viewport.panX + (source.x + source.width) * viewport.zoom;
            const sy = viewport.panY + (source.y + source.height / 2) * viewport.zoom;
            const ex = viewport.panX + target.x * viewport.zoom;
            const ey = viewport.panY + (target.y + target.height / 2) * viewport.zoom;
            const midx = (sx + ex) / 2;
            const midy = (sy + ey) / 2;
            const qx = midx + (ey - sy) * 0.2;
            const qy = midy - (ex - sx) * 0.2;
            const pathD = `M ${sx} ${sy} Q ${qx} ${qy} ${ex} ${ey}`;
            return (
              <g key={`${source.id}-${target.id}-${i}`}>
                <circle cx={sx} cy={sy} r={6} fill="#7B61FF" />
                <path
                  d={pathD}
                  stroke="#7B61FF"
                  strokeWidth={2}
                  fill="none"
                  markerEnd="url(#haze-prototype-arrowhead)"
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
