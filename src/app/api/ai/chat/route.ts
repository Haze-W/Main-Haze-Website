/**
 * AI Chat / Refine API
 * POST /api/ai/chat
 * Body: { layout?: string, nodes?: SceneNode[], message: string }
 * Returns: { layout?: AIUILayout, nodes?: SceneNode[], suggestion?: string }
 */

import { NextResponse } from "next/server";
import { refineLayout } from "@/lib/ai/agent/layout-refiner";
import { aiLayoutToSceneNodes, sceneNodesToAILayout } from "@/lib/ai/schema/adapter";
import type { SceneNode } from "@/lib/editor/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let layoutStr: string;
    if (body.nodes && Array.isArray(body.nodes) && body.nodes.length > 0) {
      const layout = sceneNodesToAILayout(body.nodes as SceneNode[]);
      layoutStr = JSON.stringify(layout);
    } else {
      layoutStr = typeof body.layout === "string" ? body.layout : JSON.stringify(body.layout ?? { frame: { width: 1440, height: 900, background: "#f8fafc", children: [] } });
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const model = typeof body.model === "string" ? body.model : undefined;

    if (!message) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400 }
      );
    }

    const result = await refineLayout(layoutStr, message, { model });

    if ("layout" in result) {
      const nodes = aiLayoutToSceneNodes(result.layout);
      return NextResponse.json({
        layout: result.layout,
        nodes,
        response: result.response,
      });
    }
    return NextResponse.json({ suggestion: result.suggestion });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: "Failed to refine layout" },
      { status: 500 }
    );
  }
}
