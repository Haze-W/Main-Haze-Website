/**
 * Haze local agent API — Coral engine + deterministic layout/refine (no external APIs).
 */

import { NextResponse } from "next/server";
import { refineLayout } from "@/lib/ai/agent/layout-refiner";
import { aiLayoutToSceneNodes, sceneNodesToAILayout } from "@/lib/ai/schema/adapter";
import type { SceneNode } from "@/lib/editor/types";
import { coralGenerate } from "@/lib/ai/coral-engine";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Refine (AIChatPanel): { message, nodes? } ─────────────────
    if (typeof body.message === "string") {
      let layoutStr: string;
      if (body.nodes && Array.isArray(body.nodes) && body.nodes.length > 0) {
        const layout = sceneNodesToAILayout(body.nodes as SceneNode[]);
        layoutStr = JSON.stringify(layout);
      } else {
        layoutStr =
          typeof body.layout === "string"
            ? body.layout
            : JSON.stringify(
                body.layout ?? {
                  frame: { width: 1440, height: 900, background: "#f8fafc", children: [] },
                }
              );
      }
      const message = body.message.trim();
      if (!message) {
        return NextResponse.json({ error: "Missing message" }, { status: 400 });
      }

      const result = await refineLayout(layoutStr, message);

      if ("layout" in result) {
        const nodes = aiLayoutToSceneNodes(result.layout);
        return NextResponse.json({
          layout: result.layout,
          nodes,
          response: result.response,
          suggestion: result.response,
        });
      }
      return NextResponse.json({ suggestion: result.suggestion });
    }

    // ── Multi-message (AIPanel, Bottom bar) ───────────────────────
    const { messages, nodes, projectName, mode, images, style } = body as {
      messages: { role: string; content: string }[];
      nodes: unknown[];
      projectName: string;
      mode: "ui" | "backend" | "agent" | "fix" | "plan" | "ask" | null;
      images?: { dataUrl: string }[];
      style?: "light" | "dark";
      stream?: boolean;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    const prompt = (lastUserMessage.content?.trim?.() || String(lastUserMessage.content || "")).trim();

    if (mode === "ui" && (prompt || (images && images.length > 0))) {
      const imageUrls = images?.map((i) => i.dataUrl).filter(Boolean) ?? [];
      try {
        const layout = await generateLayoutFromPrompt(prompt || "Create a layout using the attached reference.", {
          style: style ?? "dark",
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });
        const sceneNodes = aiLayoutToSceneNodes(layout);
        return NextResponse.json({
          action: "GENERATE_UI",
          text: "Generated UI locally from your request with Coral (no cloud). Tweak colors and refine it in the editor.",
          nodes: sceneNodes,
        });
      } catch (err) {
        console.error("Layout generation error:", err);
      }
    }

    const result = coralGenerate({
      prompt: prompt || "(describe what you want)",
      mode,
      nodes: (nodes ?? []) as Parameters<typeof coralGenerate>[0]["nodes"],
      projectName: projectName ?? "Untitled",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Agent chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
