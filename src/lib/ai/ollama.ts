/**
 * Ollama — Local AI provider for Haze
 * Connects to localhost:11434 (ollama run llama3 or ollama run coral)
 * No API keys required. Runs on your PC for everyone.
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama3";

export interface OllamaOptions {
  model?: string;
  temperature?: number;
}

const OLLAMA_TIMEOUT_MS = 120_000; // 2 min — first run loads model

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Ollama timed out. Is it running? Try: ollama run llama3");
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|connection refused/i.test(msg)) {
      throw new Error("Ollama is not running. Start it with: ollama run llama3");
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Generate text from Ollama (non-streaming).
 */
export async function generateFromOllama(
  prompt: string,
  options?: OllamaOptions
): Promise<string> {
  const model = options?.model ?? DEFAULT_MODEL;
  const res = await fetchWithTimeout(
    `${OLLAMA_BASE}/api/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.25,
          num_predict: 2300,
        },
      }),
    },
    OLLAMA_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama request failed: ${err}`);
  }

  const data = (await res.json()) as { response?: string };
  return (data.response ?? "").trim();
}

/**
 * Chat completion with system + user messages (Ollama compatible).
 * Ollama /api/chat supports messages array.
 */
export async function chatFromOllama(
  messages: Array<{ role: string; content: string }>,
  options?: OllamaOptions
): Promise<string> {
  const model = options?.model ?? DEFAULT_MODEL;
  const res = await fetchWithTimeout(
    `${OLLAMA_BASE}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.6,
          num_predict: 1536,
        },
      }),
    },
    OLLAMA_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama chat failed: ${err}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content ?? "").trim();
}

/**
 * Streaming chat — returns the raw fetch Response (body is NDJSON line stream).
 */
export async function chatStreamFromOllama(
  messages: Array<{ role: string; content: string }>,
  options?: OllamaOptions
): Promise<Response> {
  const model = options?.model ?? DEFAULT_MODEL;
  const res = await fetchWithTimeout(
    `${OLLAMA_BASE}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.6,
          num_predict: 1536,
        },
      }),
    },
    OLLAMA_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama chat failed: ${err}`);
  }
  return res;
}
