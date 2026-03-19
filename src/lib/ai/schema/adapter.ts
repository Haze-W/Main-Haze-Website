/**
 * Adapter: Converts AI UI schema to editor SceneNode format
 */

import { nanoid } from "nanoid";
import type { SceneNode } from "@/lib/editor/types";
import type { AIUIElement, AIUILayout, UIComponentType } from "./ui-schema";
import { getValidIconName } from "@/lib/icon-valid";

/** Semantic types that map to CONTAINER with variant for proper editor styling */
const CONTAINER_VARIANT_TYPES: Partial<Record<UIComponentType, string>> = {
  navbar: "navbar",
  sidebar: "sidebar",
  card: "card",
  hero: "content",
  topbar: "topbar",
  modal: "modal",
  settings: "content",
};

const TYPE_MAP: Record<UIComponentType, SceneNode["type"]> = {
  navbar: "CONTAINER",
  sidebar: "CONTAINER",
  hero: "CONTAINER",
  dashboard: "FRAME",
  card: "CONTAINER",
  table: "FRAME",
  form: "FRAME",
  pricing: "FRAME",
  analytics: "FRAME",
  modal: "CONTAINER",
  login: "FRAME",
  gallery: "FRAME",
  settings: "CONTAINER",
  menu: "FRAME",
  topbar: "CONTAINER",
  frame: "FRAME",
  text: "TEXT",
  button: "BUTTON",
  input: "INPUT",
  image: "IMAGE",
  rectangle: "RECTANGLE",
  container: "FRAME",
  divider: "DIVIDER",
  spacer: "SPACER",
  icon: "ICON",
};

function mapType(type: UIComponentType, el?: AIUIElement): SceneNode["type"] {
  const base = TYPE_MAP[type] ?? "FRAME";
  if (type === "topbar" && (!el?.children || el.children.length === 0)) {
    return "TOPBAR";
  }
  return base;
}

function aiToSceneNode(el: AIUIElement): SceneNode {
  const id = el.id || nanoid();
  const type = mapType(el.type, el);
  const isCard = el.type === "card";
  const variant = type === "TOPBAR" ? undefined : CONTAINER_VARIANT_TYPES[el.type];
  const node: SceneNode = {
    id,
    type,
    name: el.text || el.type || "Element",
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    children: (el.children ?? []).map(aiToSceneNode),
    visible: true,
    locked: false,
    props: {
      ...(el.props ?? {}),
      ...(variant && { variant }),
      ...(isCard && {
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderRadius: el.styles?.borderRadius ?? 12,
      }),
      content: el.text,
      color: el.color ?? "#000000",
      backgroundColor: el.backgroundColor ?? (type === "FRAME" || type === "CONTAINER" ? "#ffffff" : undefined),
      fontFamily: el.styles?.fontFamily ?? "Inter",
      fontSize: el.styles?.fontSize ?? 14,
      fontWeight: el.styles?.fontWeight ?? "normal",
      textAlign: el.styles?.textAlign ?? "left",
    },
  };

  if (el.layoutMode && el.layoutMode !== "NONE") {
    node.layoutMode = el.layoutMode;
    node.itemSpacing = el.styles?.gap ?? 8;
    node.paddingTop = el.styles?.paddingTop ?? el.styles?.padding ?? 16;
    node.paddingRight = el.styles?.paddingRight ?? el.styles?.padding ?? 16;
    node.paddingBottom = el.styles?.paddingBottom ?? el.styles?.padding ?? 16;
    node.paddingLeft = el.styles?.paddingLeft ?? el.styles?.padding ?? 16;
  }

  if (type === "BUTTON") {
    const props = node.props ?? {};
    props.label = el.text ?? "Button";
    props.variant = "primary";
    props.size = "md";
  }

  if (type === "INPUT") {
    const props = node.props ?? {};
    props.placeholder = el.text ?? "Enter text...";
  }

  if (type === "ICON") {
    const props = node.props ?? {};
    props.iconName = getValidIconName((el.props?.iconName as string) ?? "circle");
    props.size = el.width && el.height ? Math.min(el.width, el.height) : 24;
    if (el.color) props.color = el.color;
  }

  if (type === "IMAGE" && el.props?.src) {
    const props = node.props ?? {};
    props.src = el.props.src;
    if (el.props.alt) props.alt = el.props.alt;
  }

  return node;
}

export function aiLayoutToSceneNodes(layout: AIUILayout): SceneNode[] {
  const { frame } = layout;
  const rootFrame: SceneNode = {
    id: nanoid(),
    type: "FRAME",
    name: "AI Generated",
    x: 0,
    y: 0,
    width: frame.width,
    height: frame.height,
    children: frame.children.map(aiToSceneNode),
    visible: true,
    locked: false,
    props: {
      backgroundColor: frame.background,
    },
  };
  return [rootFrame];
}

const REVERSE_TYPE_MAP: Partial<Record<SceneNode["type"], UIComponentType>> = {
  FRAME: "frame",
  TEXT: "text",
  BUTTON: "button",
  INPUT: "input",
  IMAGE: "image",
  ICON: "icon",
  RECTANGLE: "rectangle",
  TOPBAR: "topbar",
  DIVIDER: "divider",
  SPACER: "spacer",
};

function sceneNodeToAIElement(node: SceneNode): AIUIElement {
  const type = (REVERSE_TYPE_MAP[node.type] ?? "frame") as UIComponentType;
  const props = node.props ?? {};
  return {
    id: node.id,
    type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    text: (props.content as string) ?? (props.label as string) ?? node.name,
    color: props.color as string | undefined,
    backgroundColor: props.backgroundColor as string | undefined,
    children: (node.children ?? []).map(sceneNodeToAIElement),
    props: type === "icon" ? { iconName: props.iconName } : undefined,
  };
}

export function sceneNodesToAILayout(nodes: SceneNode[]): AIUILayout {
  if (!nodes.length) {
    return {
      frame: { width: 1440, height: 900, background: "#f8fafc", children: [] },
      metadata: { version: "1.0" },
    };
  }
  const root = nodes[0];
  const w = root.width ?? 1440;
  const h = root.height ?? 900;
  const bg = (root.props?.backgroundColor as string) ?? "#f8fafc";
  const children = (root.children?.length ? root.children : nodes).map(sceneNodeToAIElement);
  return {
    frame: { width: w, height: h, background: bg, children },
    metadata: { version: "1.0" },
  };
}
