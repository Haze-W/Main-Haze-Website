/**
 * AI UI Generation API
 * POST /api/ai/generate
 * Body: { prompt: string }
 * Returns: { nodes: SceneNode[] }
 */

import { NextResponse } from "next/server";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";
import { aiLayoutToSceneNodes } from "@/lib/ai/schema/adapter";
import type { SceneNode } from "@/lib/editor/types";

type AINode = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  color?: string;
  text?: string;
  styles?: Record<string, unknown>;
  props?: Record<string, unknown>;
  children?: AINode[];
};

function titleCase(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapAITypeToEditorType(aiType: string, hasChildren: boolean): SceneNode["type"] {
  const t = aiType.toLowerCase();
  if (t === "text") return "TEXT";
  if (t === "icon") return "ICON";
  if (t === "button") return "BUTTON";
  if (t === "input") return "INPUT";
  if (hasChildren) return "FRAME";
  return "CONTAINER";
}

function aiNodeToSceneNode(n: AINode): SceneNode {
  const hasChildren = (n.children?.length ?? 0) > 0;
  const type = mapAITypeToEditorType(n.type, hasChildren);

  const props: Record<string, unknown> = {
    ...(n.props ?? {}),
    ...(n.styles ? { ...n.styles } : {}),
  };

  if (n.backgroundColor && props.backgroundColor === undefined) props.backgroundColor = n.backgroundColor;
  if (n.color && props.color === undefined) props.color = n.color;

  if (type === "TEXT") {
    if (props.content === undefined) props.content = n.text ?? "";
  }
  if (type === "ICON") {
    if (props.iconName === undefined) props.iconName = (n.props as any)?.iconName;
    if (props.color === undefined && n.color) props.color = n.color;
  }
  if (type === "BUTTON") {
    const labelFromAI = (n.props as any)?.text;
    if (props.label === undefined) props.label = typeof labelFromAI === "string" ? labelFromAI : "Button";
    if (props.backgroundColor === undefined && n.backgroundColor) props.backgroundColor = n.backgroundColor;
  }

  const name =
    type === "TEXT"
      ? (typeof props.content === "string" && props.content.trim() ? "Text" : "Text")
      : type === "ICON"
        ? "Icon"
        : type === "BUTTON"
          ? "Button"
          : hasChildren
            ? titleCase(n.type || "Frame")
            : titleCase(n.type || "Layer");

  return {
    id: n.id,
    type,
    name,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    visible: true,
    locked: false,
    opacity: 1,
    props,
    children: (n.children ?? []).map(aiNodeToSceneNode),
  };
}

function aiNodesToEditorScene(
  nodes: AINode[],
  frame: { width?: number; height?: number; background?: string } | undefined
): SceneNode[] {
  // Wrap the layout in a single frame so nested children render properly.
  const frameChildren = nodes.map(aiNodeToSceneNode);
  const bg = typeof frame?.background === "string" && frame.background.trim() ? frame.background.trim() : "#f8fafc";
  const width = typeof frame?.width === "number" && frame.width > 0 ? frame.width : 1440;
  const height = typeof frame?.height === "number" && frame.height > 0 ? frame.height : 900;
  return [
    {
      id: "ai_frame",
      type: "FRAME",
      name: "AI Layout",
      x: 0,
      y: 0,
      width,
      height,
      visible: true,
      locked: false,
      opacity: 1,
      props: { backgroundColor: bg, borderRadius: 10 },
      overflow: "HIDDEN",
      children: frameChildren,
    },
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" ? body.model : undefined;

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    const layout = await generateLayoutFromPrompt(prompt, { model });
    const aiNodes = aiLayoutToSceneNodes(layout) as unknown as AINode[];
    const nodes = aiNodesToEditorScene(aiNodes, layout.frame);

    return NextResponse.json({
      nodes,
      metadata: layout.metadata,
    });
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json(
      { error: "Failed to generate UI" },
      { status: 500 }
    );
  }
}
