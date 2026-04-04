/**
 * Design tokens from prompts — keyword-based presets (no external APIs).
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

function inferThemeFromKeywords(prompt: string): DesignTheme {
  const lower = prompt.toLowerCase();
  const t: DesignTheme = {
    colors: { ...DEFAULT_THEME.colors },
    typography: { ...DEFAULT_THEME.typography },
    spacing: { ...DEFAULT_THEME.spacing },
    borderRadius: { ...DEFAULT_THEME.borderRadius },
  };

  if (/\b(dark|midnight|night|oled)\b/.test(lower)) {
    t.colors.background = "#0a0a0c";
    t.colors.surface = "#18181b";
    t.colors.sidebar = "#09090b";
    t.colors.text = "#fafafa";
    t.colors.textMuted = "#a1a1aa";
    t.colors.border = "#27272a";
    t.colors.primary = "#a78bfa";
    t.colors.accent = "#22d3ee";
  }

  if (/\b(ocean|blue|azure|water)\b/.test(lower)) {
    t.colors.primary = "#0ea5e9";
    t.colors.accent = "#06b6d4";
    t.colors.background = lower.includes("dark") ? "#0c1222" : "#f0f9ff";
  }

  if (/\b(forest|green|nature|mint)\b/.test(lower)) {
    t.colors.primary = "#22c55e";
    t.colors.accent = "#10b981";
    if (!lower.includes("dark")) t.colors.background = "#f0fdf4";
  }

  if (/\b(warm|sunset|amber|orange|coffee)\b/.test(lower)) {
    t.colors.primary = "#f59e0b";
    t.colors.accent = "#ea580c";
    t.colors.secondary = "#78716c";
  }

  if (/\b(mono|minimal|swiss|editorial)\b/.test(lower)) {
    t.typography.fontFamily = "DM Sans";
    t.borderRadius = { sm: 4, md: 6, lg: 8 };
  }

  if (/\b(rounded|soft|playful)\b/.test(lower)) {
    t.borderRadius = { sm: 10, md: 16, lg: 24 };
  }

  return t;
}

export async function generateThemeFromPrompt(
  prompt: string,
  _options?: { apiKey?: string; model?: string }
): Promise<DesignTheme> {
  return inferThemeFromKeywords(prompt);
}
