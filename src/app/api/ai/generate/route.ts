/**
 * AI UI Generation API
 * POST /api/ai/generate
 * Body: { prompt: string, model?: string, style?: "light" | "dark", runtimeTarget?: string, languageTarget?: string }
 * Returns: { nodes: SceneNode[] }
 */

import { NextResponse } from "next/server";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";
import { aiLayoutToSceneNodes } from "@/lib/ai/schema/adapter";
import { coralGenerate } from "@/lib/ai/coral-engine";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const requestTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

export async function POST(req: Request) {
  let promptText = "";
  try {
<<<<<<< HEAD
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" ? body.model : undefined;
    const viewport = ["desktop", "tablet", "mobile"].includes(body.viewport) ? body.viewport : undefined;
    const theme = body.theme && typeof body.theme === "object" ? body.theme : undefined;
=======
    if (!checkRateLimit()) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 }
      );
    }
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2

    const body = await req.json();
    promptText = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const model = typeof body.model === "string" ? body.model : undefined;
    const style = body.style === "light" || body.style === "dark" ? body.style : undefined;
    const runtimeTarget = typeof body.runtimeTarget === "string" ? body.runtimeTarget : undefined;
    const languageTarget = typeof body.languageTarget === "string" ? body.languageTarget : undefined;

    if (!promptText) {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

<<<<<<< HEAD
    const layout = await generateLayoutFromPrompt(prompt, { model, viewport, theme });
=======
    // Coral 1.0 (Ollama) — always try AI layout first
    const layout = await generateLayoutFromPrompt(promptText, {
      model,
      style,
      runtimeTarget,
      languageTarget,
    });
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
    const nodes = aiLayoutToSceneNodes(layout);

    return NextResponse.json({
      nodes,
      metadata: layout.metadata,
    });
  } catch (err) {
    // Fallback to Coral (rule-based) when Ollama fails
    const coralResult = coralGenerate({
      prompt: promptText || "(describe what you want)",
      mode: "ui",
      nodes: [],
      projectName: "Untitled",
    });
    if (coralResult.action === "GENERATE_UI" && coralResult.nodes && coralResult.nodes.length > 0) {
      return NextResponse.json({
        nodes: coralResult.nodes,
        metadata: { source: "coral", generatedAt: new Date().toISOString() },
      });
    }
    console.error("AI generate error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message.includes("abort") ? "Request timed out. Please try again." : "Failed to generate UI" },
      { status: 500 }
    );
  }
}
