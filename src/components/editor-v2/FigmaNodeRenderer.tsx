"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { loadGoogleFont } from "@/lib/editor/fonts";
import { hexAlpha, paintToSolidColor } from "@/lib/figma/types";
import type { Paint, Effect, TextSegment } from "@/lib/figma/types";
import { ResizeHandles } from "./ResizeHandles";

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function resolveGradientStops(fill: Paint): Array<{ hex: string; alpha: number; position: number }> | null {
  if (fill.stops && fill.stops.length >= 2) {
    return fill.stops.filter((s) => s.hex != null).map((s) => ({ hex: s.hex!, alpha: s.alpha ?? 1, position: s.position ?? 0 }));
  }
  if (fill.gradientStops && fill.gradientStops.length >= 2) {
    return fill.gradientStops.map((gs) => ({
      hex: rgbToHex(gs.color.r, gs.color.g, gs.color.b),
      alpha: gs.color.a ?? 1,
      position: gs.position,
    }));
  }
  return null;
}

function computeGradientAngle(handles?: Array<{ x: number; y: number }>): number {
  if (!handles || handles.length < 2) return 180;
  const [start, end] = handles;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angleRad = Math.atan2(dy, dx);
  return Math.round((angleRad * 180) / Math.PI + 90);
}

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
  const c = fill.color as { a?: number } | undefined;
  if (c && typeof c.a === "number") return c.a;
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
      const solid = paintToSolidColor(fill);
      if (solid) return solid;
      if (fill.hex) return hexAlpha(fill.hex, getFillAlpha(fill));
    }
    if (fill.type === "GRADIENT_LINEAR") {
      const resolvedStops = resolveGradientStops(fill);
      if (resolvedStops && resolvedStops.length >= 2) {
        const angle = computeGradientAngle(fill.gradientHandlePositions);
        const stopsStr = resolvedStops
          .map((s) => `${hexAlpha(s.hex, s.alpha)} ${Math.round(s.position * 100)}%`)
          .join(", ");
        return `linear-gradient(${angle}deg, ${stopsStr})`;
      }
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
  const color = paintToSolidColor(stroke) ?? (stroke.hex ? hexAlpha(stroke.hex, getFillAlpha(stroke)) : undefined);
  if (!color) return undefined;
  return `${strokeWeight}px solid ${color}`;
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

/** Get text color from segment fills, falling back to black */
function getTextColor(props: Record<string, unknown>): string {
  const textFills = props._textFills as Paint[] | undefined;
  if (textFills && textFills.length > 0) {
    const tf = textFills[0];
    if (isFillVisible(tf)) {
      const color = paintToSolidColor(tf) ?? (tf.hex ? hexAlpha(tf.hex, getFillAlpha(tf)) : undefined);
      if (color) return color;
    }
    return "transparent";
  }
  return "#000000";
}

/** Render multi-segment text with per-segment styling */
function renderTextContent(props: Record<string, unknown>): React.ReactNode {
  const segments = props._textSegments as TextSegment[] | undefined;
  const content = (props.content as string) ?? "";
  const fallbackFont = props.fontFamily as string | undefined;

  if (!segments || segments.length <= 1) {
    return content;
  }

  return segments.map((seg, i) => {
    const segStyle: React.CSSProperties = {};

    const fontFamily = seg.fontFamily ?? fallbackFont;
    if (fontFamily) segStyle.fontFamily = `"${fontFamily}", sans-serif`;
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
        const color = paintToSolidColor(sf) ?? (sf.hex ? hexAlpha(sf.hex, getFillAlpha(sf)) : undefined);
        if (color) segStyle.color = color;
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
  const {
    setSelectedIds,
    toggleSelection,
    moveNodes,
    resizeNode,
    pushHistory,
    enteredFrameId,
    enterFrame,
    exitFrame,
    updateNode,
  } = useEditorStore();

  const [isEditingText, setIsEditingText] = useState(false);
  const textEditRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingText && textEditRef.current) {
      textEditRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(textEditRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditingText]);

  const VECTOR_TYPES = ["VECTOR", "STAR", "POLYGON", "LINE", "BOOLEAN_OPERATION", "ELLIPSE"];
  const figma = node.props?._figma as FigmaProps | undefined;
  const isEllipse = !!node.props?._ellipse;
  const isText = figma?.originalType === "TEXT";
  const hasImageFill = !!node.props?._hasImageFill;
  const isTextNode = isText || figma?.textHasNoBackgroundFill === true;
  const isVector = figma ? VECTOR_TYPES.includes(figma.originalType) : false;

  const isFrameEntered = enteredFrameId === node.id;
  const isInsideEnteredFrame = isChild && enteredFrameId != null;
  const isSelectableChild = isInsideEnteredFrame;
  const canDrag = !node.locked;

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

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isChild && node.children && node.children.length > 0) {
        enterFrame(node.id);
      }
    },
    [node.id, node.children, isChild, enterFrame]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
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
    },
    [node.id, moveNodes, pushHistory]
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

  const usesFlex = parentLayout === "HORIZONTAL" || parentLayout === "VERTICAL";
  const showSelection = isSelected;

  const strokeWeight = figma?.strokeWeight ?? 0;
  const hasStroke = figma?.strokeEnabled !== false && (figma?.strokes?.length ?? 0) > 0 && strokeWeight > 0;
  const isLine = figma?.originalType === "LINE";
  const minDim = hasStroke && isLine ? Math.max(1, strokeWeight) : 0;
  const effectiveWidth = minDim ? Math.max(node.width, minDim) : node.width;
  const effectiveHeight = minDim ? Math.max(node.height, minDim) : node.height;

  const style: React.CSSProperties = {
    position: usesFlex ? "relative" : "absolute",
    left: usesFlex ? undefined : node.x,
    top: usesFlex ? undefined : node.y,
    width: effectiveWidth,
    height: effectiveHeight,
    boxSizing: "border-box",
    cursor: canDrag ? "pointer" : "default",
  };

  if (showSelection) {
    style.outline = "2px solid var(--accent)";
    style.outlineOffset = -1;
  }

  if (node.visible === false) {
    style.display = "none";
  }

  if (node.opacity != null && node.opacity < 1) {
    style.opacity = node.opacity;
  }

  if (node.rotation || node.props?.scaleX !== undefined || node.props?.scaleY !== undefined) {
    const parts: string[] = [];
    if (node.rotation) parts.push(`rotate(${node.rotation}deg)`);
    if (node.props?.scaleX !== undefined) parts.push(`scaleX(${node.props.scaleX})`);
    if (node.props?.scaleY !== undefined) parts.push(`scaleY(${node.props.scaleY})`);
    if (parts.length) style.transform = parts.join(" ");
  }

  const isVectorOrImageWithData = (hasImageFill || (isVector && node.props?._imageData)) && !isText;
  if (figma) {
    const fillEnabled = figma.fillEnabled !== false;

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

    if (!isVector && !hasImageFill) {
      const strokeEnabled = figma.strokeEnabled !== false;
      const border = getBorder(figma.strokes, figma.strokeWeight, strokeEnabled);
      if (border) style.border = border;
    }

    if (!isVectorOrImageWithData) {
      const shadow = getBoxShadow(figma.effects);
      if (shadow) style.boxShadow = shadow;
    }

    const br = getBorderRadius(figma, isEllipse);
    if (br) style.borderRadius = br;

    const filter = getFilter(figma.effects);
    if (filter) style.filter = filter;

    if (node.overflow === "HIDDEN") style.overflow = "hidden";
    else if (node.overflow === "SCROLL") style.overflow = "auto";
    else if (figma.clipsContent && !isVectorOrImageWithData) style.overflow = "hidden";
    else if (isVectorOrImageWithData) style.overflow = "visible";
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

    style.color = getTextColor(props);
    style.whiteSpace = "pre-wrap";
    style.wordBreak = "break-word";
    style.margin = 0;
    style.padding = 0;

    // No background for text nodes
    style.backgroundColor = undefined;
    style.background = undefined;

    // Vertical alignment: only use flex when CENTER or BOTTOM
    const vAlign = (props._textAlignVertical as string) ?? "TOP";
    if (vAlign === "CENTER" || vAlign === "BOTTOM") {
      style.display = "flex";
      style.flexDirection = "column";
      style.justifyContent = vAlign === "CENTER" ? "center" : "flex-end";
    }

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

    const autoResize = props._textAutoResize as string | undefined;
    if (autoResize === "WIDTH_AND_HEIGHT") {
      style.width = undefined;
      style.height = undefined;
      style.minWidth = node.width;
    }

    if (props.fontFamily) {
      const font = props.fontFamily as string;
      loadGoogleFont(font);
      style.fontFamily = `"${font}", sans-serif`;
    }
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
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditingText(true);
        }}
        onPointerDown={isEditingText ? undefined : handlePointerDown}
      >
        {isEditingText ? (
          <div
            ref={textEditRef}
            contentEditable
            suppressContentEditableWarning
            style={{ outline: "none", cursor: "text", width: "100%", height: "100%", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            onBlur={(e) => {
              setIsEditingText(false);
              const text = e.currentTarget.textContent ?? "";
              updateNode(node.id, { props: { ...(node.props ?? {}), content: text } });
              pushHistory();
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") {
                setIsEditingText(false);
                (e.currentTarget as HTMLElement).blur();
              }
            }}
            dangerouslySetInnerHTML={{ __html: (props.content as string) ?? "" }}
          />
        ) : renderTextContent(props)}
        {showSelection && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── IMAGE / VECTOR NODE ───────────────────────────────────────
  if (hasImageFill || (isVector && node.props?._imageData)) {
    const imageData = node.props?._imageData as string | undefined;
    const scaleMode = (node.props?._imageScaleMode as string) ?? "FILL";
    const isSvgDataUrl = imageData?.includes("image/svg+xml");
    const objectFit: React.CSSProperties["objectFit"] =
      isSvgDataUrl ? "fill" :
      scaleMode === "FIT" ? "contain" :
      scaleMode === "TILE" ? "none" : "fill";

    const containerStyle: React.CSSProperties = {
      ...style,
      overflow: "visible",
      border: "none",
      boxShadow: "none",
    };

    return (
      <div
        style={containerStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
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
              objectFit,
              display: "block",
              pointerEvents: "none",
              stroke: "none",
              outline: "none",
              border: "none",
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
        {showSelection && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  // ── FRAME / SHAPE / GROUP ─────────────────────────────────────
  const childLayout = layout !== "NONE" ? layout : "NONE";

  // When a frame is "entered" via double-click, show a subtle dashed outline
  if (isFrameEntered) {
    style.outline = "2px dashed var(--accent)";
    style.outlineOffset = 2;
  }

  return (
    <div
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          toggleSelection(node.id);
        } else {
          if (isFrameEntered) {
            exitFrame();
          }
          setSelectedIds([node.id]);
        }
      }}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
    >
      {showSelection && <ResizeHandles onResizeStart={handleResizeStart} />}
      {node.children?.map((child) => (
        <FigmaNodeRenderer
          key={child.id}
          node={child}
          isSelected={useEditorStore.getState().selectedIds.has(child.id)}
          zoom={zoom}
          parentLayout={childLayout}
          isChild={true}
        />
      ))}
    </div>
  );
}
