/**
 * AI UI Generation API
 * POST /api/ai/generate
 * Body: { prompt: string }
 * Returns: { nodes: SceneNode[] }
 */

import { NextResponse } from "next/server";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";
import { aiLayoutToSceneNodes } from "@/lib/ai/schema/adapter";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" ? body.model : undefined;
    const viewport = ["desktop", "tablet", "mobile"].includes(body.viewport) ? body.viewport : undefined;
    const theme = body.theme && typeof body.theme === "object" ? body.theme : undefined;

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    const layout = await generateLayoutFromPrompt(prompt, { model, viewport, theme });
    const nodes = aiLayoutToSceneNodes(layout);

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
