/**
 * AI Theme Generation API
 * POST /api/ai/theme
 * Body: { prompt: string }
 * Returns: { theme: DesignTheme }
 */

import { NextResponse } from "next/server";
import { generateThemeFromPrompt } from "@/lib/ai/agent/theme-generator";

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

    const theme = await generateThemeFromPrompt(prompt, { model });
    return NextResponse.json({ theme });
  } catch (err) {
    console.error("AI theme error:", err);
    return NextResponse.json(
      { error: "Failed to generate theme" },
      { status: 500 }
    );
  }
}
