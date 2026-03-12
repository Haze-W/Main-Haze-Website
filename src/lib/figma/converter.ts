import type { SceneNode, SceneNodeType } from "@/lib/editor/types";
import type { FigmaNode, RenderPayload } from "./types";

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
    case "LINE":
    case "VECTOR":
    case "BOOLEAN_OPERATION":
    case "STAR":
    case "POLYGON":
    case "IMAGE":
      return "RECTANGLE";
    default:
      return "FRAME";
  }
}

function mapLayoutMode(mode: string | null): "NONE" | "HORIZONTAL" | "VERTICAL" {
  if (mode === "HORIZONTAL") return "HORIZONTAL";
  if (mode === "VERTICAL") return "VERTICAL";
  return "NONE";
}

function toDataUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("data:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  const trimmed = value.trim();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml") || trimmed.includes("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }

  return `data:image/png;base64,${value}`;
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

function resolveImageSrc(
  node: FigmaNode,
  assets: Record<string, string> | undefined
): string | null {
  // Direct image data on the node (plugin may populate after export)
  if (node.imageData) return toDataUrl(node.imageData);
  if (node.src) return toDataUrl(node.src);

  // SVG data on the node (common for VECTOR/BOOLEAN_OPERATION nodes)
  if (node.svgData) return toDataUrl(node.svgData);

  // Check fills for IMAGE type
  if (node.fills) {
    for (let i = 0; i < node.fills.length; i++) {
      const fill = node.fills[i];
      if (fill.type === "IMAGE") {
        if (fill.imageData) return toDataUrl(fill.imageData);
        if (fill.src) return toDataUrl(fill.src);
        if (fill.imageBytes) return toDataUrl(fill.imageBytes);
        if (fill.imageRef && assets?.[fill.imageRef])
          return toDataUrl(assets[fill.imageRef]);
        const fillKey = `${node.id}_fill_${i}`;
        if (assets?.[fillKey]) return toDataUrl(assets[fillKey]);
      }
    }
  }

  if (!assets) return null;

  // Try exact node ID keys
  if (assets[node.id]) return toDataUrl(assets[node.id]);
  const svgKey = `${node.id}_svg`;
  if (assets[svgKey]) return toDataUrl(assets[svgKey]);

  // Colon-stripped IDs (e.g., "123:4" → "123-4", "123_4")
  const altIds = [
    node.id.replace(/:/g, "-"),
    node.id.replace(/:/g, "_"),
  ];
  for (const altId of altIds) {
    if (assets[altId]) return toDataUrl(assets[altId]);
    if (assets[`${altId}_svg`]) return toDataUrl(assets[`${altId}_svg`]);
  }

  // Fallback: any key that ends with or contains node.id (plugin-specific formats)
  for (const [key, value] of Object.entries(assets)) {
    if (!value || typeof value !== "string") continue;
    if (key === node.id || key.endsWith(`_${node.id}`) || key.endsWith(`_${node.id.replace(/:/g, "-")}`)) {
      return toDataUrl(value);
    }
  }

  return null;
}

function convertNode(
  node: FigmaNode,
  parentId: string | undefined,
  idPrefix: string,
  assets: Record<string, string> | undefined
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
    props.fontSize = seg0?.fontSize ?? node.text.fontSize ?? 14;
    props.fontWeight = String(seg0?.fontWeight ?? node.text.fontWeight ?? 400);
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
  };
}

/** Merge assets from payload - some plugins use "images" or other keys */
function getMergedAssets(payload: RenderPayload): Record<string, string> | undefined {
  const assets = payload.assets ?? {};
  const images = payload.images ?? {};
  const merged = { ...assets, ...images };
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
