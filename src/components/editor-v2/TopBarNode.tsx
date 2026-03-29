"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { useShallow } from "zustand/react/shallow";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { mergeDragTransform } from "@/lib/editor/drag-transform";
import { createDefaultTopBarConfig, type TopBarConfig, type TopBarLayout } from "@/lib/editor/blocks";
import { DEFAULT_CHROME_BAR_BG, defaultTitleColorForChromeBar } from "@/lib/editor/window-chrome";
import { ResizeHandles } from "./ResizeHandles";
import styles from "./TopBarNode.module.css";

interface TopBarNodeProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
  onOpenConfig?: () => void;
}

function getConfig(node: SceneNode): TopBarConfig {
  const stored = node.props?._topBarConfig as TopBarConfig | undefined;
  if (stored) return stored;
  const layout = (node.props?._topBarLayout as TopBarLayout) ?? "windows";
  return createDefaultTopBarConfig(layout);
}

function findTitleText(node: SceneNode): SceneNode | undefined {
  return (
    node.children?.find((c) => c.type === "TEXT" && c.name === "Window Title") ??
    node.children?.find((c) => c.type === "TEXT")
  );
}

function MinimizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 5h6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function MaximizeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function MacCloseIcon() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
      <path d="M0.5 0.5l5 5M5.5 0.5l-5 5" stroke="#4d0000" strokeWidth="1.2" />
    </svg>
  );
}

function MacMinimizeIcon() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
      <path d="M0.5 3h5" stroke="#995700" strokeWidth="1.2" />
    </svg>
  );
}

function MacMaximizeIcon() {
  return (
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
      <path d="M0.8 3.8L2.5 5.5 5.2 0.5" stroke="#006500" strokeWidth="1.1" />
    </svg>
  );
}

function WindowsControls({ config }: { config: TopBarConfig }) {
  const buttons = config.buttons;
  return (
    <div className={styles.controls}>
      {buttons.map((btn) => (
        <button
          key={btn.id}
          type="button"
          className={`${styles.controlBtn} ${btn.type === "close" ? styles.closeBtn : ""}`}
          style={{
            color: config.textColor,
            ...(btn.hoverColor ? ({ "--hover-bg": btn.hoverColor } as React.CSSProperties) : {}),
          }}
          title={btn.type === "minimize" ? "Minimize" : btn.type === "maximize" ? "Maximize" : "Close"}
          onClick={(e) => e.stopPropagation()}
        >
          {btn.type === "minimize" && <MinimizeIcon className={styles.controlIcon} />}
          {btn.type === "maximize" && <MaximizeIcon className={styles.controlIcon} />}
          {btn.type === "close" && <CloseIcon className={styles.controlIcon} />}
        </button>
      ))}
    </div>
  );
}

function MacControls() {
  return (
    <div className={styles.macControls}>
      <button type="button" className={`${styles.macBtn} ${styles.macClose}`} title="Close" onClick={(e) => e.stopPropagation()}>
        <MacCloseIcon />
      </button>
      <button type="button" className={`${styles.macBtn} ${styles.macMinimize}`} title="Minimize" onClick={(e) => e.stopPropagation()}>
        <MacMinimizeIcon />
      </button>
      <button type="button" className={`${styles.macBtn} ${styles.macMaximize}`} title="Maximize" onClick={(e) => e.stopPropagation()}>
        <MacMaximizeIcon />
      </button>
    </div>
  );
}

/** Design-mode window chrome (new frames + AI import). */
function SystemChromeTopBar({
  node,
  isSelected,
  dragOffset,
  handleClick,
  handleResizeStart,
  handlePointerDown,
}: {
  node: SceneNode;
  isSelected: boolean;
  dragOffset: { dx: number; dy: number } | null;
  handleClick: (e: React.MouseEvent) => void;
  handleResizeStart: (handle: string) => (e: React.PointerEvent) => void;
  handlePointerDown: (e: React.PointerEvent) => void;
}) {
  const variant = node.props?.style === "windows" ? "windows" : "macos";
  const bg = (node.props?.backgroundColor as string) ?? DEFAULT_CHROME_BAR_BG;
  const showTitle = node.props?.showTitle !== false;
  const showControls = node.props?.showControls !== false;
  const titleChild = findTitleText(node);
  const title = String((titleChild?.props?.content as string) ?? "My Tauri App");
  const titleColor = defaultTitleColorForChromeBar(bg, titleChild?.props?.color as string | undefined);
  const titleSize = (titleChild?.props?.fontSize as number) ?? 13;
  const titleWeight = (titleChild?.props?.fontWeight as string) ?? "500";

  const topBarStyle: CSSProperties = {
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    background: bg,
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: isSelected ? 0 : 2,
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: -1,
  };
  const dragT = mergeDragTransform(undefined, dragOffset);
  if (dragT) Object.assign(topBarStyle, dragT);

  return (
    <div
      className={`${styles.topbar} ${styles.chromeTopbar}`}
      style={topBarStyle}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}

      {variant === "macos" && showControls && (
        <div className={styles.chromeMacDots} aria-hidden>
          <span className={styles.chromeDot} style={{ background: "#ef4444" }} />
          <span className={styles.chromeDot} style={{ background: "#f59e0b" }} />
          <span className={styles.chromeDot} style={{ background: "#22c55e" }} />
        </div>
      )}

      {showTitle && (
        <div
          className={variant === "macos" ? styles.chromeTitleMac : styles.chromeTitleWin}
          style={{
            fontSize: titleSize,
            fontWeight: titleWeight,
            color: titleColor,
          }}
        >
          {title}
        </div>
      )}

      {variant === "windows" && showControls && (
        <div className={styles.chromeWinBtns} aria-hidden>
          <span className={styles.chromeWinGlyph}>─</span>
          <span className={styles.chromeWinGlyph}>□</span>
          <span className={styles.chromeWinGlyph}>✕</span>
        </div>
      )}
    </div>
  );
}

export function TopBarNode({ node, isSelected, zoom, onOpenConfig }: TopBarNodeProps) {
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const resizeNode = useEditorStore((s) => s.resizeNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const dragOffset = useEditorStore(
    useShallow((s) => {
      const d = s.dragSession;
      if (!d || !d.ids.includes(node.id)) return null;
      return { dx: d.deltaX, dy: d.deltaY };
    })
  );
  const config = getConfig(node);
  const [lastClick, setLastClick] = useState(0);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastClick < 350 && onOpenConfig) {
        onOpenConfig();
      }
      setLastClick(now);
      if (e.shiftKey) toggleSelection(node.id);
      else setSelectedIds([node.id]);
    },
    [node.id, toggleSelection, setSelectedIds, lastClick, onOpenConfig]
  );

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const st0 = useEditorStore.getState();
      const sel = st0.selectedIds;
      const dragIds = sel.has(node.id) && sel.size > 0 ? [...sel] : [node.id];
      st0.startDragSession(dragIds);
      const last = { clientX: e.clientX, clientY: e.clientY };
      let moved = false;
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
    },
    [node.id]
  );

  if (node.props?.isTopBar === true) {
    return (
      <SystemChromeTopBar
        node={node}
        isSelected={isSelected}
        dragOffset={dragOffset}
        handleClick={handleClick}
        handleResizeStart={handleResizeStart}
        handlePointerDown={handlePointerDown}
      />
    );
  }

  const isMac = config.layout === "mac";
  const titleFirst = !isMac;

  const topBarStyle: CSSProperties = {
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    background: config.backgroundColor,
    color: config.textColor,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    fontFamily: config.fontFamily,
    borderBottom: config.borderBottom ? `1px solid ${config.borderColor}` : "none",
    borderRadius: isSelected ? 0 : 2,
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: -1,
    paddingLeft: isMac ? 0 : config.paddingX,
    paddingRight: isMac ? config.paddingX : 0,
  };
  const dragT = mergeDragTransform(undefined, dragOffset);
  if (dragT) Object.assign(topBarStyle, dragT);

  return (
    <div
      className={styles.topbar}
      style={topBarStyle}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      <span className={styles.badge}>Top Bar</span>

      {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}

      {isMac && <MacControls />}

      <div
        className={styles.titleArea}
        style={{
          justifyContent:
            config.titleAlign === "center" ? "center" :
            config.titleAlign === "right" ? "flex-end" : "flex-start",
        }}
      >
        {config.showIcon && titleFirst && (
          config.iconSrc ? (
            <img src={config.iconSrc} alt="" className={styles.appIcon} />
          ) : (
            <div className={styles.appIconFallback}>
              <span>{config.title.charAt(0).toUpperCase()}</span>
            </div>
          )
        )}
        <span className={styles.titleText}>{config.title}</span>
      </div>

      {!isMac && <WindowsControls config={config} />}
    </div>
  );
}
