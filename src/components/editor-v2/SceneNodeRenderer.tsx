"use client";

import dynamic from "next/dynamic";
import type { SceneNode } from "@/lib/editor/types";
import { getValidIconName } from "@/lib/icon-valid";
import { useEditorStore } from "@/lib/editor/store";
import { FrameNode } from "./FrameNode";
import { FigmaNodeRenderer } from "./FigmaNodeRenderer";
import styles from "./SceneNodeRenderer.module.css";

const DynamicIcon = dynamic(
  () => import("lucide-react/dynamic").then((m) => m.DynamicIcon),
  { ssr: false }
);

interface SceneNodeRendererProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
}

export function SceneNodeRenderer({ node, isSelected, zoom }: SceneNodeRendererProps) {
  if (node.props?._figma) {
    return <FigmaNodeRenderer node={node} isSelected={isSelected} zoom={zoom} />;
  }
  if (node.type === "FRAME") {
    return <FrameNode node={node} isSelected={isSelected} zoom={zoom} />;
  }
  return <GenericNode node={node} isSelected={isSelected} zoom={zoom} />;
}

function GenericNode({ node, isSelected, zoom }: SceneNodeRendererProps) {
  const { setSelectedIds, toggleSelection, moveNodes, pushHistory } = useEditorStore();
  const props = node.props ?? {};
  const name = node.name;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) toggleSelection(node.id);
    else setSelectedIds([node.id]);
  };

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    boxSizing: "border-box",
    cursor: "pointer",
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: -1,
    overflow: "hidden",
  };

  // ICON - render actual Lucide icon
  if (node.type === "ICON") {
    const iconName = getValidIconName(props.iconName as string | undefined);
    const size = Math.min((props.size as number) ?? 24, node.width, node.height) - 4;
    const color = (props.color as string) || "currentColor";
    return (
      <div
        className={styles.iconNode}
        style={{
          ...baseStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        <DynamicIcon
          name={iconName as never}
          size={size}
          strokeWidth={1.5}
          style={{ color }}
        />
      </div>
    );
  }

  // BUTTON - styled by variant
  if (node.type === "BUTTON") {
    const variant = (props.variant as string) ?? "primary";
    const label = (props.label as string) ?? (variant === "icon" ? "" : "Button");
    const btnColor = (props.color as string) || undefined;
    const btnBg = (props.backgroundColor as string) || undefined;
    const btnStyle = { ...baseStyle, ...(btnColor && { color: btnColor }), ...(btnBg && { backgroundColor: btnBg }) };
    const btnClass = [
      styles.button,
      variant === "primary" && styles.btnPrimary,
      variant === "secondary" && styles.btnSecondary,
      variant === "outline" && styles.btnOutline,
      variant === "ghost" && styles.btnGhost,
      variant === "danger" && styles.btnDanger,
      variant === "icon" && styles.btnIcon,
    ].filter(Boolean).join(" ");
    return (
      <div
        className={btnClass}
        style={btnStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        {variant === "icon" && (props.iconName as string) ? (
          <DynamicIcon name={getValidIconName(props.iconName as string) as never} size={20} strokeWidth={2} />
        ) : (
          label
        )}
      </div>
    );
  }

  // INPUT / TEXTAREA
  if (node.type === "INPUT") {
    const multiline = (props.multiline as boolean) ?? false;
    const ph = (props.placeholder as string) ?? "Input";
    return (
      <div
        className={styles.inputNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        {multiline ? (
          <div className={styles.textareaPlaceholder}>{ph}</div>
        ) : (
          <div className={styles.inputPlaceholder}>{ph}</div>
        )}
      </div>
    );
  }

  // CHECKBOX
  if (node.type === "CHECKBOX") {
    const isSwitch = (props.switch as boolean) ?? false;
    const checked = (props.checked as boolean) ?? false;
    const label = (props.label as string) ?? "";
    if (isSwitch) {
      return (
        <div
          className={styles.switchNode}
          style={baseStyle}
          onClick={handleClick}
          onContextMenu={(e) => e.stopPropagation()}
          onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
        >
          <div className={`${styles.switchTrack} ${checked ? styles.switchOn : ""}`}>
            <div className={styles.switchThumb} />
          </div>
        </div>
      );
    }
    return (
      <div
        className={styles.checkboxNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        <div className={`${styles.checkboxBox} ${checked ? styles.checked : ""}`}>
          {checked && "✓"}
        </div>
        {label && <span>{label}</span>}
      </div>
    );
  }

  // SELECT
  if (node.type === "SELECT") {
    const ph = (props.placeholder as string) ?? "Select...";
    return (
      <div
        className={styles.selectNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        <span>{ph}</span>
        <span className={styles.selectArrow}>▼</span>
      </div>
    );
  }

  // IMAGE
  if (node.type === "IMAGE") {
    const src = (props.src as string) ?? "";
    const rounded = (props.rounded as boolean) ?? false;
    return (
      <div
        className={`${styles.imageNode} ${rounded ? styles.rounded : ""}`}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        {src ? (
          <img src={src} alt={(props.alt as string) ?? ""} />
        ) : (
          <div className={styles.imagePlaceholder}>🖼</div>
        )}
      </div>
    );
  }

  // DIVIDER
  if (node.type === "DIVIDER") {
    return (
      <div
        className={styles.dividerNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      />
    );
  }

  // SPACER
  if (node.type === "SPACER") {
    return (
      <div
        className={styles.spacerNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      />
    );
  }

  // PROGRESS BAR
  if (name === "Progress Bar" || name === "Progress") {
    const value = (props.value as number) ?? 60;
    return (
      <div
        className={styles.progressNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${value}%` }} />
        </div>
      </div>
    );
  }

  // BADGE / TAG
  if (name === "Badge" || name === "Tag") {
    const content = (props.content as string) ?? (name === "Badge" ? "New" : "Tag");
    const bg = (props.backgroundColor as string) || undefined;
    const fg = (props.color as string) || undefined;
    return (
      <div
        className={styles.badgeNode}
        style={{ ...baseStyle, ...(bg && { backgroundColor: bg }), ...(fg && { color: fg }) }}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        {content}
      </div>
    );
  }

  // ALERT
  if (name === "Alert") {
    const content = (props.content as string) ?? "Alert message";
    const variant = (props.variant as string) ?? "info";
    const variantClass =
      variant === "success" ? styles.alertSuccess :
      variant === "warning" ? styles.alertWarning :
      variant === "error" ? styles.alertError : styles.alertInfo;
    return (
      <div
        className={`${styles.alertNode} ${variantClass}`}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        {content}
      </div>
    );
  }

  // SPINNER
  if (name === "Spinner") {
    return (
      <div
        className={styles.spinnerNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        <div className={styles.spinner} />
      </div>
    );
  }

  // SKELETON
  if (name === "Skeleton") {
    return (
      <div
        className={styles.skeletonNode}
        style={baseStyle}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      />
    );
  }

  // TEXT / HEADING / PARAGRAPH / LABEL
  if (node.type === "TEXT") {
    const content = (props.content as string) ?? "Text";
    const fontSize = (props.fontSize as number) ?? 14;
    const fontWeight = (props.fontWeight as string) ?? "normal";
    const textAlign = (props.textAlign as string) ?? "left";
    const color = (props.color as string) || undefined;
    return (
      <div
        className={styles.textNode}
        style={{
          ...baseStyle,
          fontSize,
          fontWeight,
          textAlign: textAlign as React.CSSProperties["textAlign"],
          ...(color && { color }),
        }}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      >
        {content}
      </div>
    );
  }

  // RECTANGLE
  if (node.type === "RECTANGLE") {
    const bg = (props.backgroundColor as string) || undefined;
    const borderColor = (props.borderColor as string) || undefined;
    return (
      <div
        className={styles.rectNode}
        style={{
          ...baseStyle,
          ...(bg && { background: bg }),
          ...(borderColor && { borderColor: borderColor, borderStyle: "solid" }),
        }}
        onClick={handleClick}
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
      />
    );
  }

  // CONTAINER / PANEL / LIST / default
  return (
    <div
      className={styles.genericNode}
      style={baseStyle}
      onClick={handleClick}
      onContextMenu={(e) => e.stopPropagation()}
      onPointerDown={createDragHandler(node.id, zoom, moveNodes, pushHistory)}
    />
  );
}

function createDragHandler(
  nodeId: string,
  zoom: number,
  moveNodes: (ids: string[], dx: number, dy: number) => void,
  pushHistory: () => void
) {
  return (e: React.PointerEvent) => {
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
      moveNodes([nodeId], dx, dy);
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
  };
}
