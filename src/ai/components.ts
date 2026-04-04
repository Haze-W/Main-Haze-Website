import { callClaude } from "./claude";

export async function generateComponents(layout: unknown, intent: unknown) {
  return callClaude(
    `Generate UI components based on:

Layout:
${JSON.stringify(layout)}

Intent:
${JSON.stringify(intent)}

Available components:
sidebar, navbar, card, table, chart, button, input, modal, grid, section

Return ONLY JSON:
{
  "components": [
    {
      "type": "component",
      "props": {}
    }
  ]
}`,

    `You generate structured UI components.
Return ONLY JSON.`,
    { maxTokens: 4096, temperature: 0.7 }
  );
}
