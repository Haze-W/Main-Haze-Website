"use client";

import React, { useCallback } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { hexAlpha } from "@/lib/figma/types";
import type { Paint, Effect } from "@/lib/figma/types";
import { ResizeHandles } from "./ResizeHandles";

interface FigmaNodeRendererProps {
  node: SceneNode;
  isSelected: boolean;
  zoom: number;
  parentLayout?: "NONE" | "HORIZONTAL" | "VERTICAL";
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

function getBackground(
  fills: Paint[],
  fillEnabled: boolean = true
): string | undefined {
  if (!fillEnabled || !fills || fills.length === 0) return undefined;
  const fill = fills[0];
  const alpha = getFillAlpha(fill);
  if (fill.transparent === true || alpha === 0) return undefined;
  if (fill.visible === false) return undefined;
  return hexAlpha(fill.hex, alpha);
}

function getBorder(
  strokes: Paint[],
  strokeWeight: number,
  strokeEnabled: boolean = true
): string | undefined {
  if (!strokeEnabled || !strokes || strokes.length === 0 || strokeWeight === 0)
    return undefined;
  const stroke = strokes[0];
  const alpha = getFillAlpha(stroke);
  if (stroke.transparent === true || alpha === 0) return undefined;
  if (stroke.visible === false) return undefined;
  return `${strokeWeight}px solid ${hexAlpha(stroke.hex, alpha)}`;
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

export function FigmaNodeRenderer({
  node,
  isSelected,
  zoom,
  parentLayout = "NONE",
}: FigmaNodeRendererProps) {
  const { setSelectedIds, toggleSelection, moveNodes, resizeNode, pushHistory, selectedIds } =
    useEditorStore();

  const figma = node.props?._figma as FigmaProps | undefined;
  const isEllipse = !!node.props?._ellipse;
  const isText = figma?.originalType === "TEXT";
  const hasImageFill = !!node.props?._hasImageFill;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) toggleSelection(node.id);
      else setSelectedIds([node.id]);
    },
    [node.id, toggleSelection, setSelectedIds]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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
    },
    [node.id, zoom, moveNodes, pushHistory]
  );

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

  const usesFlex = parentLayout === "HORIZONTAL" || parentLayout === "VERTICAL";

  const style: React.CSSProperties = {
    position: usesFlex ? "relative" : "absolute",
    left: usesFlex ? undefined : node.x,
    top: usesFlex ? undefined : node.y,
    width: node.width,
    height: node.height,
    boxSizing: "border-box",
    cursor: "pointer",
    outline: isSelected ? "2px solid var(--accent)" : "none",
    outlineOffset: -1,
  };

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
    const solidFills = (figma.fills ?? []).filter(
      (f: Paint) => !f.type || f.type === "SOLID"
    );
    if (!hasImageFill) {
      const bg = getBackground(solidFills, fillEnabled);
      if (bg) style.backgroundColor = bg;
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

  if (isText) {
    const props = node.props ?? {};
    const textFills = props._textFills as Paint[] | undefined;
    if (textFills && textFills.length > 0) {
      const tf = textFills[0];
      const tfAlpha = getFillAlpha(tf);
      if (tf.transparent !== true && tfAlpha !== 0) {
        style.color = hexAlpha(tf.hex, tfAlpha);
      } else {
        style.color = "transparent";
      }
    } else {
      style.color = "#000000";
    }

    style.display = "flex";
    style.alignItems = "flex-start";
    style.whiteSpace = "pre-wrap";
    style.wordBreak = "break-word";

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
        onContextMenu={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
      >
        {(props.content as string) ?? ""}
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

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
        onContextMenu={(e) => e.stopPropagation()}
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
        {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  const childLayout = layout !== "NONE" ? layout : "NONE";

  return (
    <div
      style={style}
      onClick={handleClick}
      onContextMenu={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
    >
      {isSelected && <ResizeHandles onResizeStart={handleResizeStart} />}
      {node.children?.map((child) => {
        const childSelected = selectedIds.has(child.id);
        return (
          <FigmaNodeRenderer
            key={child.id}
            node={child}
            isSelected={childSelected}
            zoom={zoom}
            parentLayout={childLayout}
          />
        );
      })}
    </div>
  );
}
