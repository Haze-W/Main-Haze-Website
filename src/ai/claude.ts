import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKeyFromEnv, getAnthropicDefaultModel } from "@/lib/ai/providers";

function getClient(): Anthropic {
  const apiKey = getAnthropicApiKeyFromEnv();
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY or CLAUDE_API_KEY in environment");
  }
  return new Anthropic({ apiKey });
}

function extractTextFromMessage(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function parseJsonFromModelText(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    console.error("JSON parse error, raw:", cleaned.slice(0, 800));
    throw new Error("Invalid JSON from AI");
  }
}

export interface CallClaudeOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Calls Claude with a user prompt + system prompt; returns parsed JSON.
 */
export async function callClaude(
  prompt: string,
  system: string,
  options?: CallClaudeOptions
): Promise<unknown> {
  const anthropic = getClient();
  const model = getAnthropicDefaultModel();
  const res = await anthropic.messages.create({
    model,
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.85,
    system,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = extractTextFromMessage(res.content);
  if (!text.trim()) {
    throw new Error("Empty response from Claude");
  }

  return parseJsonFromModelText(text);
}
