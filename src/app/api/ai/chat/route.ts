/**
 * AI Chat API — supports:
 * - Refine panel: { message, nodes?, model? } → layout refinement
 * - Builder / bottom prompt: { messages, nodes, mode, style?, images? } → Coral + layout generation
 *
 * Cloud AI: ANTHROPIC_API_KEY preferred (callLLM + streaming ask/plan); OPENAI_API_KEY optional fallback.
 */

import { NextResponse } from "next/server";
import { refineLayout } from "@/lib/ai/agent/layout-refiner";
import { aiLayoutToSceneNodes, sceneNodesToAILayout } from "@/lib/ai/schema/adapter";
import type { SceneNode } from "@/lib/editor/types";
import { coralGenerate } from "@/lib/ai/coral-engine";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";
import { callLLM, getAnthropicDefaultModel, getOpenAIDefaultModel } from "@/lib/ai/providers";
import {
  CHAT_SSE_HEADERS,
  anthropicSSEToNormalizedStream,
  fetchAnthropicChatStream,
  fetchOpenAIChatStream,
  openAISSEToNormalizedStream,
} from "@/lib/ai/providers/stream";

function hasCloudAi(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Refine chat (AIChatPanel): explicit string message ─────────
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
      const model = typeof body.model === "string" ? body.model : undefined;

      if (!message) {
        return NextResponse.json({ error: "Missing message" }, { status: 400 });
      }

      const result = await refineLayout(layoutStr, message, { model });

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

    // ── Multi-message builder (BottomAIPrompt, etc.) ────────────────
    const { messages, nodes, projectName, mode, images, style, stream } = body as {
      messages: { role: string; content: string }[];
      nodes: unknown[];
      projectName: string;
      mode: "ui" | "backend" | "agent" | "fix" | "plan" | "ask" | null;
      images?: { dataUrl: string }[];
      style?: "light" | "dark";
      stream?: boolean;
    };

    const wantAskPlanStream = stream === true && (mode === "ask" || mode === "plan");

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    const prompt = (lastUserMessage.content?.trim?.() || String(lastUserMessage.content || "")).trim();

    const askSystem =
      "You are a helpful assistant for the Haze design tool (Figma-style editor for building desktop apps with Tauri). Answer questions about UI/UX, layouts, Tauri, React, and app design. Be concise and practical.";
    const planSystem =
      "You are a UI/UX planning assistant. Create clear, numbered step-by-step plans. Format with **bold** for step titles. Keep plans concise (5-10 steps). End with a brief 'Ready to generate?' if the plan is for UI.";

    if (mode === "ask" && prompt) {
      if (wantAskPlanStream) {
        try {
          if (!hasCloudAi()) {
            return NextResponse.json(
              {
                error:
                  "ANTHROPIC_API_KEY or OPENAI_API_KEY is required for AI chat (streaming uses Anthropic first, then OpenAI).",
              },
              { status: 503 }
            );
          }
          if (process.env.ANTHROPIC_API_KEY) {
            const upstream = await fetchAnthropicChatStream({
              apiKey: process.env.ANTHROPIC_API_KEY,
              messages: [
                { role: "system", content: askSystem },
                { role: "user", content: prompt },
              ],
              model: getAnthropicDefaultModel(),
              temperature: 0.6,
              maxTokens: 1800,
            });
            if (upstream.ok) {
              return new Response(anthropicSSEToNormalizedStream(upstream.body), {
                headers: CHAT_SSE_HEADERS,
              });
            }
            const t = await upstream.text().catch(() => "");
            if (!process.env.OPENAI_API_KEY) {
              return NextResponse.json(
                { error: t || "Anthropic stream failed" },
                { status: upstream.status }
              );
            }
          }
          if (process.env.OPENAI_API_KEY) {
            const upstream = await fetchOpenAIChatStream({
              apiKey: process.env.OPENAI_API_KEY,
              messages: [
                { role: "system", content: askSystem },
                { role: "user", content: prompt },
              ],
              model: getOpenAIDefaultModel(),
              temperature: 0.6,
              maxTokens: 1800,
            });
            if (!upstream.ok) {
              const t = await upstream.text().catch(() => "");
              return NextResponse.json(
                { error: t || "OpenAI stream failed" },
                { status: upstream.status }
              );
            }
            return new Response(openAISSEToNormalizedStream(upstream.body), {
              headers: CHAT_SSE_HEADERS,
            });
          }
        } catch (err) {
          console.error("Ask stream error:", err);
        }
      }
      try {
        if (!hasCloudAi()) {
          return NextResponse.json(
            { error: "OPENAI_API_KEY or ANTHROPIC_API_KEY is required for AI chat." },
            { status: 503 }
          );
        }
        const { content: c } = await callLLM({
          messages: [
            { role: "system", content: askSystem },
            { role: "user", content: prompt },
          ],
          model: getOpenAIDefaultModel(),
          temperature: 0.6,
          maxTokens: 1800,
        });
        if (c) {
          return NextResponse.json({ action: "ANSWER", text: c });
        }
      } catch (err) {
        console.error("Ask mode error:", err);
      }
    }

    if (mode === "plan" && prompt) {
      if (wantAskPlanStream) {
        try {
          if (!hasCloudAi()) {
            return NextResponse.json(
              {
                error:
                  "ANTHROPIC_API_KEY or OPENAI_API_KEY is required for AI chat (streaming uses Anthropic first, then OpenAI).",
              },
              { status: 503 }
            );
          }
          if (process.env.ANTHROPIC_API_KEY) {
            const upstream = await fetchAnthropicChatStream({
              apiKey: process.env.ANTHROPIC_API_KEY,
              messages: [
                { role: "system", content: planSystem },
                { role: "user", content: `Create a step-by-step plan for: ${prompt}` },
              ],
              model: getAnthropicDefaultModel(),
              temperature: 0.5,
              maxTokens: 1800,
            });
            if (upstream.ok) {
              return new Response(anthropicSSEToNormalizedStream(upstream.body), {
                headers: CHAT_SSE_HEADERS,
              });
            }
            const t = await upstream.text().catch(() => "");
            if (!process.env.OPENAI_API_KEY) {
              return NextResponse.json(
                { error: t || "Anthropic stream failed" },
                { status: upstream.status }
              );
            }
          }
          if (process.env.OPENAI_API_KEY) {
            const upstream = await fetchOpenAIChatStream({
              apiKey: process.env.OPENAI_API_KEY,
              messages: [
                { role: "system", content: planSystem },
                { role: "user", content: `Create a step-by-step plan for: ${prompt}` },
              ],
              model: getOpenAIDefaultModel(),
              temperature: 0.5,
              maxTokens: 1800,
            });
            if (!upstream.ok) {
              const t = await upstream.text().catch(() => "");
              return NextResponse.json(
                { error: t || "OpenAI stream failed" },
                { status: upstream.status }
              );
            }
            return new Response(openAISSEToNormalizedStream(upstream.body), {
              headers: CHAT_SSE_HEADERS,
            });
          }
        } catch (err) {
          console.error("Plan stream error:", err);
        }
      }
      try {
        if (!hasCloudAi()) {
          return NextResponse.json(
            { error: "ANTHROPIC_API_KEY or OPENAI_API_KEY is required for AI chat." },
            { status: 503 }
          );
        }
        const { content: c } = await callLLM({
          messages: [
            { role: "system", content: planSystem },
            { role: "user", content: `Create a step-by-step plan for: ${prompt}` },
          ],
          model: getOpenAIDefaultModel(),
          temperature: 0.5,
          maxTokens: 1800,
        });
        if (c) {
          return NextResponse.json({ action: "ANSWER", text: c });
        }
      } catch (err) {
        console.error("Plan mode error:", err);
      }
    }

    if (mode === "ui" && (prompt || (images && images.length > 0))) {
      const imageUrls = images?.map((i) => i.dataUrl).filter(Boolean) ?? [];
      try {
        const layout = await generateLayoutFromPrompt(prompt || "Create a layout using the attached image(s).", {
          style: style ?? "dark",
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });
        const sceneNodes = aiLayoutToSceneNodes(layout);
        return NextResponse.json({
          action: "GENERATE_UI",
          text: "Generated UI based on your request. Review and adjust as needed.",
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
    console.error("AI chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
