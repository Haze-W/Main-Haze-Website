/**
 * Adapter: Converts AI UI schema to editor SceneNode format
 * Maps visual fields (colors, typography, spacing, shadows) into node.props and layout fields.
 */

import { nanoid } from "nanoid";
import type { SceneNode } from "@/lib/editor/types";
import type { AIStyleProps, AIUIElement, AIUILayout, UIComponentType } from "./ui-schema";
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

function resolveBg(el: AIUIElement): string | undefined {
  const s = el.styles;
  const v = el.backgroundColor ?? s?.backgroundColor;
  if (v == null || String(v).trim() === "") return undefined;
  return String(v);
}

function resolveFg(el: AIUIElement): string | undefined {
  const s = el.styles;
  const v = el.color ?? s?.color;
  if (v == null || String(v).trim() === "") return undefined;
  return String(v);
}

/** Apply AI layoutMode + styles.padding/gap to SceneNode flex fields */
function layoutFieldsFromAI(el: AIUIElement): Partial<
  Pick<SceneNode, "layoutMode" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "itemSpacing">
> {
  const s = el.styles;
  const out: Partial<
    Pick<SceneNode, "layoutMode" | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft" | "itemSpacing">
  > = {};

  const mode = el.layoutMode;
  if (mode === "HORIZONTAL" || mode === "VERTICAL") {
    out.layoutMode = mode;
  } else if (s?.gap != null || s?.padding != null || s?.paddingTop != null) {
    out.layoutMode = "VERTICAL";
  }

  if (out.layoutMode) {
    if (s?.gap != null) out.itemSpacing = s.gap;
    const p = s?.padding;
    if (s?.paddingTop != null) out.paddingTop = s.paddingTop;
    if (s?.paddingRight != null) out.paddingRight = s.paddingRight;
    if (s?.paddingBottom != null) out.paddingBottom = s.paddingBottom;
    if (s?.paddingLeft != null) out.paddingLeft = s.paddingLeft;
    if (p != null) {
      if (out.paddingTop == null) out.paddingTop = p;
      if (out.paddingRight == null) out.paddingRight = p;
      if (out.paddingBottom == null) out.paddingBottom = p;
      if (out.paddingLeft == null) out.paddingLeft = p;
    }
  }

  return out;
}

/** Props mirrored on node for HTML export padding (absolute children). */
function paddingPropsFromStyles(s?: AIStyleProps): Record<string, unknown> {
  if (!s) return {};
  const p = s.padding;
  const o: Record<string, unknown> = {};
  if (p != null) {
    o.padding = p;
    o.paddingTop = s.paddingTop ?? p;
    o.paddingRight = s.paddingRight ?? p;
    o.paddingBottom = s.paddingBottom ?? p;
    o.paddingLeft = s.paddingLeft ?? p;
  } else {
    if (s.paddingTop != null) o.paddingTop = s.paddingTop;
    if (s.paddingRight != null) o.paddingRight = s.paddingRight;
    if (s.paddingBottom != null) o.paddingBottom = s.paddingBottom;
    if (s.paddingLeft != null) o.paddingLeft = s.paddingLeft;
  }
  return o;
}

function surfaceProps(el: AIUIElement, isCard: boolean): Record<string, unknown> {
  const s = el.styles ?? {};
  const o: Record<string, unknown> = {
    ...paddingPropsFromStyles(s),
  };
  const bg = resolveBg(el);
  if (bg) o.backgroundColor = bg;
  if (s.borderRadius != null) o.borderRadius = s.borderRadius;
  if (s.boxShadow) o.boxShadow = s.boxShadow;
  if (s.borderColor != null) o.borderColor = s.borderColor;
  if (s.borderWidth != null) o.borderWidth = s.borderWidth;
  if (isCard) {
    if (!o.boxShadow) o.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
    if (o.borderRadius == null) o.borderRadius = 12;
  }
  return o;
}

function aiToSceneNode(el: AIUIElement): SceneNode {
  const id = el.id || nanoid();
  const type = mapType(el.type, el);
  const isCard = el.type === "card";
  const variant = type === "TOPBAR" ? undefined : CONTAINER_VARIANT_TYPES[el.type];
  const s = el.styles ?? {};

  const baseProps: Record<string, unknown> = { ...(el.props ?? {}) };
  if (variant && type === "CONTAINER") baseProps.variant = variant;

  const layoutPart = layoutFieldsFromAI(el);
  let props: Record<string, unknown> = { ...baseProps };

  if (type === "FRAME" || type === "CONTAINER") {
    props = { ...props, ...surfaceProps(el, isCard) };
  }

  if (type === "TEXT") {
    const fg = resolveFg(el);
    props = {
      ...props,
      content: el.text ?? "Text",
      ...(fg ? { color: fg } : {}),
      fontSize: s.fontSize ?? 14,
      fontWeight: s.fontWeight ?? "normal",
      ...(s.fontFamily ? { fontFamily: s.fontFamily } : {}),
      ...(s.textAlign ? { textAlign: s.textAlign } : {}),
    };
  }

  if (type === "BUTTON") {
    const bg = resolveBg(el);
    const fg = resolveFg(el);
    const custom = Boolean(bg || fg);
    props = {
      ...props,
      label: el.text ?? "Button",
      variant: custom ? "ghost" : "primary",
      ...(bg ? { backgroundColor: bg } : {}),
      ...(fg ? { color: fg } : {}),
      ...(s.borderRadius != null ? { borderRadius: s.borderRadius } : {}),
      ...(s.fontSize != null ? { fontSize: s.fontSize } : {}),
      ...(s.fontWeight != null ? { fontWeight: s.fontWeight } : {}),
    };
  }

  if (type === "INPUT") {
    const bg = resolveBg(el);
    const fg = resolveFg(el);
    props = {
      ...props,
      placeholder: el.text ?? "Enter text…",
      ...(bg ? { backgroundColor: bg } : {}),
      ...(fg ? { color: fg } : {}),
      ...(s.borderRadius != null ? { borderRadius: s.borderRadius } : {}),
      ...(s.borderColor != null ? { borderColor: s.borderColor } : {}),
      ...(s.borderWidth != null ? { borderWidth: s.borderWidth } : {}),
      ...paddingPropsFromStyles(s),
    };
  }

  if (type === "ICON") {
    props = {
      ...props,
      iconName: getValidIconName((el.props?.iconName as string) ?? "circle"),
      size: el.width && el.height ? Math.min(el.width, el.height) : 24,
      ...(resolveFg(el) ? { color: resolveFg(el) } : {}),
    };
  }

  if (type === "IMAGE" && el.props?.src) {
    props = { ...props, src: el.props.src, ...(el.props.alt ? { alt: el.props.alt } : {}) };
  }

  if (type === "RECTANGLE") {
    props = { ...props, ...surfaceProps(el, false) };
  }

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
    props,
    ...layoutPart,
  };

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

  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    const sample = (n: SceneNode, depth: number): unknown =>
      depth > 3
        ? "…"
        : {
            type: n.type,
            bg: (n.props?.backgroundColor as string) ?? null,
            color: (n.props?.color as string) ?? null,
            fontSize: (n.props?.fontSize as number) ?? null,
            kids: (n.children ?? []).map((c) => sample(c, depth + 1)),
          };
    // eslint-disable-next-line no-console
    console.debug("[Haze AI pipeline] parsed layout → scene (sample)", sample(rootFrame, 0));
  }

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
  const styles: AIStyleProps = {};
  if (props.fontSize != null) styles.fontSize = props.fontSize as number;
  if (props.fontWeight != null) styles.fontWeight = props.fontWeight as string | number;
  if (props.textAlign != null) styles.textAlign = props.textAlign as AIStyleProps["textAlign"];
  if (props.borderRadius != null) styles.borderRadius = props.borderRadius as number;
  if (props.boxShadow != null) styles.boxShadow = String(props.boxShadow);
  if (props.padding != null) styles.padding = props.padding as number;
  if (props.paddingTop != null) styles.paddingTop = props.paddingTop as number;

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
    styles: Object.keys(styles).length ? styles : undefined,
    children: (node.children ?? []).map(sceneNodeToAIElement),
    props: type === "icon" ? { iconName: props.iconName } : undefined,
    layoutMode: node.layoutMode,
  };
}

export function sceneNodesToAILayout(nodes: SceneNode[]): AIUILayout {
  if (!nodes.length) {
    return {
      frame: { width: 1440, height: 900, background: "#0f172a", children: [] },
      metadata: { version: "1.0" },
    };
  }
  const root = nodes[0];
  const w = root.width ?? 1440;
  const h = root.height ?? 900;
  const bg = (root.props?.backgroundColor as string) ?? "#0f172a";
  const children = (root.children?.length ? root.children : nodes).map(sceneNodeToAIElement);
  return {
    frame: { width: w, height: h, background: bg, children },
    metadata: { version: "1.0" },
  };
}
