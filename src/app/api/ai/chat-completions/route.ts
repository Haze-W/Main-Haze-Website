/**
 * Coral 1.0 Chat Completions
 * POST /api/ai/chat-completions
 * Body: { messages: { role, content }[], model?: string }
 *
 * Uses Ollama (local AI). No API keys. Runs on your PC.
 * Used by exported chatbot apps — backend proxies to local Ollama.
 */

import { NextResponse } from "next/server";
import { chatFromOllama } from "@/lib/ai/ollama";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = "llama3" } = body as {
      messages: Array<{ role: string; content: string }>;
      model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const content = await chatFromOllama(
      messages.map((m) => ({ role: m.role, content: m.content })),
      { model: typeof model === "string" ? model : "llama3", temperature: 0.7 }
    );

    return NextResponse.json({ content, role: "assistant" });
  } catch (err) {
    console.error("Chat completions error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: message.includes("fetch") || message.includes("ECONNREFUSED")
          ? "Ollama is not running. Start it with: ollama run llama3"
          : message,
      },
      { status: 500 }
    );
  }
}
