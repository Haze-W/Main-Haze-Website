/**
 * Prompt Interpreter - Processes user prompts for UI generation
 */

export interface ParsedPrompt {
  intent: string;
  components: string[];
  style: string;
  frame?: { preset: "ide" | "desktop" | "app" | "wide" | "square"; width: number; height: number };
  domain?: string;
  raw: string;
}

const COMPONENT_KEYWORDS: Record<string, string[]> = {
  navbar: ["navbar", "nav", "navigation", "header", "menu bar"],
  sidebar: ["sidebar", "side nav", "left panel", "navigation panel"],
  hero: ["hero", "banner", "landing", "hero section"],
  dashboard: ["dashboard", "admin", "analytics"],
  card: ["card", "cards", "tile", "tiles"],
  button: ["button", "btn", "cta"],
  input: ["input", "textfield", "text field", "textbox", "text box"],
  text: ["text", "label", "heading", "title"],
  icon: ["icon", "glyph"],
  table: ["table", "data table", "grid"],
  form: ["form", "input form", "signup", "contact form"],
  pricing: ["pricing", "plans", "subscription"],
  analytics: ["analytics", "charts", "metrics", "kpi"],
  modal: ["modal", "dialog", "popup"],
  login: ["login", "sign in", "auth"],
  gallery: ["gallery", "images", "portfolio"],
  settings: ["settings", "preferences", "config"],
  topbar: ["topbar", "top bar", "app bar"],
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  modern: ["modern", "clean", "minimal", "contemporary"],
  saas: ["saas", "software", "app"],
  corporate: ["corporate", "business", "professional"],
  dark: ["dark", "dark mode", "dark theme"],
  minimal: ["minimal", "minimalist", "simple"],
};

export function parsePrompt(prompt: string): ParsedPrompt {
  const lower = prompt.toLowerCase().trim();
  const components: string[] = [];
  const styles: string[] = [];
  let frame: ParsedPrompt["frame"] | undefined;

  // Detect frame preset intent (e.g. "create wide", "wide frame", "ide canvas")
  const wantsFrame =
    /\b(create|make|new|generate)\b/.test(lower) &&
    /\b(frame|canvas|page|screen|wide|ide|desktop|square|app)\b/.test(lower);

  if (/\bwide\b/.test(lower)) frame = { preset: "wide", width: 1600, height: 900 };
  else if (/\bide\b/.test(lower)) frame = { preset: "ide", width: 1200, height: 800 };
  else if (/\bsquare\b/.test(lower)) frame = { preset: "square", width: 1024, height: 1024 };
  else if (/\bapp\b/.test(lower)) frame = { preset: "app", width: 1440, height: 900 };
  else if (/\bdesktop\b/.test(lower)) frame = { preset: "desktop", width: 1440, height: 900 };

  for (const [comp, keywords] of Object.entries(COMPONENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      components.push(comp);
    }
  }

  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      styles.push(style);
    }
  }

  const domainMatch = lower.match(
    /(?:for|company|business|)\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+(?:company|business|website|page|interface)/i
  );
  const domain = domainMatch?.[1] ?? undefined;

  const hasOnlyFrameIntent = wantsFrame && components.length === 0 && !!frame;

  return {
    intent: lower,
    // Don't force a full dashboard when the user asks for a single element (e.g. "create button").
    // If we can't detect any component at all, default to a simple card-based layout.
    components: hasOnlyFrameIntent ? [] : components.length > 0 ? components : ["card"],
    style: styles.length > 0 ? styles[0] : "modern",
    frame,
    domain,
    raw: prompt,
  };
}
