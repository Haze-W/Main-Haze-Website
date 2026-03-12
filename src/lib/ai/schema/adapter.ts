/**
 * Adapter: Converts AI UI schema to editor SceneNode format
 */

import { nanoid } from "nanoid";
import type { SceneNode } from "@/lib/editor/types";
import type { AIUIElement, AIUILayout, UIComponentType } from "./ui-schema";

const TYPE_MAP: Record<UIComponentType, SceneNode["type"]> = {
  navbar: "FRAME",
  sidebar: "FRAME",
  hero: "FRAME",
  dashboard: "FRAME",
  card: "FRAME",
  table: "FRAME",
  form: "FRAME",
  pricing: "FRAME",
  analytics: "FRAME",
  modal: "FRAME",
  login: "FRAME",
  gallery: "FRAME",
  settings: "FRAME",
  menu: "FRAME",
  topbar: "TOPBAR",
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
  if (type === "topbar" && el?.children && el.children.length > 0) {
    return "FRAME";
  }
  return base;
}

function aiToSceneNode(el: AIUIElement): SceneNode {
  const id = el.id || nanoid();
  const type = mapType(el.type, el);
  const isCard = el.type === "card";
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
      ...(isCard && {
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        borderRadius: el.styles?.borderRadius ?? 12,
      }),
      content: el.text,
      color: el.color ?? "#000000",
      backgroundColor: el.backgroundColor ?? (type === "FRAME" ? "#ffffff" : undefined),
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
    props.iconName = (el.props?.iconName as string) ?? "circle";
    props.size = el.width && el.height ? Math.min(el.width, el.height) : 24;
    if (el.color) props.color = el.color;
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
