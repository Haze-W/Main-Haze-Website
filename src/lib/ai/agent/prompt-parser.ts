import type { ViewportType } from "../schema/ui-schema";

/**
 * Prompt Interpreter - Processes user prompts for UI generation
 */

export interface ParsedPrompt {
  intent: string;
  components: string[];
  style: string;
  theme: "light" | "dark";
  domain?: string;
  viewport?: ViewportType;
  raw: string;
  designPreset?: string;
  sectionTemplate?: string;
}

const COMPONENT_KEYWORDS: Record<string, string[]> = {
  navbar: ["navbar", "nav", "navigation", "header", "menu bar"],
  sidebar: ["sidebar", "side nav", "left panel", "navigation panel"],
  hero: ["hero", "banner", "landing", "hero section"],
  dashboard: ["dashboard", "admin", "analytics"],
  card: ["card", "cards", "tile", "tiles"],
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

<<<<<<< HEAD
const VIEWPORT_KEYWORDS: Record<ViewportType, string[]> = {
  mobile: ["mobile", "phone", "smartphone", "ios", "android", "small screen"],
  tablet: ["tablet", "ipad", "medium screen"],
  desktop: ["desktop", "web", "large screen", "wide"],
=======
/** Design presets — inject into prompt for style guidance */
export const DESIGN_PRESETS: Record<string, string> = {
  stripe: "Stripe-style SaaS — clean gradients, purple accents, trust-building layout, conversion-focused",
  apple: "Apple minimal — lots of whitespace, SF-style typography, subtle shadows, premium feel",
  landing: "Modern startup landing page — hero, features grid, social proof, strong CTA",
  glassmorphism: "Glassmorphism dashboard — frosted glass cards, blur, soft elevation",
  linear: "Linear-style — crisp, fast-feeling, keyboard-first aesthetic, dark mode friendly",
  notion: "Notion-style — content-first, sidebar nav, clean blocks, collaborative feel",
};

const PRESET_KEYWORDS: Record<string, string[]> = {
  stripe: ["stripe", "saas", "payment", "conversion"],
  apple: ["apple", "minimal", "premium", "sf style"],
  landing: ["landing", "homepage", "marketing page"],
  glassmorphism: ["glass", "glassmorphism", "frosted", "blur"],
  linear: ["linear", "crisp", "keyboard", "fast"],
  notion: ["notion", "blocks", "wiki", "content-first"],
};

/** Section templates — required structure by page type */
export const SECTION_TEMPLATES: Record<string, string> = {
  landing: "MUST include: Hero (headline + subheadline + CTA), Features grid (3-4 features with icons), CTA section, Footer (links, copyright)",
  dashboard: "MUST include: Sidebar (nav with icons), Topbar (logo, search, user), Stats cards (3-4 KPI cards), Main content area (charts/tables/lists)",
  login: "MUST include: Centered card, Title, Email + Password inputs, Remember me, Sign in button, Sign up link",
  settings: "MUST include: Sidebar (section nav), Content area (form inputs), Save/Cancel buttons",
  pricing: "MUST include: Section title, 3 pricing cards (Starter/Pro/Enterprise), Feature lists, CTA buttons",
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
};

export function parsePrompt(prompt: string): ParsedPrompt {
  const lower = prompt.toLowerCase().trim();
  const components: string[] = [];
  const styles: string[] = [];

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

<<<<<<< HEAD
  let viewport: ViewportType | undefined;
  for (const [vp, keywords] of Object.entries(VIEWPORT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      viewport = vp as ViewportType;
=======
  const hasDark = lower.includes("dark") || lower.includes("dark mode") || lower.includes("dark theme");
  const hasLight = lower.includes("light") || lower.includes("light mode");
  const theme = hasDark ? "dark" : hasLight ? "light" : "dark";

  // Detect design preset from prompt
  let designPreset: string | undefined;
  for (const [key, desc] of Object.entries(DESIGN_PRESETS)) {
    const keywords = PRESET_KEYWORDS[key] ?? [];
    if (keywords.some((k) => lower.includes(k))) {
      designPreset = desc;
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
      break;
    }
  }

<<<<<<< HEAD
=======
  // Detect page type for section template and infer components
  let sectionTemplate: string | undefined;
  const inferred: string[] = [];
  if (has(lower, "landing", "homepage", "marketing")) {
    sectionTemplate = SECTION_TEMPLATES.landing;
    inferred.push("hero", "card");
  } else if (has(lower, "dashboard", "admin", "analytics", "saas")) {
    sectionTemplate = SECTION_TEMPLATES.dashboard;
    inferred.push("sidebar", "topbar", "card");
  } else if (has(lower, "login", "sign in", "auth")) {
    sectionTemplate = SECTION_TEMPLATES.login;
    inferred.push("login");
  } else if (has(lower, "settings", "preferences")) {
    sectionTemplate = SECTION_TEMPLATES.settings;
    inferred.push("sidebar", "settings");
  } else if (has(lower, "pricing", "plans")) {
    sectionTemplate = SECTION_TEMPLATES.pricing;
    inferred.push("pricing", "card");
  }
  const allComponents = [...new Set([...components, ...inferred])];

>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
  return {
    intent: lower,
    components: allComponents.length > 0 ? allComponents : components,
    style: styles.length > 0 ? styles[0] : "modern",
    theme,
    domain,
    viewport,
    raw: prompt,
    designPreset,
    sectionTemplate,
  };
}

function has(text: string, ...keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

/** Parse with optional theme override (from UI) */
export function parsePromptWithOptions(
  prompt: string,
  options?: { theme?: "light" | "dark" }
): ParsedPrompt {
  const parsed = parsePrompt(prompt);
  if (options?.theme) {
    parsed.theme = options.theme;
  }
  return parsed;
}
