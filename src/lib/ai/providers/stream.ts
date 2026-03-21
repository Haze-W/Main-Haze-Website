/**
 * OpenAI + Anthropic streaming (SSE) — parses upstream chunks and exposes
 * normalized deltas: content + reasoning (OpenAI reasoning fields; Anthropic text only).
 */

import {
  getOpenAIChatCompletionsUrl,
  resolveAnthropicModel,
  resolveOpenAIModel,
  type ChatMessage,
} from "./index";

export type NormalizedStreamDelta = {
  content: string;
  reasoning: string;
};

function buildMessages(
  messages: ChatMessage[],
  systemPrompt?: string,
  userMessage?: string
): Array<{ role: string; content: string }> {
  if (messages?.length) {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }
  const msgs: Array<{ role: string; content: string }> = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  if (userMessage) msgs.push({ role: "user", content: userMessage });
  return msgs;
}

export interface OpenAIStreamRequest {
  apiKey: string;
  model?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  userMessage?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * POST to OpenAI (or compatible) chat/completions with stream: true.
 */
export async function fetchOpenAIChatStream(req: OpenAIStreamRequest): Promise<Response> {
  const model = resolveOpenAIModel(req.model);
  const messages = buildMessages(req.messages ?? [], req.systemPrompt, req.userMessage);
  if (!messages.length) throw new Error("No messages provided");

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: req.temperature ?? 0.25,
    max_tokens: req.maxTokens ?? 4096,
  };

  return fetch(getOpenAIChatCompletionsUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Extract incremental text from one OpenAI-style chat.completion.chunk JSON line.
 */
export function extractDeltaFromChunkJson(json: unknown): NormalizedStreamDelta {
  const obj = json as {
    choices?: Array<{
      delta?: {
        content?: string | null;
        reasoning_content?: string | null;
        reasoning?: string | null;
      };
    }>;
  };
  const delta = obj.choices?.[0]?.delta;
  if (!delta) return { content: "", reasoning: "" };

  const content = typeof delta.content === "string" ? delta.content : "";
  const reasoning =
    typeof delta.reasoning_content === "string"
      ? delta.reasoning_content
      : typeof delta.reasoning === "string"
        ? delta.reasoning
        : "";

  return { content, reasoning };
}

/**
 * Transform an OpenAI SSE body into our SSE stream:
 * each event: `data: {"content":"...","reasoning":"..."}\n\n`
 * Final: `data: {"done":true}\n\n`
 */
export function openAISSEToNormalizedStream(upstreamBody: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> {
  if (!upstreamBody) {
    return new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "No response body" })}\n\n`));
        controller.close();
      },
    });
  }

  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = "";

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const parts = lineBuffer.split("\n");
          lineBuffer = parts.pop() ?? "";
          for (const rawLine of parts) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as unknown;
              const { content, reasoning } = extractDeltaFromChunkJson(json);
              if (content || reasoning) {
                controller.enqueue(
                  enc.encode(`data: ${JSON.stringify({ content, reasoning })}\n\n`)
                );
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

export interface AnthropicStreamRequest {
  apiKey: string;
  model?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  userMessage?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * POST to Anthropic Messages API with stream: true (SSE).
 */
export async function fetchAnthropicChatStream(req: AnthropicStreamRequest): Promise<Response> {
  const model = resolveAnthropicModel(req.model);
  const messages = buildMessages(req.messages ?? [], req.systemPrompt, req.userMessage);
  if (!messages.length) throw new Error("No messages provided");

  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const anthropicMessages = userMessages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  const body = {
    model,
    max_tokens: req.maxTokens ?? 4096,
    stream: true,
    system: systemMsg?.content ?? "",
    messages: anthropicMessages.length
      ? anthropicMessages
      : [{ role: "user" as const, content: req.userMessage ?? "" }],
    temperature: req.temperature ?? 0.25,
  };

  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

/**
 * Extract incremental text from one Anthropic stream event JSON object.
 */
export function extractAnthropicDeltaFromJson(json: unknown): NormalizedStreamDelta {
  const obj = json as {
    type?: string;
    delta?: { type?: string; text?: string };
  };
  if (
    obj.type === "content_block_delta" &&
    obj.delta?.type === "text_delta" &&
    typeof obj.delta.text === "string"
  ) {
    return { content: obj.delta.text, reasoning: "" };
  }
  return { content: "", reasoning: "" };
}

function isAnthropicStreamError(json: unknown): string | null {
  const obj = json as { type?: string; error?: { message?: string } };
  if (obj.type === "error" && obj.error?.message) return obj.error.message;
  return null;
}

/**
 * Transform an Anthropic Messages SSE body into the same normalized stream as OpenAI.
 */
export function anthropicSSEToNormalizedStream(upstreamBody: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> {
  if (!upstreamBody) {
    return new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "No response body" })}\n\n`));
        controller.close();
      },
    });
  }

  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = "";

  return new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const parts = lineBuffer.split("\n");
          lineBuffer = parts.pop() ?? "";
          for (const rawLine of parts) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            try {
              const json = JSON.parse(data) as unknown;
              const errMsg = isAnthropicStreamError(json);
              if (errMsg) {
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
                continue;
              }
              const { content, reasoning } = extractAnthropicDeltaFromJson(json);
              if (content || reasoning) {
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ content, reasoning })}\n\n`));
              }
            } catch {
              // ignore malformed JSON lines
            }
          }
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
}

/** Headers for normalized chat SSE responses (Next.js Route handlers). */
export const CHAT_SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;
