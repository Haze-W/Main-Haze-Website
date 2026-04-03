import { callClaude } from "./claude";

export async function generateLayout(intent: unknown) {
  return callClaude(
    `Create a UI layout structure from this intent:

${JSON.stringify(intent)}

Return ONLY JSON:
{
  "layout": "string",
  "sections": ["array of sections"]
}`,

    `You design UI layouts like a senior product designer.
Return ONLY JSON.`,
    { maxTokens: 2500, temperature: 0.75 }
  );
}
