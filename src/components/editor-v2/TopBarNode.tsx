"use client";

import { useCallback, useState } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { createDefaultTopBarConfig, type TopBarConfig, type TopBarLayout } from "@/lib/editor/blocks";
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
            ...(btn.hoverColor ? { "--hover-bg": btn.hoverColor } as React.CSSProperties : {}),
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

export function TopBarNode({ node, isSelected, zoom, onOpenConfig }: TopBarNodeProps) {
  const { setSelectedIds, toggleSelection, moveNodes, resizeNode, pushHistory } = useEditorStore();
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

  const isMac = config.layout === "mac";
  const titleFirst = !isMac;

  return (
    <div
      className={styles.topbar}
      style={{
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
