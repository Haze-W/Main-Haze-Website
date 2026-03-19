/**
 * AI Provider abstraction - OpenAI primary, Anthropic fallback
 */

export type AIProvider = "openai" | "anthropic";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  apiKey?: string;
  model?: string;
  systemPrompt?: string;
  userMessage?: string;
  messages?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: AIProvider;
}

function buildMessages(options: LLMOptions): Array<{ role: string; content: string }> {
  if (options.messages?.length) {
    return options.messages.map((m) => ({ role: m.role, content: m.content }));
  }
  const msgs: Array<{ role: string; content: string }> = [];
  if (options.systemPrompt) msgs.push({ role: "system", content: options.systemPrompt });
  if (options.userMessage) msgs.push({ role: "user", content: options.userMessage });
  return msgs;
}

async function callOpenAI(options: LLMOptions): Promise<LLMResponse> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY required");
  const model = options.model ?? "gpt-4o";
  const messages = buildMessages(options);
  if (!messages.length) throw new Error("No messages provided");
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.25,
    max_tokens: options.maxTokens ?? 4096,
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  return { content, provider: "openai" };
}

async function callAnthropic(options: LLMOptions): Promise<LLMResponse> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY required");
  const model = options.model ?? "claude-sonnet-4-5";
  const messages = buildMessages(options);
  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const anthropicMessages = userMessages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));
  const body = {
    model,
    max_tokens: options.maxTokens ?? 4096,
    system: systemMsg?.content ?? "",
    messages: anthropicMessages.length ? anthropicMessages : [{ role: "user" as const, content: options.userMessage ?? "" }],
    temperature: options.temperature ?? 0.25,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic: ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const textBlock = data.content?.find((c) => c.type === "text");
  let content = textBlock?.text?.trim() ?? "";
  if (options.jsonMode && content) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) content = match[0];
  }
  return { content, provider: "anthropic" };
}

export async function callLLM(options: LLMOptions): Promise<LLMResponse> {
  const openaiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  let lastError: Error | null = null;

  if (openaiKey) {
    try {
      return await callOpenAI({ ...options, apiKey: openaiKey });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  if (anthropicKey) {
    try {
      return await callAnthropic({ ...options, apiKey: anthropicKey });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("No AI provider available (set OPENAI_API_KEY or ANTHROPIC_API_KEY)");
}
