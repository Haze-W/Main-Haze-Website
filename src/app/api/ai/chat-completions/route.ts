/**
 * OpenAI Chat Completions Proxy
 * POST /api/ai/chat-completions
 * Body: { messages: { role, content }[], apiKey?: string, model?: string }
 *
 * Proxies to OpenAI. If apiKey is provided, uses it. Otherwise uses OPENAI_API_KEY from env.
 * Used by exported chatbot apps so users can add their own GPT key.
 */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, apiKey: userApiKey, model = "gpt-4o" } = body as {
      messages: Array<{ role: string; content: string }>;
      apiKey?: string;
      model?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const apiKey = (userApiKey && typeof userApiKey === "string" ? userApiKey.trim() : null)
      || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key required. Add your key in Settings or set OPENAI_API_KEY on the server." },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: typeof model === "string" ? model : "gpt-4o",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      const status = response.status;
      if (status === 401) {
        return NextResponse.json(
          { error: "Invalid API key. Check your OpenAI key in Settings." },
          { status: 401 }
        );
      }
      if (status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Try again in a moment." },
          { status: 429 }
        );
      }
      console.error("OpenAI API error:", err);
      return NextResponse.json(
        { error: err || "OpenAI request failed" },
        { status: status >= 400 ? status : 500 }
      );
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ content, role: "assistant" });
  } catch (err) {
    console.error("Chat completions error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
