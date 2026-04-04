/**
 * Screenshot → layout — uses the same local deterministic generator as text prompts
 * (vision APIs removed; attach images as inspiration in the UI copy when needed).
 */

import type { AIUILayout } from "../schema/ui-schema";
import { validateAndFixFrame } from "./rules-engine";
import { generateLayoutFromPrompt } from "./layout-generator";

export async function extractLayoutFromScreenshot(
  _imageBase64: string,
  options?: { apiKey?: string; model?: string; style?: "light" | "dark" }
): Promise<AIUILayout> {
  const layout = await generateLayoutFromPrompt(
    "Layout inspired by the attached screenshot — balanced dashboard shell with sidebar, top bar, and content region.",
    { style: options?.style ?? "dark" }
  );
  layout.frame = validateAndFixFrame(layout.frame);
  layout.metadata = {
    ...layout.metadata,
    prompt: layout.metadata?.prompt ?? "screenshot-import",
  };
  return layout;
}
