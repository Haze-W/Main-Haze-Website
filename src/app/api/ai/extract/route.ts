/**
 * AI Screenshot Extraction API
 * POST /api/ai/extract
 * Body: { image: string (base64 or data URL) }
 * Returns: { nodes: SceneNode[], metadata?: object }
 */

import { NextResponse } from "next/server";
import { extractLayoutFromScreenshot } from "@/lib/ai/agent/screenshot-extractor";
import { aiLayoutToSceneNodes } from "@/lib/ai/schema/adapter";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const model = typeof body.model === "string" ? body.model : undefined;

    if (!image) {
      return NextResponse.json(
        { error: "Missing or invalid image (base64 or data URL required)" },
        { status: 400 }
      );
    }

    const base64Length = image.replace(/^data:image\/\w+;base64,/, "").length;
    const estimatedBytes = (base64Length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 4MB." },
        { status: 400 }
      );
    }

    const layout = await extractLayoutFromScreenshot(image, { model });
    const nodes = aiLayoutToSceneNodes(layout);

    return NextResponse.json({
      nodes,
      metadata: layout.metadata,
    });
  } catch (err) {
    console.error("AI extract error:", err);
    const message = err instanceof Error ? err.message : "Failed to extract layout from screenshot";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
