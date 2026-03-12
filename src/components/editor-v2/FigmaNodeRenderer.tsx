"use client";

import React, { useCallback } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { hexAlpha } from "@/lib/figma/types";
import type { Paint, Effect, TextSegment } from "@/lib/figma/types";
import { ResizeHandles } from "./ResizeHandles";

interface FigmaNodeRendererProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
  parentLayout?: "NONE" | "HORIZONTAL" | "VERTICAL";
  /** When true, this is a child inside a Figma frame — no independent selection/dragging */
  isChild?: boolean;
}

interface FigmaProps {
  originalType: string;
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  strokeAlign: string;
  effects: Effect[];
  cornerRadius: number | null;
  topLeftRadius: number | null;
  topRightRadius: number | null;
  bottomLeftRadius: number | null;
  bottomRightRadius: number | null;
  blendMode: string;
  clipsContent: boolean;
  overflowDirection?: string;
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  textHasNoBackgroundFill?: boolean;
}

function getBorderRadius(f: FigmaProps, isEllipse: boolean): string | undefined {
  if (isEllipse) return "50%";
  const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius, cornerRadius } = f;
  if (
    topLeftRadius != null ||
    topRightRadius != null ||
    bottomRightRadius != null ||
    bottomLeftRadius != null
  ) {
    const tl = topLeftRadius ?? 0;
    const tr = topRightRadius ?? 0;
    const br = bottomRightRadius ?? 0;
    const bl = bottomLeftRadius ?? 0;
    if (tl === 0 && tr === 0 && br === 0 && bl === 0) return undefined;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  if (cornerRadius != null && cornerRadius > 0) return `${cornerRadius}px`;
  return undefined;
}

function getFillAlpha(fill: Paint): number {
  if (fill.alpha != null) return fill.alpha;
  if (fill.opacity != null) return fill.opacity;
  return 1;
}

function isFillVisible(fill: Paint): boolean {
  if (fill.transparent === true) return false;
  if (fill.visible === false) return false;
  if (getFillAlpha(fill) === 0) return false;
  return true;
}

function getBackground(
  fills: Paint[],
  fillEnabled: boolean,
  isTextNode: boolean
): string | undefined {
  if (isTextNode) return undefined;
  if (!fillEnabled || !fills || fills.length === 0) return undefined;

  for (const fill of fills) {
    if (!isFillVisible(fill)) continue;
    if (!fill.type || fill.type === "SOLID") {
      return hexAlpha(fill.hex, getFillAlpha(fill));
    }
    if (fill.type === "GRADIENT_LINEAR" && fill.stops && fill.stops.length >= 2) {
      const stops = fill.stops
        .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
        .join(", ");
      return `linear-gradient(${stops})`;
    }
  }
  return undefined;
}

function getBorder(
  strokes: Paint[],
  strokeWeight: number,
  strokeEnabled: boolean
): string | undefined {
  if (!strokeEnabled || !strokes || strokes.length === 0 || strokeWeight === 0)
    return undefined;
  const stroke = strokes[0];
  if (!isFillVisible(stroke)) return undefined;
  return `${strokeWeight}px solid ${hexAlpha(stroke.hex, getFillAlpha(stroke))}`;
}

function getBoxShadow(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const shadows = effects
    .filter((e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
    .map((e) => {
      const x = e.x ?? 0;
      const y = e.y ?? 0;
      const blur = e.blur ?? 0;
      const spread = e.spread ?? 0;
      const color =
        e.color && e.alpha != null
          ? hexAlpha(e.color, e.alpha)
          : `rgba(0,0,0,0.25)`;
      const inset = e.type === "INNER_SHADOW" ? "inset " : "";
      return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
    });
  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

function getFilter(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const blurs = effects.filter((e) => e.type === "LAYER_BLUR");
  if (blurs.length === 0) return undefined;
  return blurs.map((e) => `blur(${e.blur ?? 0}px)`).join(" ");
}

function mapAlign(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  switch (val) {
    case "MIN": return "flex-start";
    case "MAX": return "flex-end";
    case "CENTER": return "center";
    case "SPACE_BETWEEN": return "space-between";
    default: return undefined;
  }
}

/** Get text color from segment fills, falling back to white */
function getTextColor(props: Record<string, unknown>): string {
  const textFills = props._textFills as Paint[] | undefined;
  if (textFills && textFills.length > 0) {
    const tf = textFills[0];
    if (isFillVisible(tf)) {
      return hexAlpha(tf.hex, getFillAlpha(tf));
    }
    return "transparent";
  }
  return "#ffffff";
}

/** Render multi-segment text with per-segment styling */
function renderTextContent(props: Record<string, unknown>): React.ReactNode {
  const segments = props._textSegments as TextSegment[] | undefined;
  const content = (props.content as string) ?? "";

  if (!segments || segments.length <= 1) {
    return content;
  }

  return segments.map((seg, i) => {
    const segStyle: React.CSSProperties = {};

    if (seg.fontFamily) segStyle.fontFamily = `"${seg.fontFamily}", sans-serif`;
    if (seg.fontSize) segStyle.fontSize = seg.fontSize;
    if (seg.fontWeight) segStyle.fontWeight = seg.fontWeight;
    if (seg.fontStyle?.toLowerCase() === "italic") segStyle.fontStyle = "italic";
    if (seg.textDecoration) {
      const dec = seg.textDecoration.toLowerCase();
      if (dec !== "none") segStyle.textDecoration = dec;
    }
    if (seg.letterSpacing != null && seg.letterSpacing !== 0) {
      segStyle.letterSpacing = seg.letterSpacing;
    }

    if (seg.fills && seg.fills.length > 0) {
      const sf = seg.fills[0];
      if (isFillVisible(sf)) {
        segStyle.color = hexAlpha(sf.hex, getFillAlpha(sf));
      } else {
        segStyle.color = "transparent";
      }
    }

    return (
      <span key={i} style={segStyle}>{seg.characters}</span>
    );
  });
}

export function FigmaNodeRenderer({
  node,
  isSelected,
  zoom,
  parentLayout = "NONE",
  isChild = false,
}: FigmaNodeRendererProps) {
  const { setSelectedIds, toggleSelection, moveNodes, resizeNode, pushHistory, selectedIds } =
    useEditorStore();

  const figma = node.props?._figma as FigmaProps | undefined;
  const isEllipse = !!node.props?._ellipse;
  const isText = figma?.originalType === "TEXT";
  const hasImageFill = !!node.props?._hasImageFill;
  const isTextNode = isText || figma?.textHasNoBackgroundFill === true;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isChild) return;
      e.stopPropagation();
      if (e.shiftKey) toggleSelection(node.id);
      else setSelectedIds([node.id]);
    },
    [node.id, toggleSelection, setSelectedIds, isChild]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isChild) return;
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
    },
    [node.id, zoom, moveNodes, pushHistory, isChild]
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

  const usesFlex = parentLayout === "HORIZONTAL" || parentLayout === "VERTICAL";

  const style: React.CSSProperties = {
    position: usesFlex ? "relative" : "absolute",
    left: usesFlex ? undefined : node.x,
    top: usesFlex ? undefined : node.y,
    width: node.width,
    height: node.height,
    boxSizing: "border-box",
    cursor: isChild ? "default" : "pointer",
  };

  // Only show selection outline on root (non-child) nodes
  if (!isChild && isSelected) {
    style.outline = "2px solid var(--accent)";
    style.outlineOffset = -1;
  }

  if (node.visible === false) {
    style.display = "none";
  }

  if (node.opacity != null && node.opacity < 1) {
    style.opacity = node.opacity;
  }

  if (node.rotation) {
    style.transform = `rotate(${node.rotation}deg)`;
  }

  if (figma) {
    const fillEnabled = figma.fillEnabled !== false;

    // Only render background if NOT a text node
    if (!hasImageFill && !isTextNode) {
      const bg = getBackground(figma.fills ?? [], fillEnabled, false);
      if (bg) {
        if (bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient")) {
          style.background = bg;
        } else {
          style.backgroundColor = bg;
        }
      }
    }

    const strokeEnabled = figma.strokeEnabled !== false;
    const border = getBorder(figma.strokes, figma.strokeWeight, strokeEnabled);
    if (border) style.border = border;

    const br = getBorderRadius(figma, isEllipse);
    if (br) style.borderRadius = br;

    const shadow = getBoxShadow(figma.effects);
    if (shadow) style.boxShadow = shadow;

    const filter = getFilter(figma.effects);
    if (filter) style.filter = filter;

    if (node.overflow === "HIDDEN") style.overflow = "hidden";
    else if (node.overflow === "SCROLL") style.overflow = "auto";
    else if (figma.clipsContent) style.overflow = "hidden";
  }

  const layout = node.layoutMode ?? "NONE";
  if (layout === "HORIZONTAL" || layout === "VERTICAL") {
    style.display = "flex";
    style.flexDirection = layout === "HORIZONTAL" ? "row" : "column";
    if (node.itemSpacing) style.gap = node.itemSpacing;
    if (node.paddingTop) style.paddingTop = node.paddingTop;
    if (node.paddingRight) style.paddingRight = node.paddingRight;
    if (node.paddingBottom) style.paddingBottom = node.paddingBottom;
    if (node.paddingLeft) style.paddingLeft = node.paddingLeft;
    const justify = mapAlign(node.primaryAxisAlignItems);
    if (justify) style.justifyContent = justify;
    const alignItems = mapAlign(node.counterAxisAlignItems);
    if (alignItems) style.alignItems = alignItems;
  }

  // ── TEXT NODE ──────────────────────────────────────────────────
  if (isText) {
    const props = node.props ?? {};

    // Text color from segments or text fills
    style.color = getTextColor(props);

    style.display = "flex";
    style.alignItems = "flex-start";
    style.whiteSpace = "pre-wrap";
    style.wordBreak = "break-word";

    // No background for text nodes
    style.backgroundColor = undefined;
    style.background = undefined;

    const noOverflow = props._textNoOverflow === true;
    const truncation = props._textTruncation as string | undefined;
    if (noOverflow || truncation === "DISABLED") {
      style.overflow = "visible";
    } else {
      style.overflow = "hidden";
      if (truncation === "ENDING") {
        style.textOverflow = "ellipsis";
      }
    }

    const maxLines = props._textMaxLines as number | null | undefined;
    if (maxLines != null && maxLines > 0 && !noOverflow && truncation !== "DISABLED") {
      style.WebkitLineClamp = maxLines;
      style.display = "-webkit-box";
      style.WebkitBoxOrient = "vertical";
    }

    // WIDTH_AND_HEIGHT means auto-sized text box — don't constrain
    const autoResize = props._textAutoResize as string | undefined;
    if (autoResize === "WIDTH_AND_HEIGHT") {
      style.width = undefined;
      style.height = undefined;
      style.minWidth = node.width;
    }

    if (props.fontFamily) style.fontFamily = `"${props.fontFamily as string}", sans-serif`;
    if (props.fontSize) style.fontSize = props.fontSize as number;
    if (props.fontWeight) {
      const fw = props.fontWeight as string;
      style.fontWeight = /^\d+$/.test(fw) ? Number(fw) : fw;
    }
    if (props.textAlign) style.textAlign = props.textAlign as React.CSSProperties["textAlign"];
    if (props.letterSpacing != null && (props.letterSpacing as number) !== 0) {
      style.letterSpacing = props.letterSpacing as number;
    }
    if (props.textDecoration) {
      const dec = (props.textDecoration as string).toLowerCase();
      if (dec !== "none") style.textDecoration = dec;
    }
    if (props.fontStyle) {
      const fs = (props.fontStyle as string).toLowerCase();
      if (fs === "italic") style.fontStyle = "italic";
    }

    const lh = props.lineHeight;
    if (lh != null && lh !== "auto") {
      style.lineHeight = typeof lh === "number" ? `${lh}px` : (lh as string);
    }

    return (
      <div
        style={style}
        onClick={handleClick}
        onContextMenu={(e) => { if (!isChild) e.stopPropagation(); }}
        onPointerDown={handlePointerDown}
      >
        {renderTextContent(props)}
        {!isChild && isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── IMAGE NODE ────────────────────────────────────────────────
  if (hasImageFill) {
    const imageData = node.props?._imageData as string | undefined;
    const scaleMode = (node.props?._imageScaleMode as string) ?? "FILL";
    const objectFit =
      scaleMode === "FIT" ? "contain" :
      scaleMode === "TILE" ? "none" : "cover";

    return (
      <div
        style={{ ...style, overflow: "hidden" }}
        onClick={handleClick}
        onContextMenu={(e) => { if (!isChild) e.stopPropagation(); }}
        onPointerDown={handlePointerDown}
      >
        {imageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageData}
            alt={node.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: objectFit as React.CSSProperties["objectFit"],
              display: "block",
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(128,128,128,0.2)",
              color: "rgba(128,128,128,0.6)",
              fontSize: 12,
            }}
          >
            Image
          </div>
        )}
        {!isChild && isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── FRAME / SHAPE / GROUP ─────────────────────────────────────
  const childLayout = layout !== "NONE" ? layout : "NONE";

  return (
    <div
      style={style}
      onClick={handleClick}
      onContextMenu={(e) => { if (!isChild) e.stopPropagation(); }}
      onPointerDown={handlePointerDown}
    >
      {!isChild && isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      {node.children?.map((child) => (
        <FigmaNodeRenderer
          key={child.id}
          node={child}
          isSelected={false}
          zoom={zoom}
          parentLayout={childLayout}
          isChild={true}
        />
      ))}
    </div>
  );
}
