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
  if (node.imageData) return toDataUrl(node.imageData);
  if (node.src) return node.src;
  const imageFillIndex = node.fills?.findIndex((f) => f.type === "IMAGE");
  const imageFill =
    imageFillIndex >= 0 ? node.fills?.[imageFillIndex] : undefined;
  if (imageFill) {
    if (imageFill.imageData) return toDataUrl(imageFill.imageData);
    if (imageFill.src) return imageFill.src;
    if (imageFill.imageBytes) return toDataUrl(imageFill.imageBytes);
    if (imageFill.imageRef && assets?.[imageFill.imageRef])
      return toDataUrl(assets[imageFill.imageRef]);
    const fillKey = `${node.id}_fill_${imageFillIndex}`;
    if (assets?.[fillKey]) return toDataUrl(assets[fillKey]);
  }
  if (assets?.[node.id]) return toDataUrl(assets[node.id]);
  const svgKey = `${node.id}_svg`;
  if (assets?.[svgKey]) return toDataUrl(assets[svgKey]);
  return null;
}

function convertNode(
  node: FigmaNode,
  parentId: string | undefined,
  idPrefix: string,
  assets: Record<string, string> | undefined
): SceneNode {
  const type = mapType(node.type);

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
    if (node.text.fontSize != null) props.fontSize = node.text.fontSize;
    if (node.text.fontWeight != null) props.fontWeight = String(node.text.fontWeight);
    if (node.text.fontFamily) props.fontFamily = node.text.fontFamily;
    if (node.text.fontStyle) props.fontStyle = node.text.fontStyle;
    const textAlign =
      node.text.textAlign ??
      node.text.textAlignHorizontal ??
      "LEFT";
    props.textAlign = String(textAlign).toLowerCase();
    if (node.text.letterSpacing) props.letterSpacing = node.text.letterSpacing;
    if (node.text.lineHeight != null) props.lineHeight = node.text.lineHeight;
    if (node.text.textDecoration) props.textDecoration = node.text.textDecoration;
    if (node.text.fills && node.text.fills.length > 0) {
      props._textFills = node.text.fills;
    }
    props._textNoOverflow =
      node.text.noOverflow ?? node.text.textTruncation === "DISABLED";
    props._textTruncation = node.text.textTruncation;
    props._textMaxLines = node.text.maxLines;
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

/** Convert a RenderPayload into SceneNode[]. Returns an array with the root frame. */
export function figmaToSceneNodes(
  payload: RenderPayload,
  idPrefix?: string
): SceneNode[] {
  const prefix =
    idPrefix ?? `figma-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-`;
  const assets = payload.assets;
  const rootNode = convertNode(payload.frame, undefined, prefix, assets);
  return [rootNode];
}
