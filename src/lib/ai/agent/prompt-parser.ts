import type { ViewportType } from "../schema/ui-schema";

/**
 * Prompt Interpreter - Processes user prompts for UI generation
 */

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

const VIEWPORT_KEYWORDS: Record<ViewportType, string[]> = {
  mobile: ["mobile", "phone", "smartphone", "ios", "android", "small screen"],
  tablet: ["tablet", "ipad", "medium screen"],
  desktop: ["desktop", "web", "large screen", "wide"],
};

/** Design presets — inject into prompt for style guidance */
export const DESIGN_PRESETS: Record<string, string> = {
  /** Default “pro” baseline — shadcn/ui New York + zinc; aim for Dribbble-tier polish */
  shadcn:
    "shadcn/ui (ui.shadcn.com): zinc neutrals, radius-md cards, border + shadow-sm, Inter/system UI font, muted-foreground labels, clear hierarchy, generous whitespace — premium SaaS not flat gray boxes; spacing rhythm, subtle borders, one accent color (Dribbble-level craft)",
  stripe: "Stripe-style SaaS — clean gradients, purple accents, trust-building layout, conversion-focused",
  apple: "Apple minimal — lots of whitespace, SF-style typography, subtle shadows, premium feel",
  landing: "Modern startup landing page — hero, features grid, social proof, strong CTA",
  glassmorphism: "Glassmorphism dashboard — frosted glass cards, blur, soft elevation",
  linear: "Linear-style — crisp, fast-feeling, keyboard-first aesthetic, dark mode friendly",
  notion: "Notion-style — content-first, sidebar nav, clean blocks, collaborative feel",
};

export type DesignPresetId = keyof typeof DESIGN_PRESETS;

export interface ParsedPrompt {
  intent: string;
  components: string[];
  style: string;
  theme: "light" | "dark";
  domain?: string;
  viewport?: ViewportType;
  raw: string;
  designPreset?: string;
  designPresetId?: DesignPresetId;
  sectionTemplate?: string;
}

const PRESET_KEYWORDS: Record<string, string[]> = {
  shadcn: [
    "shadcn",
    "radix",
    "new york",
    "tailwind",
    "professional",
    "beautiful ui",
    "polished",
    "dribbble",
    "dashboard",
    "saas",
    "app shell",
    "admin panel",
  ],
  stripe: ["stripe", "payment", "checkout"],
  apple: ["apple", "sf style", "ios style"],
  landing: ["landing", "homepage", "marketing page", "marketing"],
  glassmorphism: ["glass", "glassmorphism", "frosted", "blur", "behance", "aesthetic", "showcase"],
  linear: ["linear", "crisp", "keyboard", "fast"],
  notion: ["notion", "blocks", "wiki", "content-first"],
};

/** Section templates — required structure by page type */
export const SECTION_TEMPLATES: Record<string, string> = {
  landing:
    "MUST include: Hero (headline + subheadline + CTA), Features grid (3-4 features with icons), CTA section, Footer (links, copyright)",
  dashboard:
    "MUST follow shadcn dashboard-01 block structure (ui.shadcn.com/blocks#dashboard-01): inset sidebar (team + grouped nav), site header with breadcrumb + search, SectionCards row (4 KPIs), chart strip, then DataTable — not a sparse 2×2 grid only",
  login: "MUST include: Centered card, Title, Email + Password inputs, Remember me, Sign in button, Sign up link",
  settings:
    "MUST include: Sidebar (section nav), Content area (form inputs), Save/Cancel buttons",
  pricing:
    "MUST include: Section title, 3 pricing cards (Starter/Pro/Enterprise), Feature lists, CTA buttons",
};

function has(text: string, ...keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

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

  let viewport: ViewportType | undefined;
  for (const [vp, keywords] of Object.entries(VIEWPORT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      viewport = vp as ViewportType;
      break;
    }
  }

  const hasDark = lower.includes("dark") || lower.includes("dark mode") || lower.includes("dark theme");
  const hasLight = lower.includes("light") || lower.includes("light mode");
  let theme: "light" | "dark" = hasDark ? "dark" : hasLight ? "light" : "dark";

  let designPreset: string | undefined;
  let designPresetId: DesignPresetId | undefined;
  for (const [key, desc] of Object.entries(DESIGN_PRESETS)) {
    const kws = PRESET_KEYWORDS[key] ?? [];
    if (kws.some((k) => lower.includes(k))) {
      designPresetId = key as DesignPresetId;
      designPreset = desc;
      break;
    }
  }

  let sectionTemplate: string | undefined;
  const inferred: string[] = [];
  if (has(lower, "landing", "homepage", "marketing")) {
    sectionTemplate = SECTION_TEMPLATES.landing;
    inferred.push("hero", "card");
  } else if (has(lower, "dashboard", "admin", "analytics", "saas")) {
    sectionTemplate = SECTION_TEMPLATES.dashboard;
    /** Match shadcn dashboard-01: SectionCards + chart + DataTable (not cards-only). */
    inferred.push("sidebar", "topbar", "card", "table", "analytics");
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

  const merged = [...new Set([...components, ...inferred])];
  let finalComponents = merged.length > 0 ? merged : components;
  if (finalComponents.length === 0) {
    finalComponents = ["sidebar", "topbar", "card"];
  }

  return {
    intent: lower,
    components: finalComponents,
    style: styles.length > 0 ? styles[0] : "modern",
    theme,
    domain,
    viewport,
    raw: prompt,
    designPreset,
    designPresetId,
    sectionTemplate,
  };
}

/** Parse with optional theme / viewport override (from UI or API) */
export function parsePromptWithOptions(
  prompt: string,
  options?: { theme?: "light" | "dark"; viewport?: ViewportType }
): ParsedPrompt {
  const parsed = parsePrompt(prompt);
  if (options?.theme) parsed.theme = options.theme;
  if (options?.viewport) parsed.viewport = options.viewport;
  return parsed;
}
