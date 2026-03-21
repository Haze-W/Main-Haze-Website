/**
 * Layout Refiner - Conversational AI for iteratively refining UI layouts
 * Takes current layout + user message, returns refined layout or suggestions
 */

import type { AIUILayout, AIUIFrame } from "../schema/ui-schema";
import { validateAndFixFrame } from "./rules-engine";
import { callLLM, getOpenAIDefaultModel } from "../providers";

const REFINE_SYSTEM_PROMPT = `You are a senior UI engineer doing PARTIAL REGENERATION (edit in place, FAST mode).

Input:
1) Current layout JSON (frame + children) — this is the live editor state (all nodes, colors, assets).
2) User message

You may touch ANY part of the tree the user implies: backgrounds, text, buttons, inputs, icons, images (props.src, alt), dividers, spacers, rectangles, nested frames, opacity (styles.opacity), rotation, layoutMode, padding/gap, borders, shadows.

Rules — NON-DESTRUCTIVE by default:
- Prefer MODIFICATION over full rebuild. Change ONLY what the user asked for unless they say "rebuild" / "start over".
- Preserve unrelated nodes and ids when possible.
- Style → update hex colors, backgroundColor, frame.background, styles (padding, borderRadius, boxShadow, borderColor, opacity) on affected nodes.
- Layout → adjust x, y, width, height for affected subtrees.
- Add → insert new elements (any valid type). Remove → delete from children arrays.
- Full rebuild ONLY if the user clearly asks to redo everything or change app type.

Output: ONLY valid JSON — the full modified frame object with children (complete tree after edits).
Every element needs: id, type, x, y, width, height.
Valid types: navbar, sidebar, topbar, hero, card, text, button, input, icon, image, frame, container, form, table, modal, settings, divider, spacer, rectangle, dashboard, menu, gallery, pricing, login, analytics (use as structured regions), and other schema types.
Icons: "icon" + "props": { "iconName": "lucide-name" }. Images: "image" + "props": { "src", "alt" }.
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
    return {
      suggestion:
        "Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your server environment to refine layouts with AI.",
    };
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
