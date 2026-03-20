/**
 * Chat completions — OpenAI Chat Completions API when OPENAI_API_KEY is set, else Ollama.
 * POST /api/ai/chat-completions
 * Body: { messages: { role, content }[], model?: string, stream?: boolean }
 *
 * Non-stream: JSON { content, role }.
 * stream: true: text/event-stream (normalized SSE: content + reasoning deltas).
 */

import { NextResponse } from "next/server";
import { chatFromOllama, chatStreamFromOllama } from "@/lib/ai/ollama";
import { callLLM, getOpenAIDefaultModel } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/ai/providers";
import {
  CHAT_SSE_HEADERS,
  fetchOpenAIChatStream,
  ollamaNDJSONToNormalizedStream,
  openAISSEToNormalizedStream,
} from "@/lib/ai/providers/stream";

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

    if (streamRequested) {
      if (process.env.OPENAI_API_KEY) {
        const upstream = await fetchOpenAIChatStream({
          apiKey: process.env.OPENAI_API_KEY,
          messages: toChatMessages(messages),
          model: resolvedModel,
          temperature: 0.7,
          maxTokens: 4096,
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

      const ol = await chatStreamFromOllama(
        messages.map((m) => ({ role: m.role, content: m.content })),
        { model: resolvedModel, temperature: 0.7 }
      );
      return new Response(ollamaNDJSONToNormalizedStream(ol.body), {
        headers: CHAT_SSE_HEADERS,
      });
    }

    if (process.env.OPENAI_API_KEY) {
      const { content } = await callLLM({
        messages: toChatMessages(messages),
        model: resolvedModel,
        temperature: 0.7,
        maxTokens: 4096,
      });
      return NextResponse.json({ content, role: "assistant" });
    }

    const content = await chatFromOllama(
      messages.map((m) => ({ role: m.role, content: m.content })),
      { model: resolvedModel, temperature: 0.7 }
    );

    return NextResponse.json({ content, role: "assistant" });
  } catch (err) {
    console.error("Chat completions error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const isLocal =
      message.includes("fetch") ||
      message.includes("ECONNREFUSED") ||
      message.includes("Ollama");
    return NextResponse.json(
      {
        error:
          !process.env.OPENAI_API_KEY && isLocal
            ? "Ollama is not running. Start it with: ollama run llama3"
            : message,
      },
      { status: 500 }
    );
  }
}
