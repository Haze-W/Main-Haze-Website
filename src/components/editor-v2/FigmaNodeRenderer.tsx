"use client";

import React, { useCallback, useState, useRef, useEffect, memo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { SceneNode } from "@/lib/editor/types";
import { useEditorStore } from "@/lib/editor/store";
import { mergeDragTransform } from "@/lib/editor/drag-transform";
import { loadGoogleFont } from "@/lib/editor/fonts";
import { getFillAlpha, isFillVisible } from "@/lib/figma/fill-visibility";
import {
  getBackgroundFromFills,
  getFigmaBorderSideStyles,
  maxFigmaStrokeWidthPx,
} from "@/lib/figma/gradient-css";
import { hexAlpha, paintToSolidColor, fontStyleToFontWeight } from "@/lib/figma/types";
import type { Paint, Effect } from "@/lib/figma/types";
import {
  alignFigmaTextSegmentsToContent,
  normalizeFigmaUnicodeLineBreaks,
  type TextSegmentWithRange,
} from "@/lib/figma/text-segments";
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
  strokeTopWeight?: number | null;
  strokeRightWeight?: number | null;
  strokeBottomWeight?: number | null;
  strokeLeftWeight?: number | null;
  strokeAlign: string;
  strokeCap?: string;
  strokeJoin?: string;
  strokeMiterLimit?: number;
  dashPattern?: number[];
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
  vectorDetail?: {
    vectorPaths?: Array<{ data: string; windingRule?: string }>;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeCap?: string;
    strokeJoin?: string;
    strokeMiterLimit?: number;
    dashPattern?: number[];
    pointCount?: number;
  } | null;
  transform2d?: { a: number; b: number; c: number; d: number } | null;
}

function polygonPathFromPointCount(pointCount: number, width: number, height: number): string {
  const count = Math.max(3, Math.floor(pointCount));
  const cx = Math.max(width, 1) / 2;
  const cy = Math.max(height, 1) / 2;
  const r = Math.min(cx, cy);
  const pts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    pts.push(`${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function figmaBlendModeToCss(mode: string | undefined): React.CSSProperties["mixBlendMode"] | undefined {
  if (!mode || mode === "NORMAL" || mode === "PASS_THROUGH") return undefined;
  const map: Record<string, React.CSSProperties["mixBlendMode"]> = {
    MULTIPLY: "multiply",
    SCREEN: "screen",
    OVERLAY: "overlay",
    DARKEN: "darken",
    LIGHTEN: "lighten",
    COLOR_DODGE: "color-dodge",
    COLOR_BURN: "color-burn",
    HARD_LIGHT: "hard-light",
    SOFT_LIGHT: "soft-light",
    DIFFERENCE: "difference",
    EXCLUSION: "exclusion",
    HUE: "hue",
    SATURATION: "saturation",
    COLOR: "color",
    LUMINOSITY: "luminosity",
  };
  return map[mode];
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

function getBackdropFilter(effects: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const blurs = effects.filter((e) => e.type === "BACKGROUND_BLUR");
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
    case "STRETCH": return "stretch";
    case "BASELINE": return "baseline";
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

function getFirstVisiblePaintColor(paints?: Paint[]): string | undefined {
  if (!paints || paints.length === 0) return undefined;
  for (const p of paints) {
    if (!isFillVisible(p)) continue;
    const color = paintToSolidColor(p) ?? (p.hex ? hexAlpha(p.hex, getFillAlpha(p)) : undefined);
    if (color) return color;
  }
  return undefined;
}

/** Render multi-segment text with per-segment styling */
function renderTextContent(props: Record<string, unknown>): React.ReactNode {
  const rawSegments = props._textSegments as TextSegmentWithRange[] | undefined;
  const content = normalizeFigmaUnicodeLineBreaks((props.content as string) ?? "");
  const segments =
    rawSegments && rawSegments.length > 0
      ? alignFigmaTextSegmentsToContent(content, rawSegments)
      : undefined;
  const fallbackFont = props.fontFamily as string | undefined;

  if (!segments || segments.length <= 1) {
    return content;
  }

  // One block wrapper so sibling <span>s stay inline (normal line box). Otherwise a parent with
  // display:flex; flex-direction:column (e.g. Figma vertical text align center) treats each span as
  // a flex item and stacks them vertically, blowing up height and ignoring line-height.
  const runs = segments.map((seg, i) => {
    const segStyle: React.CSSProperties = {};

    const fontFamily = seg.fontFamily ?? fallbackFont;
    if (fontFamily) segStyle.fontFamily = `"${fontFamily}", sans-serif`;
    if (seg.fontSize != null) segStyle.fontSize = seg.fontSize;
    const segW =
      seg.fontWeight ??
      fontStyleToFontWeight(seg.fontStyle);
    if (segW != null) segStyle.fontWeight = segW;
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

  return (
    <span style={{ display: "block", width: "100%", minWidth: 0 }}>
      {runs}
    </span>
  );
}

function FigmaNodeRendererInner({
  node,
  isSelected,
  zoom,
  parentLayout = "NONE",
  isChild = false,
}: FigmaNodeRendererProps) {
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const resizeNode = useEditorStore((s) => s.resizeNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const enterFrame = useEditorStore((s) => s.enterFrame);
  const exitFrame = useEditorStore((s) => s.exitFrame);
  const updateNode = useEditorStore((s) => s.updateNode);
  const enteredFrameId = useEditorStore((s) => s.enteredFrameId);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const dragOffset = useEditorStore(
    useShallow((s) => {
      const d = s.dragSession;
      if (!d || !d.ids.includes(node.id)) return null;
      return { dx: d.deltaX, dy: d.deltaY };
    })
  );

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
  const isVector =
    node.type === "VECTOR" ||
    (figma ? VECTOR_TYPES.includes(figma.originalType) : false);

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
      const st = useEditorStore.getState();
      const sel = st.selectedIds;
      const dragIds = sel.has(node.id) && sel.size > 0 ? [...sel] : [node.id];
      st.startDragSession(dragIds);
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
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
  const isAbsoluteInAutoLayout = usesFlex && isChild && node.layoutPositioning === "ABSOLUTE";
  const showSelection = isSelected;

  const strokeWeight = figma?.strokeWeight ?? 0;
  const strokePerSide = figma
    ? {
        top: figma.strokeTopWeight,
        right: figma.strokeRightWeight,
        bottom: figma.strokeBottomWeight,
        left: figma.strokeLeftWeight,
      }
    : undefined;
  const borderSideStyles =
    figma && !isTextNode
      ? getFigmaBorderSideStyles(
          figma.strokes ?? [],
          strokeWeight,
          strokePerSide,
          figma.strokeEnabled !== false
        )
      : undefined;
  const hasStroke = !!borderSideStyles;
  const isLine = figma?.originalType === "LINE";
  const lineStrokePx =
    hasStroke && isLine && figma
      ? Math.max(1, maxFigmaStrokeWidthPx(strokeWeight, strokePerSide))
      : 0;
  const minDim = lineStrokePx;
  const effectiveWidth = minDim ? Math.max(node.width, minDim) : node.width;
  const effectiveHeight = minDim ? Math.max(node.height, minDim) : node.height;

  const style: React.CSSProperties = {
    position: isAbsoluteInAutoLayout ? "absolute" : usesFlex ? "relative" : "absolute",
    left: isAbsoluteInAutoLayout ? node.x : usesFlex ? undefined : node.x,
    top: isAbsoluteInAutoLayout ? node.y : usesFlex ? undefined : node.y,
    width: effectiveWidth,
    height: effectiveHeight,
    boxSizing: "border-box",
    cursor: canDrag ? "pointer" : "default",
  };

  /** Auto-layout children: match Figma flex grow / stretch / min constraints */
  if (usesFlex && isChild && !isAbsoluteInAutoLayout) {
    style.flexShrink = node.layoutGrow === 1 ? 0 : 1;
    style.flexGrow = node.layoutGrow ?? 0;
    if (node.layoutAlign === "STRETCH") style.alignSelf = "stretch";
    if (node.minWidth != null) style.minWidth = node.minWidth;
    if (node.maxWidth != null) style.maxWidth = node.maxWidth;
    if (node.minHeight != null) style.minHeight = node.minHeight;
    if (node.maxHeight != null) style.maxHeight = node.maxHeight;
  }

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

  const t2d = figma?.transform2d;
  if (t2d || node.rotation || node.props?.scaleX !== undefined || node.props?.scaleY !== undefined) {
    const parts: string[] = [];
    if (
      t2d &&
      typeof t2d.a === "number" &&
      typeof t2d.b === "number" &&
      typeof t2d.c === "number" &&
      typeof t2d.d === "number"
    ) {
      // Keep translation at 0,0 because node.x/node.y already represent positioning.
      parts.push(`matrix(${t2d.a},${t2d.b},${t2d.c},${t2d.d},0,0)`);
    }
    // `transform2d` already encodes Figma rotation/skew/flip; avoid double-rotation.
    if (!t2d && node.rotation) parts.push(`rotate(${node.rotation}deg)`);
    if (node.props?.scaleX !== undefined) parts.push(`scaleX(${node.props.scaleX})`);
    if (node.props?.scaleY !== undefined) parts.push(`scaleY(${node.props.scaleY})`);
    if (parts.length) style.transform = parts.join(" ");
    // Match Figma: rotation is around the layer's center by default.
    style.transformOrigin = "center";
  }

  const dragStyle = mergeDragTransform(style.transform, dragOffset);
  if (dragStyle) Object.assign(style, dragStyle);

  const hasVectorPaths = !!figma?.vectorDetail?.vectorPaths?.length;
  const polygonPointCount = figma?.vectorDetail?.pointCount;
  const hasPolygonFallbackPath =
    isVector &&
    !hasVectorPaths &&
    (figma?.originalType === "POLYGON" || figma?.originalType === "REGULAR_POLYGON") &&
    typeof polygonPointCount === "number" &&
    polygonPointCount >= 3;
  const isVectorOrImageWithData = (hasImageFill || (isVector && node.props?._imageData) || (isVector && hasVectorPaths)) && !isText;
  if (figma) {
    const fillEnabled = figma.fillEnabled !== false;

    if (!hasImageFill && !isTextNode) {
      const bg = getBackgroundFromFills(figma.fills ?? [], fillEnabled, false);
      if (bg) {
        if (
          bg.startsWith("linear-gradient") ||
          bg.startsWith("radial-gradient") ||
          bg.startsWith("conic-gradient")
        ) {
          style.background = bg;
        } else {
          style.backgroundColor = bg;
        }
      }
    }

    if (borderSideStyles) {
      if (borderSideStyles.border) style.border = borderSideStyles.border;
      if (borderSideStyles.borderTop) style.borderTop = borderSideStyles.borderTop;
      if (borderSideStyles.borderRight) style.borderRight = borderSideStyles.borderRight;
      if (borderSideStyles.borderBottom) style.borderBottom = borderSideStyles.borderBottom;
      if (borderSideStyles.borderLeft) style.borderLeft = borderSideStyles.borderLeft;
      if (borderSideStyles.borderImage) {
        (style as React.CSSProperties & { borderImage?: string; borderImageSlice?: number }).borderImage =
          borderSideStyles.borderImage;
        if (borderSideStyles.borderImageSlice != null) {
          (style as React.CSSProperties & { borderImageSlice?: number }).borderImageSlice =
            borderSideStyles.borderImageSlice;
        }
      }
      const dash = figma.dashPattern;
      const stroke0 = figma.strokes?.[0];
      const solidBorderOnly =
        stroke0 &&
        isFillVisible(stroke0) &&
        (!stroke0.type || stroke0.type === "SOLID") &&
        !borderSideStyles.borderImage;
      if (solidBorderOnly && Array.isArray(dash) && dash.length) {
        if (borderSideStyles.border) {
          style.borderStyle = "dashed";
        } else {
          if (borderSideStyles.borderTop && borderSideStyles.borderTop !== "none") {
            style.borderTopStyle = "dashed";
          }
          if (borderSideStyles.borderRight && borderSideStyles.borderRight !== "none") {
            style.borderRightStyle = "dashed";
          }
          if (borderSideStyles.borderBottom && borderSideStyles.borderBottom !== "none") {
            style.borderBottomStyle = "dashed";
          }
          if (borderSideStyles.borderLeft && borderSideStyles.borderLeft !== "none") {
            style.borderLeftStyle = "dashed";
          }
        }
      }
    }

    const shadow = getBoxShadow(figma.effects);
    if (shadow) style.boxShadow = shadow;

    const br = getBorderRadius(figma, isEllipse);
    if (br) style.borderRadius = br;

    const filter = getFilter(figma.effects);
    if (filter) style.filter = filter;

    const backdrop = getBackdropFilter(figma.effects);
    if (backdrop) {
      style.backdropFilter = backdrop;
      (style as React.CSSProperties & { WebkitBackdropFilter?: string }).WebkitBackdropFilter = backdrop;
    }

    const blend = figmaBlendModeToCss(figma.blendMode);
    if (blend) style.mixBlendMode = blend;

    if (node.overflow === "HIDDEN") style.overflow = "hidden";
    else if (node.overflow === "SCROLL") style.overflow = "auto";
    else if (figma.clipsContent && !isVectorOrImageWithData) style.overflow = "hidden";
    // SVG/PNG as <img>: avoid overflow:visible inside auto-layout — breaks flex sizing (min-content).
    else if (isVectorOrImageWithData && !(usesFlex && isChild)) style.overflow = "visible";
    else if (isVectorOrImageWithData) style.overflow = "hidden";
  }

  const layout = node.layoutMode ?? "NONE";
  if (layout === "HORIZONTAL" || layout === "VERTICAL") {
    style.display = "flex";
    style.flexDirection = layout === "HORIZONTAL" ? "row" : "column";
    if (node.layoutWrap === "WRAP") style.flexWrap = "wrap";
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
    style.tabSize = 4;
    style.margin = 0;
    style.padding = 0;
    /** Prevent flex from shrinking text width to ~0 (one char per line). */
    style.writingMode = "horizontal-tb";
    if (usesFlex && isChild) {
      style.flexShrink = 0;
      style.minWidth =
        node.minWidth != null ? node.minWidth : Math.max(typeof node.width === "number" ? node.width : 0, 1);
    }

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
    } else {
      const w = fontStyleToFontWeight(props.fontStyle as string | null | undefined);
      if (w != null) style.fontWeight = w;
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
    if (lh != null) {
      const isAuto =
        lh === "auto" ||
        (typeof lh === "object" &&
          lh !== null &&
          (lh as { unit?: string }).unit === "AUTO");
      style.lineHeight = isAuto ? "normal" : typeof lh === "number" ? `${lh}px` : String(lh);
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
  if (isVector && (hasVectorPaths || hasPolygonFallbackPath)) {
    const vector = figma?.vectorDetail;
    const paths = hasVectorPaths
      ? vector?.vectorPaths ?? []
      : [{ data: polygonPathFromPointCount(polygonPointCount ?? 3, node.width, node.height), windingRule: "NONZERO" }];
    const fillColor = vector?.fillColor ?? getFirstVisiblePaintColor(figma?.fills);
    const strokeColor = vector?.strokeColor ?? getFirstVisiblePaintColor(figma?.strokes);
    const strokeWidth =
      figma?.strokeEnabled === false
        ? 0
        : (typeof vector?.strokeWidth === "number" ? vector.strokeWidth : (figma?.strokeWeight ?? 0));
    const capMap: Record<string, React.SVGProps<SVGPathElement>["strokeLinecap"]> = {
      NONE: "butt",
      ROUND: "round",
      SQUARE: "square",
    };
    const joinMap: Record<string, React.SVGProps<SVGPathElement>["strokeLinejoin"]> = {
      MITER: "miter",
      ROUND: "round",
      BEVEL: "bevel",
    };
    const cap = capMap[String(vector?.strokeCap ?? "NONE")] ?? "butt";
    const join = joinMap[String(vector?.strokeJoin ?? "MITER")] ?? "miter";
    const dash = Array.isArray(vector?.dashPattern) && vector!.dashPattern!.length > 0
      ? vector!.dashPattern!.join(" ")
      : undefined;
    const miterLimit = typeof vector?.strokeMiterLimit === "number" ? vector.strokeMiterLimit : undefined;

    return (
      <div
        style={{
          ...style,
          // Vector nodes should render from path geometry only, never as a filled box.
          background: "transparent",
          backgroundColor: "transparent",
          border: "none",
          overflow: "visible",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${Math.max(node.width, 1)} ${Math.max(node.height, 1)}`}
          preserveAspectRatio="none"
          style={{ display: "block", pointerEvents: "none", overflow: "visible" }}
        >
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.data}
              fill={fillColor ?? "none"}
              fillRule={String(p.windingRule).toUpperCase() === "EVENODD" ? "evenodd" : "nonzero"}
              stroke={strokeWidth > 0 ? (strokeColor ?? "none") : "none"}
              strokeWidth={strokeWidth > 0 ? strokeWidth : undefined}
              strokeLinecap={strokeWidth > 0 ? cap : undefined}
              strokeLinejoin={strokeWidth > 0 ? join : undefined}
              strokeDasharray={strokeWidth > 0 ? dash : undefined}
              strokeMiterlimit={strokeWidth > 0 ? miterLimit : undefined}
            />
          ))}
        </svg>
        {showSelection && <ResizeHandles onResizeStart={handleResizeStart} />}
      </div>
    );
  }

  if ((hasImageFill || (isVector && node.props?._imageData)) && !(isVector && (hasVectorPaths || (node.children?.length ?? 0) > 0))) {
    const imageData = node.props?._imageData as string | undefined;
    const scaleMode = (node.props?._imageScaleMode as string) ?? "FILL";
    const isSvgDataUrl = imageData?.includes("image/svg+xml");
    const renderAsPureImage = node.type === "IMAGE" || isVector;
    const objectFit: React.CSSProperties["objectFit"] =
      isSvgDataUrl
        ? "contain"
        : scaleMode === "FIT"
          ? "contain"
          : scaleMode === "TILE"
            ? "none"
            : // Figma IMAGE scale modes: FILL/CROP behave like CSS cover.
              "cover";

    const flexChildRaster = usesFlex && isChild;
    const containerStyle: React.CSSProperties = {
      ...style,
      overflow: flexChildRaster ? "hidden" : (renderAsPureImage ? "visible" : style.overflow),
      ...(flexChildRaster ? { minWidth: 0, minHeight: 0 } : {}),
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
              position: renderAsPureImage ? "relative" : "absolute",
              left: renderAsPureImage ? undefined : 0,
              top: renderAsPureImage ? undefined : 0,
              maxWidth: "100%",
              maxHeight: "100%",
              minWidth: 0,
              minHeight: 0,
              objectFit,
              objectPosition: "center",
              ...(scaleMode === "TILE"
                ? {
                    objectFit: "none" as const,
                    // Best-effort tiling: CSS can't "repeat" with <img>, so we keep 1:1 pixels.
                    // For true tiling we’d need background-image or an SVG pattern.
                  }
                : {}),
              display: "block",
              pointerEvents: "none",
              stroke: "none",
              outline: "none",
              border: "none",
              zIndex: renderAsPureImage ? undefined : 0,
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
        {!renderAsPureImage && node.children?.map((child) => (
          <FigmaNodeRendererInner
            key={child.id}
            node={child}
            isSelected={selectedIds.has(child.id)}
            zoom={zoom}
            parentLayout={layout !== "NONE" ? layout : "NONE"}
            isChild={true}
          />
        ))}
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
        <FigmaNodeRendererInner
          key={child.id}
          node={child}
          isSelected={selectedIds.has(child.id)}
          zoom={zoom}
          parentLayout={childLayout}
          isChild={true}
        />
      ))}
    </div>
  );
}

export const FigmaNodeRenderer = memo(FigmaNodeRendererInner);

