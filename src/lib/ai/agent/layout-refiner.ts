/**
 * Layout Refiner - Conversational AI for iteratively refining UI layouts
 * Takes current layout + user message, returns refined layout or suggestions
 */

import type { AIUILayout, AIUIFrame } from "../schema/ui-schema";
import { validateAndFixFrame } from "./rules-engine";
import { callLLM, getOpenAIDefaultModel } from "../providers";
import { generateLayoutFromPrompt } from "./layout-generator";

const REFINE_SYSTEM_PROMPT = `You are a senior UI engineer doing PARTIAL REGENERATION (edit in place, FAST mode).

Input:
1) Current layout JSON (frame + children)
2) User message

Rules — NON-DESTRUCTIVE by default:
- This is almost always a MODIFICATION, not a full app rebuild. Change ONLY what the user asked for.
- Preserve unrelated nodes, ids where possible, and overall structure unless relocation forces updates.
- Style tweaks → update hex colors, backgroundColor, styles (padding, borderRadius) only where relevant.
- Layout tweaks → adjust x, y, width, height for affected subtrees only.
- Add features → insert new elements; do not wipe siblings.
- Remove → omit those nodes from children arrays.
- Full rebuild ONLY if the user clearly asks to redo everything, change app type completely, or start from scratch.

Output: ONLY valid JSON — the full modified frame object with children (complete tree after edits).
Every element needs: id, type, x, y, width, height.
Valid types: navbar, sidebar, topbar, hero, card, text, button, input, icon, image, frame, container, form, table, modal, settings
Icons: type "icon" with "props": { "iconName": "lucide-name" }.
Hex colors only. No markdown, no explanation.`;

function ensureValidLayout(obj: unknown): AIUILayout | null {
  try {
    const parsed = obj as { frame?: AIUIFrame } | AIUIFrame;
    const frame = parsed?.frame ?? (parsed as AIUIFrame);
    if (!frame?.children) return null;
    return {
      frame: validateAndFixFrame(frame),
      metadata: { generatedAt: new Date().toISOString(), version: "1.0", source: "refine" },
    };
  } catch {
    return null;
  }
}

export async function refineLayout(
  currentLayoutJson: string,
  userMessage: string,
  options?: { apiKey?: string; model?: string }
): Promise<{ layout: AIUILayout; response: string } | { suggestion: string }> {
  const hasKey = options?.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!hasKey) {
    try {
      const layout = await generateLayoutFromPrompt(
        `Apply this change to the UI (preserve dashboard structure when relevant): ${userMessage}`,
        { style: "dark" }
      );
      return {
        layout,
        response:
          "Generated a new layout from your message (no cloud API key — using local/Ollama or rules). Add OPENAI_API_KEY for edit-in-place refinement.",
      };
    } catch {
      return {
        suggestion:
          "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY, or start Ollama for local generation.",
      };
    }
  }

  const userContent = `Current layout:\n\`\`\`json\n${currentLayoutJson}\n\`\`\`\n\nUser request: ${userMessage}\n\nReturn ONLY the modified JSON layout (the frame object with children). No explanation.`;

  try {
    const { content } = await callLLM({
      apiKey: options?.apiKey,
      model: options?.model ?? getOpenAIDefaultModel(),
      systemPrompt: REFINE_SYSTEM_PROMPT,
      userMessage: userContent,
      temperature: 0.2,
      maxTokens: 4096,
      jsonMode: true,
    });

    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as { frame?: AIUIFrame };
    const layout = ensureValidLayout(parsed);
    if (layout) {
      return { layout, response: `Applied: ${userMessage}` };
    }
    return { suggestion: content || "Could not parse layout. Try being more specific." };
  } catch (err) {
    return { suggestion: err instanceof Error ? err.message : "Refinement failed." };
  }
}
