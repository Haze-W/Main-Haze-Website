/**
 * OpenAI-compatible chat completions — backed by the local Coral engine only.
 * POST /api/ai/chat-completions
 * Body: { messages: { role, content }[], model?: string, stream?: boolean }
 */

import { NextResponse } from "next/server";
import { coralGenerate } from "@/lib/ai/coral-engine";
import { CHAT_SSE_HEADERS } from "@/lib/ai/providers/stream";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, stream } = body as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
      stream?: boolean | string;
    };

    const streamRequested = stream === true || stream === "true";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
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
