import { callClaude } from "./claude";

export async function analyzeIntent(userPrompt: string) {
  return callClaude(
    `Extract structured intent from this prompt:

"${userPrompt}"

Return ONLY JSON:
{
  "type": "dashboard | landing | app | mobile",
  "industry": "string",
  "features": ["array"],
  "tone": ["modern", "minimal", "..."],
  "complexity": "low | medium | high"
}`,

    `You are an AI that extracts structured UI intent.
Return ONLY JSON. No explanation.`,
    { maxTokens: 2000, temperature: 0.9 }
  );
}
