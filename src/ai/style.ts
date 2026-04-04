import { callClaude } from "./claude";

const styles = [
  "modern SaaS",
  "glassmorphism",
  "minimal",
  "dark fintech",
  "startup playful",
  "brutalist",
];

export async function applyStyle(components: unknown) {
  const style = styles[Math.floor(Math.random() * styles.length)];

  return callClaude(
    `Apply this style: ${style}

Enhance this UI:

${JSON.stringify(components)}

Return ONLY JSON:
{
  "style": "${style}",
  "components": [...]
}`,

    `You are a world-class UI designer.
Make designs visually stunning.
Return ONLY JSON.`,
    { maxTokens: 4096, temperature: 0.85 }
  );
}
