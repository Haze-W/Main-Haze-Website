/**
 * OpenAI-compatible chat completions — Claude (Anthropic) first, then OpenAI, else Coral.
 * POST /api/ai/chat-completions
 * Body: { messages: { role, content }[], model?: string, stream?: boolean }
 */

import { NextResponse } from "next/server";
import { coralGenerate } from "@/lib/ai/coral-engine";
import {
  CHAT_SSE_HEADERS,
  fetchAnthropicChatStream,
  anthropicSSEToNormalizedStream,
  fetchOpenAIChatStream,
  openAISSEToNormalizedStream,
} from "@/lib/ai/providers/stream";
import { callLLM, getAnthropicApiKeyFromEnv, type ChatMessage } from "@/lib/ai/providers";

function toChatMessages(messages: Array<{ role: string; content: string }>): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m.content !== "string") continue;
    const role = m.role;
    if (role === "system" || role === "user" || role === "assistant") {
      out.push({ role, content: m.content });
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, stream, model } = body as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      stream?: boolean | string;
    };

    const streamRequested = stream === true || stream === "true";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const chatMessages = toChatMessages(messages);
    if (chatMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages provided" }, { status: 400 });
    }

    const anthropicKey = getAnthropicApiKeyFromEnv();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (anthropicKey || openaiKey) {
      if (streamRequested) {
        if (anthropicKey) {
          const upstream = await fetchAnthropicChatStream({
            apiKey: anthropicKey,
            messages: chatMessages,
            model,
          });
          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            return NextResponse.json(
              { error: `Anthropic: ${upstream.status} ${errText.slice(0, 200)}` },
              { status: upstream.status >= 400 ? upstream.status : 500 }
            );
          }
          return new Response(anthropicSSEToNormalizedStream(upstream.body), {
            headers: CHAT_SSE_HEADERS,
          });
        }
        const upstream = await fetchOpenAIChatStream({
          apiKey: openaiKey!,
          messages: chatMessages,
          model,
        });
        if (!upstream.ok) {
          const errText = await upstream.text().catch(() => "");
          return NextResponse.json(
            { error: `OpenAI-compatible API: ${upstream.status} ${errText.slice(0, 200)}` },
            { status: upstream.status >= 400 ? upstream.status : 500 }
          );
        }
        return new Response(openAISSEToNormalizedStream(upstream.body), {
          headers: CHAT_SSE_HEADERS,
        });
      }

      const { content } = await callLLM({
        messages: chatMessages,
        model,
        maxTokens: 4096,
        temperature: 0.7,
      });
      return NextResponse.json({ content, role: "assistant" });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const prompt = String(lastUser?.content ?? "").trim() || "Hello";

    const result = coralGenerate({
      prompt,
      mode: "ask",
      nodes: [],
      projectName: "Chat",
    });

    const text = result.text || "";

    if (streamRequested) {
      const enc = new TextEncoder();
      const streamOut = new ReadableStream({
        start(controller) {
          controller.enqueue(
            enc.encode(`data: ${JSON.stringify({ content: text, reasoning: "" })}\n\n`)
          );
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        },
      });
      return new Response(streamOut, { headers: CHAT_SSE_HEADERS });
    }

    return NextResponse.json({ content: text, role: "assistant" });
  } catch (err) {
    console.error("Chat completions error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
