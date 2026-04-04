export type AIProvider = "openai" | "anthropic";

export function getAnthropicApiKeyFromEnv(): string | undefined {
const k =
process.env.ANTHROPIC_API_KEY?.trim() ||
process.env.CLAUDE_API_KEY?.trim();
return k || undefined;
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
}

export interface LLMResponse {
content: string;
provider: AIProvider;
}

function buildMessages(options: LLMOptions) {
if (options.messages?.length) return options.messages;

const msgs: ChatMessage[] = [];
if (options.systemPrompt)
msgs.push({ role: "system", content: options.systemPrompt });
if (options.userMessage)
msgs.push({ role: "user", content: options.userMessage });

return msgs;
}

async function callAnthropic(options: LLMOptions): Promise<LLMResponse> {
const apiKey = getAnthropicApiKeyFromEnv();
if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

const messages = buildMessages(options);

const res = await fetch("https://api.anthropic.com/v1/messages", {
method: "POST",
headers: {
"Content-Type": "application/json",
"x-api-key": apiKey,
"anthropic-version": "2023-06-01",
},
body: JSON.stringify({
model: "claude-3-5-sonnet",
max_tokens: options.maxTokens ?? 4000,
temperature: options.temperature ?? 0.9,
messages: messages.map((m) => ({
role: m.role === "assistant" ? "assistant" : "user",
content: m.content,
})),
}),
});

if (!res.ok) {
const err = await res.text();
throw new Error("Anthropic error: " + err);
}

const data = await res.json();

let content = (data.content || [])
.map((c: any) => c.text || "")
.join("")
.trim();

content = content
.replace(/`json/g, "")
    .replace(/`/g, "")
.trim();

return { content, provider: "anthropic" };
}

export async function callLLM(options: LLMOptions): Promise<LLMResponse> {
return callAnthropic(options);
}
