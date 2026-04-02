/**
 * Layout Generator — Creates UI component tree from user prompt via LLM (Anthropic/OpenAI).
 * Falls back to local keyword-based generation ONLY if the API call fails.
 *
 * RESTORED: All LLM API calls re-added. Cursor previously deleted them and replaced
 * this file with a local-only version, which caused the same output every time.
 */

import type { AIUILayout, AIUIElement, AIUIFrame } from "../schema/ui-schema";
import {
  DEFAULT_WIDTH,
  VIEWPORT_DIMENSIONS,
  type ViewportType,
} from "../schema/ui-schema";
import { parsePromptWithOptions } from "./prompt-parser";
import { validateAndFixFrame } from "./rules-engine";
import type { DesignTheme } from "./theme-generator";
import { resolveRichTheme, type RichTheme } from "./layout-palettes";
import { callLLM, getAnthropicApiKeyFromEnv, getOpenAIDefaultModel } from "../providers";

export interface LayoutGeneratorOptions {
  apiKey?: string;
  model?: string;
  style?: "light" | "dark";
  runtimeTarget?: string;
  languageTarget?: string;
  /** Base64 data URLs for multimodal / vision-style prompts */
  images?: string[];
  viewport?: ViewportType;
  /** Tokens from /api/ai/theme */
  designTheme?: DesignTheme;
}

// ─── LLM Prompts ────────────────────────────────────────────────────────────

const ABSTRACT_JSON_SHAPE_GUIDE = `
Output shape: { "frame": { "width", "height", "background" (hex — full app canvas), "children": [ ... ] } }
Each node: "id", "type", "x", "y", "width", "height", optional "rotation" (degrees), "backgroundColor", "color", "text", "layoutMode" ("VERTICAL"|"HORIZONTAL"),
"styles": { "fontSize", "fontWeight", "padding", "gap", "borderRadius", "boxShadow", "borderColor", "borderWidth", "opacity" (0–1) },
"props": { ... }, "children": [ nested ] }.

Types (use what fits the product — mix freely): sidebar, topbar, navbar, hero, card, text, button, input, icon, image, frame, container, form, table, modal, settings,
divider (thin separator), spacer (flexible gap), rectangle (decorative block), dashboard, menu, gallery, pricing, login, analytics, ecommerce patterns as frames+cards.

Images: type "image" with "props": { "src": "https://..." , "alt": "..." } OR omit src to let the pipeline use a placeholder.
Icons: type "icon" + "props": { "iconName": "lucide-kebab-case" }.
Top bar (window chrome): type "topbar" with children OR empty; set "backgroundColor"/"color"; optional "props": { "title": "App name" }.

Coordinates relative to parent. Use DISTINCT hex palettes per request — never default to the same indigo/purple SaaS look unless the user asked for it.
`.trim();

const SYSTEM_PROMPT = `You are an elite product UI generator (FAST mode: think through intent → spec → layout internally; output only JSON).

Design language: Prefer **shadcn/ui**-quality layouts (see ui.shadcn.com and blocks): zinc/slate neutrals, clear typography scale, **border** + **shadow-sm** on cards, **radius** 8–12px, muted-foreground secondary text, sensible **gap** and **padding**, sidebar + header patterns when the product is an app shell. Open-source reference: github.com/shadcn-ui/ui — mirror that craft (spacing, hierarchy), adapted to our JSON schema (not literal React components).

Output ONE JSON object: { "frame": { "width", "height", "background", "children": [...] } }.

Core:
- USER / PRIORITY block is the only source of truth for app type, copy, and features. **Single-intent short prompts** (e.g. only "dashboard", only "settings"): build **exactly that one screen** — no extra landing sections, onboarding, or unrelated flows. Never substitute a stock analytics dashboard unless they asked for metrics/SaaS KPIs.
- Internally classify archetype (chatbot, dashboard, landing, ecommerce, portfolio, CRM, admin, social, finance, booking, messaging, productivity) and include the regions that archetype implies — always complete, never hollow shells.
- Short prompts expand into real products (e.g. "make a chatbot" → history sidebar, thread, bubbles, composer, new chat).

CRITICAL — NO CLONE-UI: Each generation must look DIFFERENT from generic templates:
- Do NOT repeat the same layout skeleton every time (e.g. "left nav + 3 KPI cards" unless the user asked for KPIs).
- Derive a fresh COLOR STORY from the user's words (e.g. "coffee" → warm browns/cream; "ocean" → teals; "night" → deep slate + one accent). Avoid cliché blue-purple gradients unless requested.
- Vary: sidebar width, card density, radius scale (6–20px), typography scale, and whether the chrome is minimal vs dense.
- If the prompt is vague, still pick a coherent theme and stick to it — but change that theme from one generation to the next when the wording differs.

Technical:
- Every element: id (unique string), type, x, y, width, height.
- Use nested "frame" and "container" to group regions; use "divider" / "spacer" for rhythm.
- Hex colors only; nested x,y relative to parent.
- Premium density: enough real labels, nav, fields, list rows, or chat bubbles — no "Lorem ipsum".

VISUAL (required — the renderer uses these fields):
- Root "frame" MUST set "background" (hex) for the full canvas.
- Every surface (sidebar, topbar, card, hero, nested frame) MUST set "backgroundColor" and/or "styles.backgroundColor", "borderRadius", "padding"/"gap", "boxShadow" where appropriate.
- "text" nodes: "color" + "styles.fontSize" / "fontWeight" (vary heading vs body).
- "button", "input": "backgroundColor", "color", "styles.borderRadius", optional "styles.borderColor".
- Optional "styles.opacity" (0–1) for subtle layers; optional "rotation" on decorative elements.

Output ONLY valid JSON. No markdown, no commentary.`;

const ARCHETYPE_SPECS: { id: string; patterns: RegExp; spec: string }[] = [
  {
    id: "ai_chatbot",
    patterns: /\b(ai\s*chat|chatbot|gpt|llm|assistant|copilot|conversational\s+ai)\b/i,
    spec: 'Archetype AI_CHATBOT: Left sidebar = chat history list + "New chat" control; main = scrollable thread with distinct user vs assistant message blocks (use cards or grouped text); bottom = composer (input + send). Optional empty/loading line in thread.',
  },
  {
    id: "messaging_app",
    patterns: /\b(slack|teams|messaging|dm|direct message|channel)\b/i,
    spec: "Archetype MESSAGING: Channel list sidebar; message timeline; composer with attachments hint; unread badges in list.",
  },
  {
    id: "booking_app",
    patterns: /\b(booking|reservation|calendar|schedule appointment|reserve)\b/i,
    spec: "Archetype BOOKING: Calendar or slot grid, summary card, confirm CTA, time/location fields.",
  },
  {
    id: "ecommerce",
    patterns: /\b(shop|store|e-?commerce|cart|checkout|product catalog|sku)\b/i,
    spec: "Archetype ECOMMERCE: Product grid or detail, cart/checkout affordances, pricing text, primary CTA.",
  },
  {
    id: "portfolio",
    patterns: /\b(portfolio|case study|creative\s+work|showcase)\b/i,
    spec: "Archetype PORTFOLIO: Hero + project grid; about/contact strip; strong typography hierarchy.",
  },
  {
    id: "crm",
    patterns: /\b(crm|sales pipeline|leads?|deals?|opportunities)\b/i,
    spec: "Archetype CRM: Pipeline or table of leads; activity sidebar; search/filter cues.",
  },
  {
    id: "admin_panel",
    patterns: /\b(admin|moderation|user management|roles|permissions)\b/i,
    spec: "Archetype ADMIN: Data table + row actions; filter bar; sidebar for sections.",
  },
  {
    id: "social_app",
    patterns: /\b(social|feed|followers|following|timeline|posts?)\b/i,
    spec: "Archetype SOCIAL: Feed column; composer or story strip; engagement icons on items.",
  },
  {
    id: "finance_dashboard",
    patterns: /\b(finance|trading|portfolio|stocks|crypto|market)\b/i,
    spec: "Archetype FINANCE: Positions or watchlist, chart card, buy/sell or summary metrics tied to finance copy.",
  },
  {
    id: "landing_page",
    patterns: /\b(landing|marketing page|hero\s+cta|waitlist|signup page)\b/i,
    spec: "Archetype LANDING: Bold hero, value props row, CTA buttons, optional pricing strip — not a dense app chrome unless asked.",
  },
  {
    id: "productivity_tool",
    patterns: /\b(todo|tasks?|notes|kanban|habit|planner)\b/i,
    spec: "Archetype PRODUCTIVITY: Lists/boards, quick-add, priorities or columns matching the request.",
  },
  {
    id: "saas_dashboard",
    patterns: /\b(dashboard|analytics|metrics|kpi|reporting|insights)\b/i,
    spec: "Archetype SAAS_DASHBOARD: Sidebar + topbar + KPI cards permitted when user asks for metrics; labels must match their domain words.",
  },
];

const STYLE_VARIATIONS = [
  "Visual direction A: crisp high-contrast, 8px radius, 8px grid rhythm, strong type scale.",
  "Visual direction B: soft elevated cards, 14–16px radius, generous whitespace, subtle borders.",
  "Visual direction C: editorial / minimal chrome, one bold accent, lots of negative space.",
  "Visual direction D: dense productivity UI, compact rows, 6–10px radius, muted surfaces.",
  "Visual direction E: deep sidebar + airy content, glassy / layered surfaces, one neon accent max.",
  "Visual direction F: founder-style dark slate + warm accent (not default indigo/purple), asymmetric content block.",
] as const;

const COLOR_SEEDS = [
  "warm amber and cream",
  "deep teal and mint green",
  "slate grey and coral",
  "forest green and sand",
  "navy blue and gold",
  "rose pink and charcoal",
  "deep plum and soft lavender",
  "burnt orange and ivory",
  "midnight blue and electric cyan",
  "earthy terracotta and warm white",
  "cool grey and lime green",
  "deep crimson and blush",
];

// ─── Helper functions ────────────────────────────────────────────────────────

function getViewportDims(viewport?: ViewportType): { width: number; height: number } {
  return viewport ? VIEWPORT_DIMENSIONS[viewport] : { width: 1440, height: 900 };
}

function archetypeHintForPrompt(raw: string): string {
  const t = raw.trim();
  for (const a of ARCHETYPE_SPECS) {
    if (a.patterns.test(t)) return a.spec;
  }
  return "Archetype: Infer from PRIORITY text. Include typical regions for that product (nav, primary work area, actions). Avoid generic KPI cards unless the user asked for analytics or business metrics.";
}

// KEY FIX: Uses Math.random() instead of hashPrompt() so every generation
// gets a different style direction instead of always the same one.
function styleRotationHint(): string {
  const idx = Math.floor(Math.random() * STYLE_VARIATIONS.length);
  return `${STYLE_VARIATIONS[idx]} Pick a different palette family than cliché blue-purple SaaS unless the prompt dictates it.`;
}

function buildUserPrompt(
  parsed: ReturnType<typeof parsePromptWithOptions>,
  options?: Pick<LayoutGeneratorOptions, "runtimeTarget" | "languageTarget">,
  designTheme?: DesignTheme
): string {
  const dims = getViewportDims(parsed.viewport);
  const targetHint = options?.runtimeTarget ? `Runtime target: ${options.runtimeTarget}. ` : "";
  const languageHint = options?.languageTarget ? `Preferred language: ${options.languageTarget}. ` : "";

  const themeHintPalette =
    designTheme != null
      ? `Use this palette: primary=${designTheme.colors.primary}, background=${designTheme.colors.background}, surface=${designTheme.colors.surface}, sidebar=${designTheme.colors.sidebar ?? designTheme.colors.primary}, text=${designTheme.colors.text}, muted=${designTheme.colors.textMuted}. Font: ${designTheme.typography.fontFamily}. `
      : parsed.theme === "dark"
        ? "Dark theme: #0d0f12 bg, #1a1b23 cards, #151620 sidebar, #e6edf3 text. "
        : "Light theme: #f8fafc / #f1f5f9 backgrounds, white cards. ";

  const compHint =
    parsed.components.length > 0
      ? `Required UI pieces: ${parsed.components.join(", ")}. `
      : "";
  const domainHint = parsed.domain ? `Domain: ${parsed.domain}. ` : "";
  const presetHint = parsed.designPreset ? `Style: ${parsed.designPreset}. ` : "";
  const templateHint = parsed.sectionTemplate ? `Structure: ${parsed.sectionTemplate}. ` : "";
  const viewportHint =
    parsed.viewport === "mobile"
      ? "MOBILE: no sidebar; top bar only; full-width stacked sections."
      : parsed.viewport === "tablet"
        ? "TABLET: optional narrow sidebar; 2-column content where appropriate."
        : "DESKTOP: sidebar + topbar + main content grid when appropriate.";

  const arch = archetypeHintForPrompt(parsed.raw);
  const styleV = styleRotationHint();

  const rawLower = parsed.raw.trim().toLowerCase();
  const wordCount = rawLower.split(/\s+/).filter(Boolean).length;
  const narrowIntent =
    wordCount <= 3 && /^(dashboard|settings|login|admin)$/.test(rawLower)
      ? "\n\nSCOPE LOCK: The user asked for a **single screen type** only. Deliver **one** complete screen for that type — no extra marketing sections, no unrelated frames."
      : "";

  // Random color seed forces the model to use a different palette every call
  const randomColorSeed = COLOR_SEEDS[Math.floor(Math.random() * COLOR_SEEDS.length)];
  const uniqueBias = `COLOR DIRECTION: Build the palette around "${randomColorSeed}" unless the user's prompt specifies exact colors. GENERATION ID: ${Date.now()} — vary shell layout, sidebar width, card density, border-radius scale from any prior output. Obey PRIORITY block first, then this directive for freshness.`;

  return `=== PRIORITY: BUILD EXACTLY THIS (titles, nav, widgets must reflect these words) ===
"""
${parsed.raw}
"""
=== END PRIORITY ===

PRODUCT SHAPING: ${arch}
${narrowIntent}

STYLE / UNIQUENESS: ${styleV}

${uniqueBias}

RULES: Valid JSON only; every node needs id, type, x, y, width, height. Icons use props.iconName (Lucide). Invent realistic labels FROM THE PRIORITY BLOCK — no generic "Total Revenue" unless the user asked for analytics. No Lorem ipsum. ${viewportHint}

Frame: ${dims.width}x${dims.height}. ${parsed.style} look. ${themeHintPalette}${targetHint}${languageHint}${compHint}${domainHint}${presetHint}${templateHint}

Return ONLY the JSON layout object.`;
}

function ensureIds(el: AIUIElement, prefix: string, idx: number): AIUIElement {
  const id = el.id || `${prefix}_${idx}`;
  const children = el.children?.map((c, i) => ensureIds(c, `${id}_child`, i)) ?? [];
  return { ...el, id, children };
}

function countMeaningfulUnits(el: AIUIElement): number {
  const m =
    el.type === "text" ||
    el.type === "icon" ||
    el.type === "button" ||
    el.type === "input" ||
    el.type === "image";
  let n = m ? 1 : 0;
  for (const c of el.children ?? []) n += countMeaningfulUnits(c);
  return n;
}

function countSubtreeNodes(el: AIUIElement): number {
  let n = 1;
  for (const c of el.children ?? []) n += countSubtreeNodes(c);
  return n;
}

function isLayoutMinimal(layout: AIUILayout): boolean {
  const roots = layout.frame.children ?? [];
  if (roots.length === 0) return true;
  let totalNodes = 0;
  let meaningful = 0;
  for (const c of roots) {
    totalNodes += countSubtreeNodes(c);
    meaningful += countMeaningfulUnits(c);
  }
  if (meaningful >= 5) return false;
  if (totalNodes >= 12) return false;
  if (meaningful >= 4 && totalNodes >= 8) return false;
  return true;
}

function parseLayoutResponse(content: string): AIUILayout | null {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as { frame?: AIUIFrame };
    if (!parsed?.frame?.children) return null;
    const frame = parsed.frame;
    frame.children = frame.children.map((c, i) => ensureIds(c, "el", i));
    return { frame, metadata: { generatedAt: new Date().toISOString(), version: "1.0" } };
  } catch {
    return null;
  }
}

function buildImageHint(userPrompt: string, images?: string[]): string {
  if (!images || images.length === 0) return "";
  const isDesignReference = /replicate|recreate|copy|match|like this|similar to|based on this|design reference|reference image|screenshot|mockup|wireframe|1:1|pixel|identical/i.test(userPrompt);
  return isDesignReference
    ? "\n\nDESIGN REFERENCE — **1:1 fidelity**: The user attached a screenshot or mockup. Reproduce **layout regions, proportions, colors, typography weights, spacing, and component placement** as closely as this JSON schema allows. Do not substitute a generic template; mirror the reference."
    : "\n\nThe user attached image(s). Match **composition and palette** closely; treat as a **visual spec** — not loose inspiration.";
}

function logDevParsedLayout(where: string, layout: AIUILayout) {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    const summary = JSON.stringify({
      frameBg: layout.frame.background,
      roots: (layout.frame.children ?? []).slice(0, 5).map((c) => ({
        type: c.type,
        bg: c.backgroundColor ?? c.styles?.backgroundColor,
        color: c.color ?? c.styles?.color,
        fontSize: c.styles?.fontSize,
      })),
    });
    // eslint-disable-next-line no-console
    console.debug(`[Haze Agent] layout (${where}):`, summary);
  }
}

// ─── Main export: calls LLM, falls back to local only on failure ─────────────

export async function generateLayoutFromPrompt(
  prompt: string,
  options?: LayoutGeneratorOptions
): Promise<AIUILayout> {
  const parsed = parsePromptWithOptions(prompt, {
    theme: options?.style,
    viewport: options?.viewport,
  });

  const userPrompt = buildUserPrompt(
    parsed,
    {
      runtimeTarget: options?.runtimeTarget,
      languageTarget: options?.languageTarget,
    },
    options?.designTheme
  );

  const imageHint = buildImageHint(userPrompt, options?.images);

  const userContent = `${userPrompt}${imageHint}

JSON SCHEMA (no example labels — all copy must come from the PRIORITY block above):
${ABSTRACT_JSON_SHAPE_GUIDE}`;

  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  const hasCloudKey = Boolean(apiKey || getAnthropicApiKeyFromEnv());

  if (!hasCloudKey) {
    console.warn("[Haze AI] ⚠️ No API key found (ANTHROPIC_API_KEY, CLAUDE_API_KEY, or OPENAI_API_KEY). Falling back to local layout.");
    return getFallbackLayout(parsed);
  }

  try {
    // PRIMARY: Call the LLM (Anthropic first, then OpenAI per providers/index.ts priority)
    const { content } = await callLLM({
      apiKey,
      model: options?.model ?? getOpenAIDefaultModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.75, // Higher temp = more creative, varied output
      maxTokens: 3200,
      jsonMode: true,
      timeoutMs: 40_000,
    });

    if (content) {
      logDevParsedLayout("cloud", { frame: { width: 0, height: 0, background: "", children: [] }, metadata: {} } as AIUILayout);
      let layout = parseLayoutResponse(content);
      if (layout && !isLayoutMinimal(layout)) {
        layout.frame = validateAndFixFrame(layout.frame);
        layout.metadata = { ...layout.metadata, prompt };
        logDevParsedLayout("cloud", layout);
        return layout;
      }

      // RETRY: If first response was empty or too sparse
      const { content: retryContent } = await callLLM({
        apiKey,
        model: options?.model ?? getOpenAIDefaultModel(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `${userContent}\n\nIMPORTANT: Your previous output was empty, invalid JSON, or too minimal. Return a COMPLETE app JSON with at least 5 meaningful text/button/input elements and multiple regions (sidebar, main, etc.). No markdown — JSON only.`,
          },
        ],
        temperature: 0.6,
        maxTokens: 3200,
        jsonMode: true,
        timeoutMs: 40_000,
      });

      if (retryContent) {
        layout = parseLayoutResponse(retryContent);
        if (layout && !isLayoutMinimal(layout)) {
          layout.frame = validateAndFixFrame(layout.frame);
          layout.metadata = { ...layout.metadata, prompt };
          logDevParsedLayout("cloud-retry", layout);
          return layout;
        }
      }
    }

    console.warn("[Haze AI] ⚠️ LLM returned empty or minimal layout — falling back to local.");
    const fb = getFallbackLayout(parsed);
    logDevParsedLayout("fallback", fb);
    return fb;

  } catch (err) {
    console.error("[Haze AI] Layout generation error:", err);
    console.warn("[Haze AI] ⚠️ Falling back to static layout — check your API key and billing.");
    return getFallbackLayout(parsed);
  }
}

// ─── Local fallback (runs only when LLM fails) ───────────────────────────────

function titleFromUserPrompt(raw: string): string {
  const line = raw.trim().split(/[\n.!?]/)[0]?.trim() ?? raw.trim();
  if (!line) return "App";
  return line.length > 32 ? `${line.slice(0, 29)}…` : line;
}

const DEFAULT_FALLBACK_KPIS: { icon: string; label: string; value: string }[] = [
  { icon: "trending-up", label: "Total revenue", value: "$24.5k" },
  { icon: "users", label: "Active users", value: "1,284" },
  { icon: "activity", label: "Growth rate", value: "+12.4%" },
  { icon: "credit-card", label: "MRR", value: "$8.2k" },
];

function inferFallbackCards(raw: string): { icon: string; label: string; value: string }[] {
  const lower = raw.toLowerCase();
  const out: { icon: string; label: string; value: string }[] = [];
  const add = (row: { icon: string; label: string; value: string }) => {
    if (out.length >= 4) return;
    if (!out.some((x) => x.label === row.label)) out.push(row);
  };
  if (/todo|task|checklist|habit/.test(lower)) {
    add({ icon: "list-todo", label: "Open tasks", value: "12" });
    add({ icon: "check-circle", label: "Done today", value: "5" });
  }
  if (/music|playlist|spotify|audio|player/.test(lower)) {
    add({ icon: "music", label: "Library", value: "128 tracks" });
    add({ icon: "radio", label: "Stations", value: "8" });
  }
  if (/chat|message|inbox|mail/.test(lower)) {
    add({ icon: "message-circle", label: "Unread", value: "3" });
  }
  if (/analytics|metric|revenue|sales|kpi|finance|dashboard/.test(lower)) {
    add({ icon: "dollar-sign", label: "Revenue", value: "$24k" });
    add({ icon: "users", label: "Active users", value: "1.2k" });
  }
  if (/food|recipe|restaurant|order/.test(lower)) {
    add({ icon: "utensils", label: "Orders", value: "42" });
  }
  for (const row of DEFAULT_FALLBACK_KPIS) {
    if (out.length >= 4) break;
    add(row);
  }
  return out.slice(0, 4);
}

function mutedChartInnerBg(colors: RichTheme): string {
  const bg = colors.bg.toLowerCase();
  if (bg.startsWith("#") && bg.length === 7) {
    const r = parseInt(bg.slice(1, 3), 16);
    const g = parseInt(bg.slice(3, 5), 16);
    const b = parseInt(bg.slice(5, 7), 16);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum < 0.42 ? "#27272a" : "#f4f4f5";
  }
  return "#f4f4f5";
}

function getFallbackLayout(parsed: ReturnType<typeof parsePromptWithOptions>): AIUILayout {
  const dims = getViewportDims(parsed.viewport);
  const isMobile = parsed.viewport === "mobile";
  const isTablet = parsed.viewport === "tablet";
  const colors = resolveRichTheme(parsed);
  const isDashboard01 =
    parsed.components.includes("dashboard") &&
    !isMobile &&
    parsed.components.includes("sidebar") &&
    parsed.components.includes("topbar") &&
    parsed.components.includes("card");
  const hasSidebar = !isMobile && parsed.components.includes("sidebar");
  const hasTopbar =
    parsed.components.includes("topbar") || parsed.components.includes("navbar");
  const sidebarWidth = hasSidebar ? (isTablet ? 220 : isDashboard01 ? 256 : 280) : 0;
  const topbarHeight = hasTopbar ? 64 : 0;
  const contentX = sidebarWidth;
  const contentY = topbarHeight;
  const contentW = dims.width - sidebarWidth;

  const children: AIUIElement[] = [];
  const navColor = colors.text;
  const navMuted = colors.muted;

  const navItems = [
    { icon: "layout-dashboard", text: "Dashboard", color: navColor },
    { icon: "bar-chart-2", text: "Analytics", color: navMuted },
    { icon: "settings", text: "Settings", color: navMuted },
  ];

  if (hasSidebar) {
    const sidebarChildren: AIUIElement[] = [];
    navItems.forEach((item, i) => {
      const y = 32 + i * 36;
      sidebarChildren.push(
        {
          id: `nav_icon_${i + 1}`,
          type: "icon",
          x: 24,
          y: y - 4,
          width: 24,
          height: 24,
          props: { iconName: item.icon },
          color: item.color,
        },
        {
          id: `nav_${i + 1}`,
          type: "text",
          x: 56,
          y,
          width: 180,
          height: 24,
          text: item.text,
          color: item.color,
          styles: { fontSize: 13, fontWeight: 500 },
        }
      );
    });
    children.push({
      id: "sidebar_1",
      type: "sidebar",
      x: 0,
      y: 0,
      width: sidebarWidth,
      height: dims.height,
      backgroundColor: colors.sidebar,
      styles: { boxShadow: `1px 0 0 ${colors.sidebarBorder}` },
      children: sidebarChildren,
    });
  }

  if (hasTopbar) {
    children.push({
      id: "topbar_1",
      type: "topbar",
      x: contentX,
      y: 0,
      width: contentW,
      height: topbarHeight,
      backgroundColor: colors.topbar,
      styles: { boxShadow: colors.topbarShadow },
      children: [
        {
          id: "logo_icon",
          type: "icon",
          x: 24,
          y: 18,
          width: 28,
          height: 28,
          props: { iconName: "layout-dashboard" },
          color: colors.accent,
        },
        {
          id: "logo",
          type: "text",
          x: 60,
          y: 14,
          width: 220,
          height: 36,
          text: parsed.domain ? parsed.domain : titleFromUserPrompt(parsed.raw),
          color: colors.text,
          styles: { fontSize: 18, fontWeight: 600 },
        },
      ],
    });
  }

  const hasCards = parsed.components.includes("card");
  const hasHero = parsed.components.includes("hero");
  const hasForm = parsed.components.includes("form");
  const hasTable = parsed.components.includes("table");
  const hasPricing = parsed.components.includes("pricing");
  const hasLogin = parsed.components.includes("login");
  const hasModal = parsed.components.includes("modal");
  const hasGallery = parsed.components.includes("gallery");
  const hasSettings = parsed.components.includes("settings");

  const gap = 28;
  const padX = 24;
  const gapSm = 16;
  const gapLg = 24;
  const metricCardH = 152;
  const cardW = isMobile ? contentW - 32 : isTablet ? Math.min(360, (contentW - 36 - gap) / 2) : 340;
  const cardH = isMobile ? 132 : 204;
  const startX = contentX + (isMobile ? 16 : 36);
  const startXMain = isDashboard01 ? contentX + padX : startX;
  const dashHeaderH = hasCards && !hasHero ? (isMobile ? 52 : 76) : 0;
  const startY = contentY + 32 + dashHeaderH;
  const cardsPerRow = isMobile ? 1 : isTablet ? 2 : 2;
  const cardData = inferFallbackCards(parsed.raw);
  const cardBorderStyles =
    colors.cardBorderWidth && colors.cardBorderWidth > 0 && colors.cardBorderColor
      ? { borderWidth: colors.cardBorderWidth, borderColor: colors.cardBorderColor }
      : {};

  if (hasCards) {
    if (!hasHero) {
      children.push(
        {
          id: "dash_sec_title",
          type: "text",
          x: startX,
          y: contentY + 32,
          width: Math.min(520, contentW - 48),
          height: 30,
          text: "Overview",
          color: colors.text,
          styles: { fontSize: isMobile ? 20 : 22, fontWeight: 600 },
        },
        {
          id: "dash_sec_sub",
          type: "text",
          x: startX,
          y: contentY + (isMobile ? 58 : 64),
          width: Math.min(560, contentW - 48),
          height: 24,
          text: "Key metrics for your workspace — last 30 days.",
          color: colors.muted,
          styles: { fontSize: 14, fontWeight: 400 },
        }
      );
    }
    const cardCount = 4;
    for (let i = 0; i < cardCount; i++) {
      const col = i % cardsPerRow;
      const row = Math.floor(i / cardsPerRow);
      const data = cardData[i];
      children.push({
        id: `card_${i + 1}`,
        type: "card",
        x: startX + col * (cardW + gap),
        y: startY + row * (cardH + gap),
        width: cardW,
        height: cardH,
        backgroundColor: colors.card,
        styles: {
          padding: 28,
          borderRadius: colors.radiusCard,
          boxShadow: colors.cardShadow,
          ...cardBorderStyles,
        },
        children: [
          {
            id: `card_icon_${i + 1}`,
            type: "icon",
            x: 28,
            y: 28,
            width: 22,
            height: 22,
            props: { iconName: data.icon },
            color: colors.accent,
          },
          {
            id: `card_title_${i + 1}`,
            type: "text",
            x: 56,
            y: 28,
            width: cardW - 100,
            height: 22,
            text: data.label,
            color: colors.muted,
            styles: { fontSize: 12, fontWeight: 500 },
          },
          {
            id: `card_value_${i + 1}`,
            type: "text",
            x: 28,
            y: 64,
            width: cardW - 56,
            height: 44,
            text: data.value,
            color: colors.text,
            styles: { fontSize: 28, fontWeight: 600 },
          },
        ],
      });
    }

    if (isDashboard01) {
      const chartStrip = mutedChartInnerBg(colors);
      const chartY = startY + metricCardH + gapLg;
      const chartH = 240;
      const chartW = contentW - padX * 2;
      const barHeights = [55, 85, 48, 95, 68];
      const barW = 28;
      const barGap = 16;
      const innerTop = 72;
      const innerH = 140;
      const barBottom = innerTop + innerH;
      const chartChildren: AIUIElement[] = [
        { id: "chart_title", type: "text", x: 24, y: 20, width: 320, height: 24, text: "Total visitors", color: colors.text, styles: { fontSize: 16, fontWeight: 600 } },
        { id: "chart_sub", type: "text", x: 24, y: 44, width: 400, height: 18, text: "Last 3 months", color: colors.muted, styles: { fontSize: 13 } },
        { id: "chart_bg", type: "rectangle", x: 24, y: innerTop, width: chartW - 48, height: innerH, backgroundColor: chartStrip, styles: { borderRadius: 8 }, children: [] },
      ];
      const barsWidth = 5 * barW + 4 * barGap;
      const barStart = 24 + Math.max(0, (chartW - 48 - barsWidth) / 2);
      for (let b = 0; b < 5; b++) {
        const h = barHeights[b];
        chartChildren.push({ id: `chart_bar_${b}`, type: "rectangle", x: barStart + b * (barW + barGap), y: barBottom - h, width: barW, height: h, backgroundColor: colors.accent, styles: { borderRadius: 4 }, children: [] });
      }
      children.push({ id: "chart_block", type: "frame", x: startXMain, y: chartY, width: chartW, height: chartH, backgroundColor: colors.card, styles: { padding: 0, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow, ...cardBorderStyles }, children: chartChildren });
    }
  }

  if (hasLogin && !hasCards && !hasForm) {
    children.push({
      id: "login_1", type: "frame", x: contentX + (contentW - 420) / 2, y: contentY + 80, width: 420, height: 480,
      backgroundColor: colors.card, styles: { padding: 32, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
      children: [
        { id: "login_title", type: "text", x: 32, y: 32, width: 356, height: 32, text: "Welcome back", color: colors.text, styles: { fontSize: 22, fontWeight: 600 } },
        { id: "login_sub", type: "text", x: 32, y: 72, width: 356, height: 20, text: "Sign in to your account", color: colors.muted, styles: { fontSize: 14 } },
        { id: "login_email_l", type: "text", x: 32, y: 116, width: 356, height: 16, text: "Email", color: colors.text, styles: { fontSize: 12, fontWeight: 500 } },
        { id: "login_email", type: "input", x: 32, y: 138, width: 356, height: 46, text: "", color: colors.text },
        { id: "login_pass_l", type: "text", x: 32, y: 198, width: 356, height: 16, text: "Password", color: colors.text, styles: { fontSize: 12, fontWeight: 500 } },
        { id: "login_pass", type: "input", x: 32, y: 220, width: 356, height: 46, text: "", color: colors.text },
        { id: "login_btn", type: "button", x: 32, y: 292, width: 356, height: 48, text: "Sign In", backgroundColor: colors.accent, color: colors.onAccent, styles: { fontWeight: 600 } },
      ],
    });
  }

  if (hasForm && !hasLogin) {
    children.push({
      id: "form_1", type: "frame", x: contentX + 48, y: contentY + 48, width: 480, height: 420,
      backgroundColor: colors.card, styles: { padding: 32, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
      children: [
        { id: "form_title", type: "text", x: 32, y: 24, width: 416, height: 28, text: "Contact Form", color: colors.text, styles: { fontSize: 18, fontWeight: 600 } },
        { id: "form_name_l", type: "text", x: 32, y: 72, width: 416, height: 16, text: "Name", color: colors.text },
        { id: "form_name", type: "input", x: 32, y: 94, width: 416, height: 44, text: "", color: colors.text },
        { id: "form_email_l", type: "text", x: 32, y: 154, width: 416, height: 16, text: "Email", color: colors.text },
        { id: "form_email", type: "input", x: 32, y: 176, width: 416, height: 44, text: "", color: colors.text },
        { id: "form_msg_l", type: "text", x: 32, y: 236, width: 416, height: 16, text: "Message", color: colors.text },
        { id: "form_msg", type: "input", x: 32, y: 258, width: 416, height: 80, text: "", color: colors.text },
        { id: "form_btn", type: "button", x: 32, y: 358, width: 120, height: 44, text: "Submit", backgroundColor: colors.accent, color: colors.onAccent, styles: { fontWeight: 600 } },
      ],
    });
  }

  if (hasTable) {
    const tableY = hasCards ? startY + 2 * (cardH + gap) : contentY + 48;
    children.push({
      id: "table_1", type: "frame", x: contentX + 48, y: tableY, width: contentW - 96, height: 320,
      backgroundColor: colors.card, styles: { padding: 24, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
      children: [
        { id: "table_title", type: "text", x: 24, y: 16, width: 400, height: 28, text: "Data Table", color: colors.text, styles: { fontSize: 17, fontWeight: 600 } },
        { id: "table_h1", type: "text", x: 24, y: 56, width: 200, height: 20, text: "Name", color: colors.muted },
        { id: "table_h2", type: "text", x: 224, y: 56, width: 200, height: 20, text: "Status", color: colors.muted },
        { id: "table_h3", type: "text", x: 424, y: 56, width: 200, height: 20, text: "Date", color: colors.muted },
        { id: "table_r1", type: "text", x: 24, y: 92, width: 200, height: 20, text: "Project Alpha", color: colors.text },
        { id: "table_r2", type: "text", x: 24, y: 128, width: 200, height: 20, text: "Project Beta", color: colors.text },
        { id: "table_r3", type: "text", x: 24, y: 164, width: 200, height: 20, text: "Project Gamma", color: colors.text },
      ],
    });
  }

  if (hasPricing) {
    const plans = [
      { name: "Starter", price: "$9", desc: "For individuals" },
      { name: "Pro", price: "$29", desc: "For teams" },
      { name: "Enterprise", price: "$99", desc: "For organizations" },
    ];
    plans.forEach((plan, i) => {
      children.push({
        id: `pricing_${i + 1}`, type: "card", x: contentX + 48 + i * 312, y: contentY + 48, width: 280, height: 280,
        backgroundColor: colors.card, styles: { padding: 24, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
        children: [
          { id: `plan_title_${i + 1}`, type: "text", x: 24, y: 24, width: 232, height: 26, text: plan.name, color: colors.text, styles: { fontSize: 16, fontWeight: 600 } },
          { id: `plan_price_${i + 1}`, type: "text", x: 24, y: 56, width: 232, height: 36, text: plan.price + "/mo", color: colors.text },
          { id: `plan_desc_${i + 1}`, type: "text", x: 24, y: 104, width: 232, height: 20, text: plan.desc, color: colors.muted },
          { id: `plan_btn_${i + 1}`, type: "button", x: 24, y: 200, width: 232, height: 44, text: "Get Started", backgroundColor: colors.accent, color: colors.onAccent, styles: { fontWeight: 600 } },
        ],
      });
    });
  }

  if (hasSettings && !hasSidebar) {
    children.push({
      id: "settings_1", type: "settings", x: contentX + 48, y: contentY + 48, width: contentW - 96, height: 500,
      backgroundColor: colors.card, styles: { padding: 32, borderRadius: 12 },
      children: [
        { id: "set_title", type: "text", x: 32, y: 24, width: 400, height: 28, text: "Settings", color: colors.text },
        { id: "set_name_l", type: "text", x: 32, y: 80, width: 200, height: 16, text: "Display Name", color: colors.text },
        { id: "set_name", type: "input", x: 32, y: 102, width: 380, height: 44, text: "", color: colors.text },
        { id: "set_email_l", type: "text", x: 32, y: 166, width: 200, height: 16, text: "Email", color: colors.text },
        { id: "set_email", type: "input", x: 32, y: 188, width: 380, height: 44, text: "", color: colors.text },
        { id: "set_btn", type: "button", x: 32, y: 260, width: 150, height: 44, text: "Save Changes", backgroundColor: colors.accent, color: colors.onAccent, styles: { fontWeight: 600 } },
      ],
    });
  }

  if (hasGallery) {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        children.push({ id: `gallery_${r}_${c}`, type: "image", x: contentX + 48 + c * 216, y: contentY + 48 + r * 156, width: 200, height: 140, backgroundColor: colors.muted, children: [] });
      }
    }
  }

  if (hasModal) {
    children.push({
      id: "modal_1", type: "modal", x: (DEFAULT_WIDTH - 400) / 2, y: 200, width: 400, height: 280,
      backgroundColor: colors.card, styles: { padding: 24, borderRadius: 12 },
      children: [
        { id: "modal_title", type: "text", x: 24, y: 24, width: 352, height: 24, text: "Confirm Action", color: colors.text },
        { id: "modal_desc", type: "text", x: 24, y: 60, width: 352, height: 48, text: "Are you sure you want to proceed?", color: colors.muted },
        { id: "modal_cancel", type: "button", x: 24, y: 200, width: 100, height: 40, text: "Cancel", color: colors.text },
        { id: "modal_confirm", type: "button", x: 260, y: 200, width: 116, height: 40, text: "Confirm", backgroundColor: colors.accent, color: colors.onAccent },
      ],
    });
  }

  if (hasHero && !hasCards && !hasLogin) {
    const heroTitle = titleFromUserPrompt(parsed.raw);
    children.push({
      id: "hero_1", type: "hero", x: contentX + 40, y: contentY + 40, width: contentW - 80, height: 300,
      backgroundColor: colors.card, styles: { borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
      children: [
        { id: "hero_kicker", type: "text", x: 48, y: 44, width: 120, height: 20, text: "NEW", color: colors.accent, styles: { fontSize: 11, fontWeight: 700 } },
        { id: "hero_title", type: "text", x: 48, y: 76, width: Math.min(560, contentW - 160), height: 52, text: heroTitle, color: colors.text, styles: { fontSize: 36, fontWeight: 700 } },
        { id: "hero_sub", type: "text", x: 48, y: 140, width: Math.min(520, contentW - 160), height: 56, text: "Craft a polished desktop experience — layout, typography, and motion that feel intentional.", color: colors.muted, styles: { fontSize: 16 } },
        { id: "hero_cta", type: "button", x: 48, y: 216, width: 160, height: 48, text: "Get started", backgroundColor: colors.accent, color: colors.onAccent, styles: { fontWeight: 600 } },
      ],
    });
  }

  if (children.length === 0) {
    const t = titleFromUserPrompt(parsed.raw);
    children.push({
      id: "content_1", type: "frame", x: contentX + 48, y: contentY + 48, width: contentW - 96, height: 420,
      backgroundColor: colors.card, styles: { borderRadius: colors.radiusCard, boxShadow: colors.cardShadow, padding: 40 },
      children: [
        { id: "title_1", type: "text", x: 40, y: 40, width: contentW - 176, height: 40, text: t, color: colors.text, styles: { fontSize: 24, fontWeight: 600 } },
        { id: "sub_1", type: "text", x: 40, y: 92, width: contentW - 176, height: 48, text: 'Add keywords like "dashboard", "login", or "chat" in your prompt for richer layouts.', color: colors.muted, styles: { fontSize: 15 } },
      ],
    });
  }

  return {
    frame: validateAndFixFrame({ width: dims.width, height: dims.height, background: colors.bg, children }),
    metadata: { prompt: parsed.raw, generatedAt: new Date().toISOString(), version: "1.0" },
  };
}
