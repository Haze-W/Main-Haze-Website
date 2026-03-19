/**
 * Layout Refiner - Conversational AI for iteratively refining UI layouts
 * Takes current layout + user message, returns refined layout or suggestions
 */

import type { AIUILayout, AIUIFrame } from "../schema/ui-schema";
import { validateAndFixFrame } from "./rules-engine";
import { callLLM } from "../providers";

const REFINE_SYSTEM_PROMPT = `You are a UI design assistant. The user will send you:
1. Their current layout as JSON (frame with children)
2. A message describing what they want to change

Your job: Return ONLY valid JSON with the modified layout. Apply the user's requested changes.
- If they want to add a component, add it with proper positioning
- If they want to change colors, update the color/backgroundColor fields
- If they want to remove something, omit it from children
- If they want to rearrange, update x,y positions
- Preserve the exact JSON structure. Every element needs: id, type, x, y, width, height.
- Valid types: navbar, sidebar, topbar, hero, card, text, button, input, icon, image, frame, container
- Use hex colors only.`;

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
    return { suggestion: "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY to use AI refinement." };
  }

  const userContent = `Current layout:\n\`\`\`json\n${currentLayoutJson}\n\`\`\`\n\nUser request: ${userMessage}\n\nReturn ONLY the modified JSON layout (the frame object with children). No explanation.`;

  try {
    const { content } = await callLLM({
      apiKey: options?.apiKey,
      model: options?.model ?? "gpt-4o",
      systemPrompt: REFINE_SYSTEM_PROMPT,
      userMessage: userContent,
      temperature: 0.2,
      maxTokens: 8192,
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
