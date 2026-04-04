import type { SceneNode, SceneNodeType } from "@/lib/editor/types";
import { firstVisibleFillIsImage, indexOfFirstVisibleFill, isImagePaintType } from "./fill-visibility";
import { fontStyleToFontWeight, type FigmaNode, type RenderPayload } from "./types";
import {
  alignFigmaTextSegmentsToContent,
  normalizeFigmaUnicodeLineBreaks,
  type TextSegmentWithRange,
} from "./text-segments";

function mapType(figmaType: string): SceneNodeType {
  switch (figmaType) {
    case "FRAME":
    case "GROUP":
    case "COMPONENT":
    case "INSTANCE":
    case "COMPONENT_SET":
      return "FRAME";
    case "RECTANGLE":
      return "RECTANGLE";
    case "TEXT":
      return "TEXT";
    case "ELLIPSE":
      return "RECTANGLE";
    case "IMAGE":
      return "IMAGE";
    case "LINE":
    case "VECTOR":
    case "BOOLEAN_OPERATION":
    case "STAR":
    case "POLYGON":
    case "REGULAR_POLYGON":
    case "SLICE":
      return "VECTOR";
    case "SECTION":
      return "FRAME";
    default:
      return "FRAME";
  }
}

function mapLayoutMode(mode: string | null): "NONE" | "HORIZONTAL" | "VERTICAL" {
  if (mode === "HORIZONTAL") return "HORIZONTAL";
  if (mode === "VERTICAL") return "VERTICAL";
  return "NONE";
}

/** Map plugin / Figma `lineHeight` to CSS `line-height`. AUTO → `normal` (explicit browser default line box). */
function figmaLineHeightToCss(lh: unknown): string | number | undefined {
  if (lh == null) return undefined;
  if (typeof lh === "number") return lh;
  if (typeof lh === "string") {
    if (lh.toLowerCase() === "auto") return "normal";
    return lh;
  }
  if (typeof lh === "object" && lh !== null) {
    const o = lh as { unit?: string; value?: number };
    if (o.unit === "PIXELS" && typeof o.value === "number") return o.value;
    if (o.unit === "PERCENT" && typeof o.value === "number") return `${o.value}%`;
    if (o.unit === "AUTO") return "normal";
  }
  return undefined;
}

/** UTF-8 → base64 (SVG in data URLs — avoids huge encodeURIComponent URLs in Chromium/Tauri). */
function utf8ToBase64(str: string): string {
  if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(str)));
}

function toDataUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("data:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const trimmed = value.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml") || trimmed.includes("<svg")) {
    return `data:image/svg+xml;base64,${utf8ToBase64(trimmed)}`;
  }

  // Raster magic bytes when value is raw base64 (no data: prefix)
  if (trimmed.startsWith("/9j/")) {
    return `data:image/jpeg;base64,${value}`;
  }
  if (trimmed.startsWith("iVBORw0KGgo")) {
    return `data:image/png;base64,${value}`;
  }

  return `data:image/png;base64,${value}`;
}

/** Extract string data from asset value (handles object format from some plugins). Prefers PNG over SVG when both exist. */
function extractAssetString(
  val:
    | string
    | { data?: string; base64?: string; svg?: string; png?: string; svgData?: string; pngData?: string }
    | undefined
): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  return val.png ?? val.pngData ?? val.data ?? val.base64 ?? val.svg ?? val.svgData ?? null;
}

function getOverflow(node: FigmaNode): "VISIBLE" | "HIDDEN" | "SCROLL" {
  if (!node.clipsContent) return "VISIBLE";
  const dir = node.overflowDirection;
  if (dir === "HORIZONTAL_AND_VERTICAL") return "VISIBLE";
  if (dir === "NONE") return "HIDDEN";
  if (dir === "HORIZONTAL" || dir === "VERTICAL" || dir === "BOTH")
    return "SCROLL";
  return "HIDDEN";
}

type AssetMap = Record<
  string,
  string | { data?: string; base64?: string; svg?: string; png?: string; svgData?: string; pngData?: string }
>;

/**
 * Contract order (Figma To Haze plugin, deduped blobs in merged assets):
 * pngData → imageData / src → *_png keys → merged[nodeId] (and : → - / _) → imageHash → IMAGE fills (+ id_fill_i, alt ids) → svgData / svgSrc → *_svg / generic.
 */
function resolveImageSrc(node: FigmaNode, assets: AssetMap | undefined): string | null {
  const getStr = (val: unknown) =>
    extractAssetString(val as string | { data?: string; base64?: string; svg?: string; png?: string } | undefined);
  const altIds = [node.id.replace(/:/g, "-"), node.id.replace(/:/g, "_")];
  const fillsList = Array.isArray(node.fills) ? node.fills : [];
  const allowPrimaryImageRaster =
    node.type === "IMAGE" || firstVisibleFillIsImage(fillsList);
  const skipInlineNodeBitmap =
    node.type !== "IMAGE" && !allowPrimaryImageRaster;

  // 1) Explicit PNG on node
  if (node.pngData && !skipInlineNodeBitmap) return toDataUrl(node.pngData);

  // 2) Inline hydration (plugin may mirror the same URL as pngData / assets[id])
  if (node.imageData && !skipInlineNodeBitmap) return toDataUrl(node.imageData);
  if (node.src && !skipInlineNodeBitmap) return toDataUrl(node.src);

  // 3) assets[id_png] / alt id variants
  if (assets) {
    const pngKey = `${node.id}_png`;
    const pngVal = getStr(assets[pngKey]);
    if (pngVal) return toDataUrl(pngVal);
    for (const altId of altIds) {
      const ap = getStr(assets[`${altId}_png`]);
      if (ap) return toDataUrl(ap);
    }
  }

  // 4) `images` / assets keyed by Figma imageHash (node.imageHash and/or IMAGE fills). Order: layer hash, primary fill, then other fills.
  const imageHashCandidates: string[] = [];
  const pushImageHash = (h: unknown) => {
    if (h == null) return;
    const s = String(h).trim();
    if (s.length > 0 && !imageHashCandidates.includes(s)) imageHashCandidates.push(s);
  };
  if (allowPrimaryImageRaster) {
    pushImageHash(node.imageHash);
    const pri = indexOfFirstVisibleFill(fillsList);
    if (pri >= 0 && isImagePaintType(fillsList[pri]?.type)) {
      const pf = fillsList[pri];
      pushImageHash(pf.imageHash);
      pushImageHash(pf.imageRef);
    }
    for (const f of fillsList) {
      if (isImagePaintType(f?.type)) {
        pushImageHash(f.imageHash);
        pushImageHash(f.imageRef);
      }
    }
  }
  if (assets && imageHashCandidates.length > 0) {
    for (const hk of imageHashCandidates) {
      const fromHash = getStr(assets[hk]);
      if (fromHash) return toDataUrl(fromHash);
    }
  }

  // 5) Deduped blob keyed by node id — avoid baking whole-node PNG as <img> when image isn’t the top fill
  if (allowPrimaryImageRaster && assets) {
    const directId = getStr(assets[node.id]);
    if (directId) return toDataUrl(directId);
    for (const altId of altIds) {
      const a = getStr(assets[altId]);
      if (a) return toDataUrl(a);
    }
  }

  // 6) IMAGE fill only when it is the topmost visible fill (matches plugin export)
  if (allowPrimaryImageRaster && node.fills && node.fills.length > 0) {
    const primaryIdx = indexOfFirstVisibleFill(node.fills);
    if (primaryIdx >= 0 && isImagePaintType(node.fills[primaryIdx]?.type)) {
      const fill = node.fills[primaryIdx];
      const i = primaryIdx;
      const fillHashKey = fill.imageHash != null ? String(fill.imageHash).trim() : "";
      if (fillHashKey && assets?.[fillHashKey]) {
        const fromFillHash = getStr(assets[fillHashKey]);
        if (fromFillHash) return toDataUrl(fromFillHash);
      }
      if (fill.imageData) return toDataUrl(fill.imageData);
      if (fill.src) return toDataUrl(fill.src);
      if (fill.imageBytes) return toDataUrl(fill.imageBytes);
      const refVal = fill.imageRef && assets?.[fill.imageRef];
      const refStr = extractAssetString(refVal as string | { data?: string } | undefined);
      if (refStr) return toDataUrl(refStr);
      const fillKey = `${node.id}_fill_${i}`;
      const fillCandidates = [fillKey, ...altIds.map((alt) => `${alt}_fill_${i}`)];
      for (const fk of fillCandidates) {
        const fillVal = assets?.[fk];
        const fillStr = extractAssetString(fillVal as string | { data?: string } | undefined);
        if (fillStr) return toDataUrl(fillStr);
      }
    }
  }

  // 7) SVG on node (plugin may use svgSrc instead of svgData when deduping)
  if (node.svgData) return toDataUrl(node.svgData);
  if (node.svgSrc) return toDataUrl(node.svgSrc);

  if (!assets) return null;

  const vectorTypes = ["VECTOR", "STAR", "POLYGON", "LINE", "BOOLEAN_OPERATION", "ELLIPSE"];
  const isVectorType = vectorTypes.includes(node.type);

  const svgKey = `${node.id}_svg`;
  const svgVal = getStr(assets[svgKey]);

  if (isVectorType && svgVal) return toDataUrl(svgVal);
  if (svgVal) return toDataUrl(svgVal);

  for (const altId of altIds) {
    const aSvg = getStr(assets[`${altId}_svg`]);
    if (aSvg) return toDataUrl(aSvg);
  }

  for (const [key, value] of Object.entries(assets)) {
    const str = getStr(value);
    if (!str) continue;
    if (
      key === node.id ||
      key.endsWith(`_${node.id}`) ||
      key.endsWith(`_${node.id.replace(/:/g, "-")}`)
    ) {
      return toDataUrl(str);
    }
  }

  return null;
}

function convertNode(
  node: FigmaNode,
  parentId: string | undefined,
  idPrefix: string,
  assets: AssetMap | undefined
): SceneNode {
  const nodeType = typeof node.type === "string" ? node.type : "FRAME";
  const type = mapType(nodeType);
  const isTextNode = nodeType === "TEXT";
  const fills = Array.isArray(node.fills) ? node.fills : [];
  const strokes = Array.isArray(node.strokes) ? node.strokes : [];
  const effects = Array.isArray(node.effects) ? node.effects : [];
  const x = typeof node.x === "number" ? node.x : 0;
  const y = typeof node.y === "number" ? node.y : 0;
  const width = typeof node.width === "number" ? node.width : 0;
  const height = typeof node.height === "number" ? node.height : 0;
  const rotation = typeof node.rotation === "number" ? node.rotation : 0;
  const visible = node.visible !== false;
  const opacity = typeof node.opacity === "number" ? node.opacity : 1;

  const props: Record<string, unknown> = {
    _figma: {
      originalType: nodeType,
      fills,
      strokes,
      strokeWeight: typeof node.strokeWeight === "number" ? node.strokeWeight : 0,
      strokeTopWeight: typeof node.strokeTopWeight === "number" ? node.strokeTopWeight : null,
      strokeRightWeight: typeof node.strokeRightWeight === "number" ? node.strokeRightWeight : null,
      strokeBottomWeight: typeof node.strokeBottomWeight === "number" ? node.strokeBottomWeight : null,
      strokeLeftWeight: typeof node.strokeLeftWeight === "number" ? node.strokeLeftWeight : null,
      strokeAlign: node.strokeAlign ?? "INSIDE",
      effects,
      cornerRadius: node.cornerRadius ?? null,
      topLeftRadius: node.topLeftRadius ?? null,
      topRightRadius: node.topRightRadius ?? null,
      bottomLeftRadius: node.bottomLeftRadius ?? null,
      bottomRightRadius: node.bottomRightRadius ?? null,
      blendMode: node.blendMode ?? "NORMAL",
      clipsContent: node.clipsContent === true,
      overflowDirection: node.overflowDirection,
      fillEnabled: node.fillEnabled !== false,
      strokeEnabled: node.strokeEnabled !== false,
      textHasNoBackgroundFill: node.textHasNoBackgroundFill ?? isTextNode,
      vectorDetail: node.vectorDetail ?? null,
      transform2d: node.transform2d ?? null,
    },
    _originalFigmaId: node.id,
  };

  if (nodeType === "ELLIPSE") {
    props._ellipse = true;
  }

  const imageSrc = resolveImageSrc(node, assets);
  const hasVectorPathData = !!node.vectorDetail?.vectorPaths?.length;
  const hasVectorChildren = Array.isArray(node.children) && node.children.length > 0;
  const isVectorLike = mapType(nodeType) === "VECTOR";
  const preserveVectorStructure =
    isVectorLike && (nodeType === "BOOLEAN_OPERATION" || hasVectorPathData || hasVectorChildren);
  const useImageFillDisplay =
    (nodeType === "IMAGE" || (nodeType !== "TEXT" && firstVisibleFillIsImage(fills))) &&
    !preserveVectorStructure;
  if (imageSrc && useImageFillDisplay) {
    props._hasImageFill = true;
    props._imageData = imageSrc;
    const primaryIdx = indexOfFirstVisibleFill(fills);
    const imageFill =
      primaryIdx >= 0 && isImagePaintType(fills[primaryIdx]?.type)
        ? fills[primaryIdx]
        : fills.find((f) => isImagePaintType(f.type));
    props._imageScaleMode = imageFill?.scaleMode ?? "FILL";
  }

  if (node.text) {
    const textContent = normalizeFigmaUnicodeLineBreaks(String(node.text.content ?? ""));
    props.content = textContent;

    // Extract typography from segments if available, fall back to top-level text props
    const alignedSegments =
      node.text.segments && node.text.segments.length > 0
        ? alignFigmaTextSegmentsToContent(textContent, node.text.segments as TextSegmentWithRange[])
        : undefined;
    const seg0 = alignedSegments?.[0] ?? node.text.segments?.[0];
    const rawTw = node.text.fontWeight;
    const numericTw =
      typeof rawTw === "number"
        ? rawTw
        : typeof rawTw === "string" && /^\d+$/.test(rawTw)
          ? parseInt(rawTw, 10)
          : undefined;
    const inferredWeight =
      seg0?.fontWeight ??
      fontStyleToFontWeight(seg0?.fontStyle) ??
      numericTw ??
      fontStyleToFontWeight(node.text.fontStyle ?? null);
    props.fontSize = seg0?.fontSize ?? node.text.fontSize ?? 12;
    props.fontWeight = String(inferredWeight ?? 400);
    props.fontFamily = seg0?.fontFamily ?? node.text.fontFamily;
    props.fontStyle = seg0?.fontStyle ?? node.text.fontStyle;

    const textAlign =
      node.text.textAlignHorizontal ??
      node.text.textAlign ??
      "LEFT";
    props.textAlign = String(textAlign).toLowerCase();

    props.letterSpacing = seg0?.letterSpacing ?? node.text.letterSpacing ?? 0;
    {
      const lhCss = figmaLineHeightToCss(seg0?.lineHeight ?? node.text.lineHeight);
      if (lhCss !== undefined) props.lineHeight = lhCss;
    }
    props.textDecoration = seg0?.textDecoration ?? node.text.textDecoration;

    // Text fills: prefer segments[0].fills, then text.fills, then fallback to white
    const segFills = seg0?.fills;
    const textFills = node.text.fills;
    if (segFills && segFills.length > 0) {
      props._textFills = segFills;
    } else if (textFills && textFills.length > 0) {
      props._textFills = textFills;
    } else {
      props._textFills = [{ hex: "#ffffff", alpha: 1 }];
    }

    // Store all segments for multi-style text rendering (aligned to full content for \n / \t)
    if (alignedSegments && alignedSegments.length > 0) {
      props._textSegments = alignedSegments;
    }

    // Vertical text alignment
    props._textAlignVertical = node.text.textAlignVertical ?? "TOP";

    // Overflow flags
    const noOverflow =
      node.text.noOverflow === true ||
      node.text.overflowVisible === true ||
      node.text.textShouldNotClip === true ||
      node.text.textTruncation === "DISABLED";
    props._textNoOverflow = noOverflow;
    props._textTruncation = node.text.textTruncation;
    props._textMaxLines = node.text.maxLines;
    props._textAutoResize = node.text.textAutoResize;
  }

  const nodeId = idPrefix + node.id;
  const children = (node.children ?? []).map((child) =>
    convertNode(child, nodeId, idPrefix, assets)
  );

  const layoutGrow = node.layoutGrow;
  const layoutAlignRaw = node.layoutAlign;
  const layoutAlign: SceneNode["layoutAlign"] =
    layoutAlignRaw === "STRETCH" ? "STRETCH" : layoutAlignRaw === "INHERIT" ? "INHERIT" : undefined;

  const primaryAxisSizingMode =
    node.primaryAxisSizingMode === "AUTO" || node.primaryAxisSizingMode === "FIXED"
      ? node.primaryAxisSizingMode
      : undefined;
  const counterAxisSizingMode =
    node.counterAxisSizingMode === "AUTO" || node.counterAxisSizingMode === "FIXED"
      ? node.counterAxisSizingMode
      : undefined;

  const layoutWrap =
    node.layoutWrap === "WRAP" || node.layoutWrap === "NO_WRAP" ? node.layoutWrap : undefined;
  const layoutPositioning =
    node.layoutPositioning === "ABSOLUTE" || node.layoutPositioning === "AUTO"
      ? node.layoutPositioning
      : undefined;

  return {
    id: nodeId,
    type,
    name: node.name,
    x,
    y,
    width,
    height,
    rotation,
    visible,
    opacity,
    children,
    parentId,
    props,
    layoutMode: mapLayoutMode(node.layoutMode),
    primaryAxisAlignItems: node.primaryAxisAlignItems ?? undefined,
    counterAxisAlignItems: node.counterAxisAlignItems ?? undefined,
    paddingTop: typeof node.paddingTop === "number" ? node.paddingTop : 0,
    paddingRight: typeof node.paddingRight === "number" ? node.paddingRight : 0,
    paddingBottom: typeof node.paddingBottom === "number" ? node.paddingBottom : 0,
    paddingLeft: typeof node.paddingLeft === "number" ? node.paddingLeft : 0,
    itemSpacing: typeof node.itemSpacing === "number" ? node.itemSpacing : 0,
    overflow: getOverflow(node),
    layoutGrow: layoutGrow != null ? layoutGrow : undefined,
    layoutAlign,
    primaryAxisSizingMode,
    counterAxisSizingMode,
    layoutPositioning,
    layoutWrap,
    minWidth: node.minWidth ?? undefined,
    maxWidth: node.maxWidth ?? undefined,
    minHeight: node.minHeight ?? undefined,
    maxHeight: node.maxHeight ?? undefined,
  };
}

/**
 * Merge before any asset resolve (plugin contract):
 * `assets` → `images` (imageHash keys) → `exports` (later keys win on collision).
 */
function getMergedAssets(payload: RenderPayload): AssetMap | undefined {
  const assets = payload.assets ?? {};
  const images = payload.images ?? {};
  const exports = payload.exports ?? {};
  const merged: AssetMap = { ...assets, ...images, ...exports };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Convert a RenderPayload into SceneNode[]. Returns an array with the root frame. */
export function figmaToSceneNodes(
  payload: RenderPayload,
  idPrefix?: string
): SceneNode[] {
  const prefix =
    idPrefix ?? `figma-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-`;
  const assets = getMergedAssets(payload);
  const rootNode = convertNode(payload.frame, undefined, prefix, assets);
  return [rootNode];
}

