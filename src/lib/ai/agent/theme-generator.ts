/**
 * Design System & Theme Generator - Creates color palettes and typography from prompts
 * Uses OpenAI to generate cohesive design tokens
 */

export interface DesignTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    sidebar?: string;
    text: string;
    textMuted: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    headingSize: number;
    subheadingSize: number;
    bodySize: number;
    captionSize: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
}

const DEFAULT_THEME: DesignTheme = {
  colors: {
    primary: "#3b82f6",
    secondary: "#64748b",
    accent: "#0ea5e9",
    background: "#f8fafc",
    surface: "#ffffff",
    sidebar: "#0f172a",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
  },
  typography: {
    fontFamily: "Inter",
    headingSize: 24,
    subheadingSize: 18,
    bodySize: 14,
    captionSize: 12,
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 6, md: 10, lg: 16 },
};

const THEME_SYSTEM_PROMPT = `You are a design system expert. Generate a cohesive UI theme from the user's description.

Return ONLY valid JSON (no markdown):
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "sidebar": "#hex",
    "text": "#hex",
    "textMuted": "#hex",
    "border": "#hex"
  },
  "typography": {
    "fontFamily": "Inter|Roboto|Poppins|Space Grotesk|DM Sans|Geist",
    "headingSize": 24,
    "subheadingSize": 18,
    "bodySize": 14,
    "captionSize": 12
  },
  "spacing": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32 },
  "borderRadius": { "sm": 6, "md": 10, "lg": 16 }
}

Rules: All colors must be valid hex (#RRGGBB). Keep values realistic.`;

function parseThemeResponse(content: string): DesignTheme | null {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<DesignTheme>;
    if (!parsed?.colors) return null;
    return {
      colors: { ...DEFAULT_THEME.colors, ...parsed.colors },
      typography: { ...DEFAULT_THEME.typography, ...parsed.typography },
      spacing: { ...DEFAULT_THEME.spacing, ...parsed.spacing },
      borderRadius: { ...DEFAULT_THEME.borderRadius, ...parsed.borderRadius },
    };
  } catch {
    return null;
  }
}

import { callLLM, getOpenAIDefaultModel } from "../providers";

export async function generateThemeFromPrompt(
  prompt: string,
  options?: { apiKey?: string; model?: string }
): Promise<DesignTheme> {
  const hasKey = options?.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!hasKey) return DEFAULT_THEME;

  try {
    const { content } = await callLLM({
      apiKey: options?.apiKey,
      model: options?.model ?? getOpenAIDefaultModel(),
      systemPrompt: THEME_SYSTEM_PROMPT,
      userMessage: `Generate a theme for: ${prompt}. Return ONLY the JSON object.`,
      temperature: 0.3,
      maxTokens: 1024,
      jsonMode: true,
    });
    if (!content) return DEFAULT_THEME;
    const theme = parseThemeResponse(content);
    return theme ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
