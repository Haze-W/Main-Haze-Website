/**
 * Layout refiner — rule-based edits on the current AI layout JSON (no external APIs).
 */

import { refineLayoutFromJsonString } from "@/lib/haze-agent/local-refine";

export async function refineLayout(
  currentLayoutJson: string,
  userMessage: string,
  _options?: { apiKey?: string; model?: string }
): Promise<{ layout: import("../schema/ui-schema").AIUILayout; response: string } | { suggestion: string }> {
  return refineLayoutFromJsonString(currentLayoutJson, userMessage);
}
