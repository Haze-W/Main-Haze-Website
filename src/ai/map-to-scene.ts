import { nanoid } from "nanoid";
import type { SceneNode } from "@/lib/editor/types";
import type { PipelineStyledData } from "./schema";

type Comp = { type?: string; props?: Record<string, unknown> };

function readStr(props: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const v = props?.[key];
  return typeof v === "string" && v.trim() ? v : fallback;
}

function hexFromProps(props: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const v = props?.[key];
  if (typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim())) return v.trim();
  return fallback;
}

/**
 * Maps pipeline JSON (style + flat components) into Haze scene nodes for the editor canvas.
 */
export function mapPipelineToSceneNodes(data: PipelineStyledData): SceneNode[] {
  const components = (data.components as Comp[]).filter(Boolean);
  const accent = "#6366f1";
  const surface = "#1e293b";
  const rootId = nanoid();

  const children: SceneNode[] = [];
  let y = 24;
  const gap = 16;
  const contentW = Math.min(1200, 1440 - 48);

  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    const raw = (c.type ?? "section").toLowerCase().trim();
    const props = c.props ?? {};
    const label = readStr(props, "label", raw);
    const title = readStr(props, "title", label);

    const base: Omit<SceneNode, "type"> = {
      id: nanoid(),
      name: title,
      x: 24,
      y,
      width: contentW,
      height: 56,
      children: [],
      fills: [{ type: "SOLID", color: hexFromProps(props, "backgroundColor", surface) }],
      layoutMode: "NONE",
    };

    let node: SceneNode;

    switch (raw) {
      case "button":
        node = {
          ...base,
          type: "BUTTON",
          height: 44,
          width: 180,
          fills: [{ type: "SOLID", color: accent }],
          props: { label: title, variant: "primary" },
        };
        break;
      case "input":
        node = {
          ...base,
          type: "INPUT",
          height: 40,
          width: 320,
          fills: [{ type: "SOLID", color: "#0f172a" }],
          props: { placeholder: readStr(props, "placeholder", "Type…") },
        };
        break;
      case "navbar":
      case "topbar":
        node = {
          ...base,
          type: "TOPBAR",
          height: 56,
          width: contentW,
          fills: [{ type: "SOLID", color: hexFromProps(props, "backgroundColor", "#0f172a") }],
          props: { title },
        };
        break;
      case "chart":
        node = {
          ...base,
          type: "RECTANGLE",
          height: 200,
          fills: [{ type: "SOLID", color: "#334155" }],
          props: { kind: "chart", title },
        };
        break;
      case "table":
        node = {
          ...base,
          type: "LIST",
          height: 220,
          fills: [{ type: "SOLID", color: "#1e293b" }],
          props: { kind: "table", title },
        };
        break;
      case "modal":
        node = {
          ...base,
          type: "FRAME",
          height: 280,
          fills: [{ type: "SOLID", color: "#0f172a" }],
          layoutMode: "VERTICAL",
          paddingTop: 16,
          paddingRight: 16,
          paddingBottom: 16,
          paddingLeft: 16,
          itemSpacing: 12,
          props: { kind: "modal", title },
        };
        break;
      case "sidebar":
        node = {
          ...base,
          type: "CONTAINER",
          width: 260,
          height: 400,
          fills: [{ type: "SOLID", color: "#0f172a" }],
          layoutMode: "VERTICAL",
          itemSpacing: 8,
          paddingTop: 16,
          paddingRight: 12,
          paddingBottom: 16,
          paddingLeft: 12,
          props: { kind: "sidebar", title },
        };
        break;
      case "card":
      case "grid":
      case "section":
      default:
        node = {
          ...base,
          type: "CONTAINER",
          height: Math.max(80, Number(props.height) || 120),
          fills: [{ type: "SOLID", color: hexFromProps(props, "backgroundColor", "#1e293b") }],
          layoutMode: "VERTICAL",
          paddingTop: 16,
          paddingRight: 16,
          paddingBottom: 16,
          paddingLeft: 16,
          itemSpacing: 8,
          props: { kind: raw, title, ...props },
        };
    }

    children.push(node);
    y += node.height + gap;
  }

  const root: SceneNode = {
    id: rootId,
    type: "FRAME",
    name: "Generated UI",
    x: 0,
    y: 0,
    width: 1440,
    height: Math.max(900, y + 48),
    children,
    fills: [{ type: "SOLID", color: "#0f172a" }],
    layoutMode: "VERTICAL",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 24,
    paddingLeft: 0,
    itemSpacing: 0,
    props: {
      pipelineStyle: data.style ?? "",
      source: "generate-ui-pipeline",
    },
  };

  return [root];
}
