/**
 * Haze agent API — layout/refine + Claude/OpenAI when keys are set, else Coral templates.
 */

import { NextResponse } from "next/server";
import { refineLayout } from "@/lib/ai/agent/layout-refiner";
import { aiLayoutToSceneNodes, sceneNodesToAILayout } from "@/lib/ai/schema/adapter";
import type { SceneNode } from "@/lib/editor/types";
import { coralGenerate } from "@/lib/ai/coral-engine";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";
import { callLLM, getAnthropicApiKeyFromEnv } from "@/lib/ai/providers";
import {
  buildLlmChatMessages,
  llmTextToCoralResponse,
  type ChatSlashMode,
} from "@/lib/ai/chat-modes";

function hasCloudLlm(): boolean {
  return !!(getAnthropicApiKeyFromEnv() || process.env.OPENAI_API_KEY?.trim());
}

function normalizeChatMode(mode: string | null | undefined): string | null {
  if (mode === "backend") return "code";
  return mode ?? null;
}

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
      mode: "ui" | "backend" | "code" | "agent" | "fix" | "plan" | "ask" | null;
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

    const normalizedMode = normalizeChatMode(mode) || "agent";

    if (normalizedMode === "ui" && (prompt || (images && images.length > 0))) {
      const imageUrls = images?.map((i) => i.dataUrl).filter(Boolean) ?? [];
      try {
        const layout = await generateLayoutFromPrompt(prompt || "Create a layout using the attached reference.", {
          style: style ?? "dark",
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });
        const sceneNodes = aiLayoutToSceneNodes(layout);
        const cloud = hasCloudLlm();
        return NextResponse.json({
          action: "GENERATE_UI",
          text: cloud
            ? "Generated UI from your prompt. Refine spacing and copy in Design, or iterate in Chat."
            : "Generated a layout using the local fallback. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for full LLM-driven UI.",
          nodes: sceneNodes,
        });
      } catch (err) {
        console.error("Layout generation error:", err);
      }
    }

    const llmModes = ["agent", "code", "ask", "plan"] as const;
    if (
      hasCloudLlm() &&
      llmModes.includes(normalizedMode as (typeof llmModes)[number])
    ) {
      try {
        const chatMessages = buildLlmChatMessages(
          normalizedMode as "agent" | "code" | "ask" | "plan",
          messages
        );
        const { content } = await callLLM({
          messages: chatMessages,
          temperature: normalizedMode === "code" ? 0.25 : 0.5,
          maxTokens: normalizedMode === "code" ? 8192 : 4096,
        });
        const result = llmTextToCoralResponse(normalizedMode as ChatSlashMode, content);
        return NextResponse.json(result);
      } catch (err) {
        console.warn("[chat] LLM mode failed, falling back to Coral:", err);
      }
    }

    const coralMode =
      normalizedMode === "code" ? "code" : mode === "backend" ? "code" : mode;

    const result = coralGenerate({
      prompt: prompt || "(describe what you want)",
      mode: coralMode as Parameters<typeof coralGenerate>[0]["mode"],
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
