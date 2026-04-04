import { NextResponse } from "next/server";
import { refineLayout } from "@/lib/ai/agent/layout-refiner";
import { aiLayoutToSceneNodes, sceneNodesToAILayout } from "@/lib/ai/schema/adapter";
import type { SceneNode } from "@/lib/editor/types";
import { callLLM, getAnthropicApiKeyFromEnv } from "@/lib/ai/providers";

function hasCloudLlm(): boolean {
return !!getAnthropicApiKeyFromEnv();
}

function normalizeChatMode(mode: string | null | undefined): string | null {
if (mode === "backend") return "code";
return mode ?? null;
}

export async function POST(req: Request) {
try {
const body = await req.json();

// ---------------- REFINE MODE ----------------
if (typeof body.message === "string") {
  let layoutStr: string;

  if (body.nodes && Array.isArray(body.nodes) && body.nodes.length > 0) {
    const layout = sceneNodesToAILayout(body.nodes as SceneNode[]);
    layoutStr = JSON.stringify(layout);
  } else {
    layoutStr = JSON.stringify({
      frame: { width: 1440, height: 900, background: "#f8fafc", children: [] },
    });
  }

  const message = body.message.trim();
  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const result = await refineLayout(layoutStr, message);

  if ("layout" in result) {
    return NextResponse.json({
      layout: result.layout,
      nodes: aiLayoutToSceneNodes(result.layout),
      response: result.response,
    });
  }

  return NextResponse.json({ suggestion: result.suggestion });
}

// ---------------- MAIN GENERATION ----------------
const { messages, mode } = body;

if (!messages || messages.length === 0) {
  return NextResponse.json({ error: "No messages provided" }, { status: 400 });
}

const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
const prompt = lastUserMessage?.content?.trim();

if (!prompt) {
  return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
}

const normalizedMode = normalizeChatMode(mode) || "agent";

// ---------------- UI GENERATION ----------------
if (normalizedMode === "ui") {
  if (!hasCloudLlm()) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY" },
      { status: 400 }
    );
  }

  try {
    const seed = Math.random().toString(36).substring(7);

    const response = await callLLM({
      messages: [
        {
          role: "user",
          content:
            "You are an elite UI generator like Lovable.dev.\n\n" +
            "User request:\n" +
            `"${prompt}"\n\n` +
            "RULES:\n" +
            "- Follow the request EXACTLY\n" +
            "- Do NOT default to dashboards\n" +
            "- Generate a UNIQUE layout every time\n" +
            "- Include features from the prompt\n\n" +
            "Variation seed: " + seed + "\n\n" +
            "Return ONLY JSON:\n" +
            "{\n" +
            '  "frame": {\n' +
            '    "width": 1440,\n' +
            '    "height": 900,\n' +
            '    "background": "#ffffff",\n' +
            '    "children": []\n' +
            "  }\n" +
            "}"
        }
      ],
      temperature: 0.9,
      maxTokens: 4000
    });

    const cleaned = response.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/\n/g, " ")
      .trim();

    let layout;
    try {
      layout = JSON.parse(cleaned);
    } catch {
      console.error("Bad JSON:", cleaned);
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    return NextResponse.json({
      action: "GENERATE_UI",
      text: "Generated with AI",
      nodes: aiLayoutToSceneNodes(layout),
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}

// ---------------- FALLBACK ----------------
return NextResponse.json({
  text: "Non-UI mode not implemented",
});

} catch (err) {
console.error(err);
return NextResponse.json({ error: "Server error" }, { status: 500 });
}
}
