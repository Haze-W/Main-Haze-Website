/**
 * AI Provider abstraction — Anthropic Messages API first (fast/cheap defaults),
 * OpenAI Chat Completions second. OPENAI_BASE_URL is for proxies or enterprise gateways only.
 */

export type AIProvider = "openai" | "anthropic";

/** Anthropic API key from env (`ANTHROPIC_API_KEY` or optional `CLAUDE_API_KEY` alias). */
export function getAnthropicApiKeyFromEnv(): string | undefined {
  const k = process.env.ANTHROPIC_API_KEY?.trim() || process.env.CLAUDE_API_KEY?.trim();
  return k || undefined;
}

/** Base URL without trailing slash (default: https://api.openai.com/v1) */
export function getOpenAIBaseUrl(): string {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

export function getOpenAIChatCompletionsUrl(): string {
  return `${getOpenAIBaseUrl()}/chat/completions`;
}

/** Default model when the request omits `model` (env OPENAI_MODEL or gpt-4o-mini for speed). */
export function getOpenAIDefaultModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

/** Default Anthropic model when the request omits `model` or passes an OpenAI-style model id. */
export function getAnthropicDefaultModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
}

function isOpenAIModelName(model: string): boolean {
  const m = model.trim().toLowerCase();
  return m.startsWith("gpt-") || /^o\d/.test(m) || m.startsWith("chatgpt");
}

function isAnthropicModelName(model: string): boolean {
  return model.trim().toLowerCase().startsWith("claude-");
}

/** Avoid sending gpt-* ids to Anthropic (and vice versa) when callers pass a single default. */
export function resolveAnthropicModel(model?: string): string {
  if (!model || isOpenAIModelName(model)) return getAnthropicDefaultModel();
  return model;
}

export function resolveOpenAIModel(model?: string): string {
  if (!model || isAnthropicModelName(model)) return getOpenAIDefaultModel();
  return model;
}

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
  /** Abort request after this many ms (default 90s). Use ~35s for UI layout generation. */
  timeoutMs?: number;
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
  const model = resolveOpenAIModel(options.model);
  const messages = buildMessages(options);
  if (!messages.length) throw new Error("No messages provided");
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.25,
    max_tokens: options.maxTokens ?? 4096,
  };
  // Some proxies reject response_format; set OPENAI_SKIP_JSON_RESPONSE_FORMAT=1 to omit.
  if (options.jsonMode && process.env.OPENAI_SKIP_JSON_RESPONSE_FORMAT !== "1") {
    body.response_format = { type: "json_object" };
  }

  const timeoutMs = options.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(getOpenAIChatCompletionsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`OpenAI request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI-compatible API: ${res.status} ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  return { content, provider: "openai" };
}

async function callAnthropic(options: LLMOptions): Promise<LLMResponse> {
  const apiKey = options.apiKey ?? getAnthropicApiKeyFromEnv();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY or CLAUDE_API_KEY required");
  const model = resolveAnthropicModel(options.model);
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

  const timeoutMs = options.timeoutMs ?? 90_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Anthropic request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic: ${res.status} ${errBody.slice(0, 300)}`);
  }
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
  const anthropicKey = getAnthropicApiKeyFromEnv();
  let lastError: Error | null = null;

  if (anthropicKey) {
    try {
      return await callAnthropic({ ...options, apiKey: anthropicKey });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  if (openaiKey) {
    try {
      return await callOpenAI({ ...options, apiKey: openaiKey });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error("No AI provider available (set ANTHROPIC_API_KEY, CLAUDE_API_KEY, or OPENAI_API_KEY)");
}
