import type { SceneNode, SceneNodeType } from "@/lib/editor/types";
import { fontStyleToFontWeight, type FigmaNode, type RenderPayload } from "./types";

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
      return "VECTOR";
    default:
      return "FRAME";
  }
}

function mapLayoutMode(mode: string | null): "NONE" | "HORIZONTAL" | "VERTICAL" {
  if (mode === "HORIZONTAL") return "HORIZONTAL";
  if (mode === "VERTICAL") return "VERTICAL";
  return "NONE";
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
  val: string | { data?: string; base64?: string; svg?: string; png?: string } | undefined
): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  return val.png ?? val.data ?? val.base64 ?? val.svg ?? null;
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

type AssetMap = Record<string, string | { data?: string; base64?: string; svg?: string; png?: string }>;

/**
 * Contract order (Figma To Haze plugin, deduped blobs in merged assets):
 * pngData → imageData / src → *_png keys → merged[nodeId] (and : → - / _) → imageHash → IMAGE fills (+ id_fill_i, alt ids) → svgData / svgSrc → *_svg / generic.
 */
function resolveImageSrc(node: FigmaNode, assets: AssetMap | undefined): string | null {
  const getStr = (val: unknown) =>
    extractAssetString(val as string | { data?: string; base64?: string; svg?: string; png?: string } | undefined);
  const altIds = [node.id.replace(/:/g, "-"), node.id.replace(/:/g, "_")];

  // 1) Explicit PNG on node
  if (node.pngData) return toDataUrl(node.pngData);

  // 2) Inline hydration (plugin may mirror the same URL as pngData / assets[id])
  if (node.imageData) return toDataUrl(node.imageData);
  if (node.src) return toDataUrl(node.src);

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

  // 4) IMAGE layer: `images` bucket keyed by imageHash (deduped bitmaps)
  if (node.type === "IMAGE" && node.imageHash && assets?.[node.imageHash]) {
    const fromHash = getStr(assets[node.imageHash]);
    if (fromHash) return toDataUrl(fromHash);
  }

  // 5) Deduped blob keyed by node id only (large selections omit inline fields)
  if (assets) {
    const directId = getStr(assets[node.id]);
    if (directId) return toDataUrl(directId);
    for (const altId of altIds) {
      const a = getStr(assets[altId]);
      if (a) return toDataUrl(a);
    }
  }

  // 6) IMAGE fills (imageHash, inline, ref, nodeId_fill_i with id variants)
  if (node.fills) {
    for (let i = 0; i < node.fills.length; i++) {
      const fill = node.fills[i];
      if (fill.type === "IMAGE") {
        if (fill.imageHash && assets?.[fill.imageHash]) {
          const fromFillHash = getStr(assets[fill.imageHash]);
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
  const type = mapType(node.type);
  const isTextNode = node.type === "TEXT";

  const props: Record<string, unknown> = {
    _figma: {
      originalType: node.type,
      fills: node.fills,
      strokes: node.strokes,
      strokeWeight: node.strokeWeight,
      strokeAlign: node.strokeAlign,
      effects: node.effects,
      cornerRadius: node.cornerRadius,
      topLeftRadius: node.topLeftRadius,
      topRightRadius: node.topRightRadius,
      bottomLeftRadius: node.bottomLeftRadius,
      bottomRightRadius: node.bottomRightRadius,
      blendMode: node.blendMode,
      clipsContent: node.clipsContent,
      overflowDirection: node.overflowDirection,
      fillEnabled: node.fillEnabled,
      strokeEnabled: node.strokeEnabled,
      textHasNoBackgroundFill: node.textHasNoBackgroundFill ?? isTextNode,
    },
    _originalFigmaId: node.id,
  };

  if (node.type === "ELLIPSE") {
    props._ellipse = true;
  }

  const imageSrc = resolveImageSrc(node, assets);
  if (imageSrc) {
    props._hasImageFill = true;
    props._imageData = imageSrc;
    const imageFill = node.fills.find((f) => f.type === "IMAGE");
    props._imageScaleMode = imageFill?.scaleMode ?? "FILL";
  }

  if (node.text) {
    props.content = node.text.content;

    // Extract typography from segments if available, fall back to top-level text props
    const seg0 = node.text.segments?.[0];
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
    props.fontSize = seg0?.fontSize ?? node.text.fontSize ?? 14;
    props.fontWeight = String(inferredWeight ?? 400);
    props.fontFamily = seg0?.fontFamily ?? node.text.fontFamily;
    props.fontStyle = seg0?.fontStyle ?? node.text.fontStyle;

    const textAlign =
      node.text.textAlignHorizontal ??
      node.text.textAlign ??
      "LEFT";
    props.textAlign = String(textAlign).toLowerCase();

    props.letterSpacing = seg0?.letterSpacing ?? node.text.letterSpacing ?? 0;
    props.lineHeight = seg0?.lineHeight ?? node.text.lineHeight;
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

    // Store all segments for multi-style text rendering
    if (node.text.segments && node.text.segments.length > 0) {
      props._textSegments = node.text.segments;
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

  return {
    id: nodeId,
    type,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    visible: node.visible,
    opacity: node.opacity,
    children,
    parentId,
    props,
    layoutMode: mapLayoutMode(node.layoutMode),
    primaryAxisAlignItems: node.primaryAxisAlignItems ?? undefined,
    counterAxisAlignItems: node.counterAxisAlignItems ?? undefined,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    itemSpacing: node.itemSpacing,
    overflow: getOverflow(node),
    layoutGrow: layoutGrow != null ? layoutGrow : undefined,
    layoutAlign,
    primaryAxisSizingMode,
    counterAxisSizingMode,
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
