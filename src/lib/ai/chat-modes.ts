/**
 * System prompts and parsing for /api/ai/chat multi-message modes (Claude/OpenAI).
 */

import type { ChatMessage } from "@/lib/ai/providers";
import type { CoralResponse } from "@/lib/ai/coral-engine";

export type ChatSlashMode = "agent" | "code" | "ask" | "plan" | "ui" | "fix" | null;

const AGENT_SYSTEM = `You are a senior product engineer helping users inside **Haze**, a visual UI editor that exports to **Tauri 2 + React**.

Be concise and actionable. Prefer bullet points when listing steps.
Cover: app architecture, Tauri commands vs web UI, shadcn/ui-style composition (radix primitives, tokens, spacing), and how prototype interactions map to exported code.
When the user says a single product word (e.g. "dashboard", "settings"), assume they want **only** that screen or flow — do not propose unrelated marketing pages or extra features unless they ask.`;

const CODE_SYSTEM = `You are an expert in **Tauri 2** (Rust) and **TypeScript** frontends for exported Haze projects.

Your job: produce backend glue that matches the user's UI intent — e.g. folder pickers, file read/list, system info, window APIs.

Rules:
- Always output **working-shaped** snippets: Rust \`#[tauri::command]\` functions with \`Result<T, String>\` errors, and TS using \`import { invoke } from "@tauri-apps/api/core"\`.
- For **folder selection**, use \`tauri-plugin-dialog\` (Rust: \`DialogExt\` / \`app.dialog().file().pick_folder()\` or the plugin's command surface for Tauri 2). Name the command \`pick_folder\` unless they asked otherwise. Mention adding the plugin to \`Cargo.toml\` and \`tauri.conf.json\` capabilities (\`dialog:default\` or equivalent).
- Explain how a **button in the UI** calls \`invoke('pick_folder')\` and displays the path in state or a text node.
- If the user asked for a **file browser**, pair \`pick_folder\` or \`list_dir\`-style commands with the UI list.
- Use markdown: short **Summary** paragraph, then \`\`\`rust block, then \`\`\`typescript block. Optional \`\`\`toml snippet for Cargo.toml deps.

Do not invent unrelated features beyond the request.`;

const ASK_SYSTEM = `You are a helpful UI/UX and front-end engineering assistant. Be concise. When the user mentions one screen type (e.g. "dashboard"), stay scoped to that — no extra unsolicited pages.`;

const PLAN_SYSTEM = `You are a planning assistant for app UI work. Output a clear numbered plan (steps). If they only asked for one screen (e.g. dashboard), the plan must only cover that screen — no landing pages or unrelated flows unless requested. Use markdown headings sparingly.`;

export function extractCodeFences(md: string): { intro: string; rust?: string; js?: string } {
  const rust = md.match(/```rust\n([\s\S]*?)```/i)?.[1]?.trim();
  const js =
    md.match(/```(?:typescript|ts)\n([\s\S]*?)```/i)?.[1]?.trim() ??
    md.match(/```tsx?\n([\s\S]*?)```/i)?.[1]?.trim();
  let intro = md
    .replace(/```rust\n[\s\S]*?```/gi, "")
    .replace(/```(?:typescript|ts|tsx?)\n[\s\S]*?```/gi, "")
    .replace(/```toml\n[\s\S]*?```/gi, "")
    .trim();
  return { intro, rust, js };
}

function systemForMode(mode: Exclude<ChatSlashMode, "ui" | "fix" | null>): string {
  switch (mode) {
    case "agent":
      return AGENT_SYSTEM;
    case "code":
      return CODE_SYSTEM;
    case "ask":
      return ASK_SYSTEM;
    case "plan":
      return PLAN_SYSTEM;
    default:
      return ASK_SYSTEM;
  }
}

/** Build messages for callLLM: system + prior turns + user content from request. */
export function buildLlmChatMessages(
  mode: Exclude<ChatSlashMode, "ui" | "fix" | null>,
  conversation: { role: string; content: string }[]
): ChatMessage[] {
  const system = systemForMode(mode);
  const out: ChatMessage[] = [{ role: "system", content: system }];
  for (const m of conversation) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const c = typeof m.content === "string" ? m.content.trim() : "";
    if (!c) continue;
    out.push({ role: m.role as "user" | "assistant", content: c });
  }
  return out;
}

export function llmTextToCoralResponse(mode: ChatSlashMode, raw: string): CoralResponse {
  const text = raw.trim();
  if (mode === "code") {
    const { intro, rust, js } = extractCodeFences(raw);
    return {
      action: "GENERATE_CODE",
      text: intro || text || "Generated backend snippets.",
      rust: rust || undefined,
      js: js || undefined,
      deps: [],
    };
  }
  return { action: "ANSWER", text: text || "…" };
}
