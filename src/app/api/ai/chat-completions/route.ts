/**
 * Chat completions — Anthropic-first streaming + callLLM (Anthropic then OpenAI).
 * POST /api/ai/chat-completions
 * Body: { messages: { role, content }[], model?: string, stream?: boolean }
 */

import { NextResponse } from "next/server";
import { callLLM, getAnthropicDefaultModel, getOpenAIDefaultModel } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/ai/providers";
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

function toChatMessages(
  raw: Array<{ role: string; content: string }>
): ChatMessage[] {
  return raw.map((m) => {
    const role = m.role === "system" || m.role === "assistant" ? m.role : "user";
    return { role, content: String(m.content ?? "") };
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model, stream } = body as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      stream?: boolean;
    };

    const streamRequested = stream === true || stream === "true";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const resolvedModel =
      typeof model === "string" && model.trim() ? model.trim() : getOpenAIDefaultModel();

    if (!hasCloudAi()) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY or OPENAI_API_KEY is required for chat completions.",
        },
        { status: 503 }
      );
    }

    if (streamRequested) {
      if (process.env.ANTHROPIC_API_KEY) {
        const upstream = await fetchAnthropicChatStream({
          apiKey: process.env.ANTHROPIC_API_KEY,
          messages: toChatMessages(messages),
          model: resolvedModel,
          temperature: 0.7,
          maxTokens: 2048,
        });
        if (upstream.ok) {
          return new Response(anthropicSSEToNormalizedStream(upstream.body), {
            headers: CHAT_SSE_HEADERS,
          });
        }
        const errText = await upstream.text().catch(() => "");
        if (!process.env.OPENAI_API_KEY) {
          return NextResponse.json(
            { error: errText || upstream.statusText || "Anthropic stream failed" },
            { status: upstream.status }
          );
        }
      }
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          {
            error:
              "Streaming requires ANTHROPIC_API_KEY or OPENAI_API_KEY (Anthropic is tried first).",
          },
          { status: 503 }
        );
      }
      const upstream = await fetchOpenAIChatStream({
        apiKey: process.env.OPENAI_API_KEY,
        messages: toChatMessages(messages),
        model: resolvedModel,
        temperature: 0.7,
        maxTokens: 2048,
      });
      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => "");
        return NextResponse.json(
          { error: errText || upstream.statusText || "OpenAI stream failed" },
          { status: upstream.status }
        );
      }
      return new Response(openAISSEToNormalizedStream(upstream.body), {
        headers: CHAT_SSE_HEADERS,
      });
    }

    const { content } = await callLLM({
      messages: toChatMessages(messages),
      model: resolvedModel,
      temperature: 0.7,
      maxTokens: 2048,
    });
    return NextResponse.json({ content, role: "assistant" });
  } catch (err) {
    console.error("Chat completions error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
