/**
 * Layout Generator - Creates UI component tree from parsed prompt
 * Uses OpenAI (or Anthropic via callLLM) — no local Ollama fallback.
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
import { callLLM, getOpenAIDefaultModel } from "../providers";

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

/** No concrete example UI JSON — avoids the model copying the same dashboard labels every time. */
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

Output ONE JSON object: { "frame": { "width", "height", "background", "children": [...] } }.

Core:
- USER / PRIORITY block is the only source of truth for app type, copy, and features. Never substitute a stock analytics dashboard unless they asked for metrics/SaaS KPIs.
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

function hashPrompt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function archetypeHintForPrompt(raw: string): string {
  const t = raw.trim();
  for (const a of ARCHETYPE_SPECS) {
    if (a.patterns.test(t)) return a.spec;
  }
  return "Archetype: Infer from PRIORITY text. Include typical regions for that product (nav, primary work area, actions). Avoid generic KPI cards unless the user asked for analytics or business metrics.";
}

function styleRotationHint(raw: string): string {
  const idx = hashPrompt(raw) % STYLE_VARIATIONS.length;
  return `${STYLE_VARIATIONS[idx]} Pick a different palette family than cliché blue-purple SaaS unless the prompt dictates it.`;
}

function getViewportDims(viewport?: ViewportType): { width: number; height: number } {
  return viewport ? VIEWPORT_DIMENSIONS[viewport] : { width: 1440, height: 900 };
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
  const styleV = styleRotationHint(parsed.raw);
  const generationBias = hashPrompt(`${parsed.raw}|${Date.now()}`);
  const uniqueBias = `GENERATION_BIAS: ${generationBias} — vary shell layout, accent color family, and component density vs any prior generic output; obey PRIORITY first, then this bias for freshness.`;

  return `=== PRIORITY: BUILD EXACTLY THIS (titles, nav, widgets must reflect these words) ===
"""
${parsed.raw}
"""
=== END PRIORITY ===

PRODUCT SHAPING: ${arch}

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

function countSubtreeNodes(el: AIUIElement): number {
  let n = 1;
  for (const c of el.children ?? []) n += countSubtreeNodes(c);
  return n;
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

function logDevRawModelResponse(label: string, raw: string) {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development" && raw) {
    // eslint-disable-next-line no-console
    console.debug(`[Haze AI] raw ${label} (truncated):`, raw.slice(0, 700));
  }
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
    console.debug(`[Haze AI] parsed JSON (${where}):`, summary);
  }
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
  const isDesignReference = /replicate|recreate|copy|match|like this|similar to|based on this|design reference|reference image|screenshot|mockup|wireframe/i.test(userPrompt);
  return isDesignReference
    ? "\n\nDESIGN REFERENCE: The user attached a reference image. REPLICATE this design: layout, colors, typography, spacing, structure. Create JSON that matches the visual design."
    : "\n\nThe user attached image(s). Use them as design inspiration. Place image elements where appropriate (hero, profile, product).";
}

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
  const hasCloudKey = Boolean(apiKey || process.env.ANTHROPIC_API_KEY);

  try {
    if (!hasCloudKey) {
      throw new Error(
        "OPENAI_API_KEY or ANTHROPIC_API_KEY is required for AI layout generation."
      );
    }

    const { content } = await callLLM({
      apiKey,
      model: options?.model ?? getOpenAIDefaultModel(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.42,
      maxTokens: 3200,
      jsonMode: true,
      timeoutMs: 40_000,
    });

    if (content) {
      logDevRawModelResponse("cloud", content);
      let layout = parseLayoutResponse(content);
      if (layout && !isLayoutMinimal(layout)) {
        layout.frame = validateAndFixFrame(layout.frame);
        layout.metadata = { ...layout.metadata, prompt };
        logDevParsedLayout("cloud", layout);
        return layout;
      }

      // Retry: richer layout if first pass was sparse or invalid JSON
      const { content: retryContent } = await callLLM({
        apiKey,
        model: options?.model ?? getOpenAIDefaultModel(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `${userContent}

IMPORTANT: Your previous output was empty, invalid JSON, or too minimal. Return a COMPLETE app JSON with at least 5 meaningful text/button/input elements and multiple regions (sidebar, main, etc.). No markdown — JSON only.`,
          },
        ],
        temperature: 0.35,
        maxTokens: 3200,
        jsonMode: true,
        timeoutMs: 40_000,
      });
      if (retryContent) {
        logDevRawModelResponse("cloud-retry", retryContent);
        layout = parseLayoutResponse(retryContent);
        if (layout && !isLayoutMinimal(layout)) {
          layout.frame = validateAndFixFrame(layout.frame);
          layout.metadata = { ...layout.metadata, prompt };
          logDevParsedLayout("cloud-retry", layout);
          return layout;
        }
      }
    }

    const fb = getFallbackLayout(parsed);
    logDevParsedLayout("fallback", fb);
    return fb;
  } catch (err) {
    console.error("Layout generation error:", err);
    return getFallbackLayout(parsed);
  }
}

function titleFromUserPrompt(raw: string): string {
  const line = raw.trim().split(/[\n.!?]/)[0]?.trim() ?? raw.trim();
  if (!line) return "App";
  return line.length > 32 ? `${line.slice(0, 29)}…` : line;
}

/** Fallback KPI rows loosely derived from user words (not identical every time). */
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
  if (/analytics|metric|revenue|sales|kpi|finance/.test(lower)) {
    add({ icon: "dollar-sign", label: "Revenue", value: "$24k" });
    add({ icon: "users", label: "Active users", value: "1.2k" });
  }
  if (/food|recipe|restaurant|order/.test(lower)) {
    add({ icon: "utensils", label: "Orders", value: "42" });
  }
  const seed = titleFromUserPrompt(raw);
  let i = 0;
  while (out.length < 4) {
    add({
      icon: (["activity", "sparkles", "layers", "gauge"] as const)[i % 4],
      label: i === 0 ? seed.slice(0, 22) || "Overview" : `Item ${i + 1}`,
      value: (["128", "84%", "Live", "+12%"] as const)[i % 4],
    });
    i += 1;
  }
  return out.slice(0, 4);
}

type ThemeColors = {
  bg: string;
  card: string;
  sidebar: string;
  topbar: string;
  text: string;
  muted: string;
};

function getThemeColors(th: "light" | "dark"): ThemeColors {
  return th === "dark"
    ? {
        bg: "#0d0f12",
        card: "#1a1b23",
        sidebar: "#151620",
        topbar: "#0d0f12",
        text: "#e6edf3",
        muted: "#8b949e",
      }
    : {
        bg: "#f8fafc",
        card: "#ffffff",
        sidebar: "#0f172a",
        topbar: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
      };
}

function getFallbackLayout(parsed: ReturnType<typeof parsePromptWithOptions>): AIUILayout {
  const dims = getViewportDims(parsed.viewport);
  const isMobile = parsed.viewport === "mobile";
  const isTablet = parsed.viewport === "tablet";
  const theme = parsed.theme ?? "dark";
  const colors = getThemeColors(theme);
  const hasSidebar = !isMobile && parsed.components.includes("sidebar");
  const hasTopbar =
    parsed.components.includes("topbar") || parsed.components.includes("navbar");
  const sidebarWidth = hasSidebar ? (isTablet ? 200 : 260) : 0;
  const topbarHeight = hasTopbar ? 64 : 0;
  const contentX = sidebarWidth;
  const contentY = topbarHeight;
  const contentW = dims.width - sidebarWidth;
  const contentH = dims.height - topbarHeight;

  const children: AIUIElement[] = [];
  const navColor = theme === "dark" ? "#e6edf3" : "#ffffff";
  const navMuted = theme === "dark" ? "#8b949e" : "#94a3b8";

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
      children: [
        {
          id: "logo_icon",
          type: "icon",
          x: 24,
          y: 18,
          width: 28,
          height: 28,
          props: { iconName: "layout-dashboard" },
          color: theme === "dark" ? "#5e5ce6" : "#0f172a",
        },
        {
          id: "logo",
          type: "text",
          x: 60,
          y: 16,
          width: 140,
          height: 32,
          text: parsed.domain ? parsed.domain : "App",
          color: colors.text,
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

  const gap = 24;
  const cardW = isMobile ? contentW - 32 : isTablet ? Math.min(340, (contentW - 36 - gap) / 2) : 320;
  const cardH = isMobile ? 120 : 180;
  const startX = contentX + (isMobile ? 16 : 36);
  const startY = contentY + 32;
  const cardsPerRow = isMobile ? 1 : isTablet ? 2 : 2;

  const cardData = inferFallbackCards(parsed.raw);

  if (hasCards) {
    const cardCount = isMobile ? 4 : 4;
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
        styles: { padding: 24, borderRadius: 12 },
        children: [
          {
            id: `card_icon_${i + 1}`,
            type: "icon",
            x: 24,
            y: 24,
            width: 24,
            height: 24,
            props: { iconName: data.icon },
            color: colors.muted,
          },
          {
            id: `card_title_${i + 1}`,
            type: "text",
            x: 56,
            y: 24,
            width: cardW - 80,
            height: 20,
            text: data.label,
            color: colors.muted,
          },
          {
            id: `card_value_${i + 1}`,
            type: "text",
            x: 24,
            y: 56,
            width: cardW - 48,
            height: 36,
            text: data.value,
            color: colors.text,
          },
        ],
      });
    }
  }

  if (hasLogin && !hasCards && !hasForm) {
    children.push({
      id: "login_1",
      type: "frame",
      x: contentX + (contentW - 420) / 2,
      y: contentY + 80,
      width: 420,
      height: 480,
      backgroundColor: colors.card,
      styles: { padding: 32, borderRadius: 12 },
      children: [
        { id: "login_title", type: "text", x: 32, y: 32, width: 356, height: 28, text: "Welcome back", color: colors.text },
        { id: "login_sub", type: "text", x: 32, y: 68, width: 356, height: 20, text: "Sign in to your account", color: colors.muted },
        { id: "login_email_l", type: "text", x: 32, y: 112, width: 356, height: 16, text: "Email", color: colors.text },
        { id: "login_email", type: "input", x: 32, y: 134, width: 356, height: 44, text: "", color: colors.text },
        { id: "login_pass_l", type: "text", x: 32, y: 194, width: 356, height: 16, text: "Password", color: colors.text },
        { id: "login_pass", type: "input", x: 32, y: 216, width: 356, height: 44, text: "", color: colors.text },
        { id: "login_btn", type: "button", x: 32, y: 288, width: 356, height: 48, text: "Sign In", color: "#ffffff" },
      ],
    });
  }

  if (hasForm && !hasLogin) {
    children.push({
      id: "form_1",
      type: "frame",
      x: contentX + 48,
      y: contentY + 48,
      width: 480,
      height: 420,
      backgroundColor: colors.card,
      styles: { padding: 32, borderRadius: 12 },
      children: [
        { id: "form_title", type: "text", x: 32, y: 24, width: 416, height: 24, text: "Contact Form", color: colors.text },
        { id: "form_name_l", type: "text", x: 32, y: 72, width: 416, height: 16, text: "Name", color: colors.text },
        { id: "form_name", type: "input", x: 32, y: 94, width: 416, height: 44, text: "", color: colors.text },
        { id: "form_email_l", type: "text", x: 32, y: 154, width: 416, height: 16, text: "Email", color: colors.text },
        { id: "form_email", type: "input", x: 32, y: 176, width: 416, height: 44, text: "", color: colors.text },
        { id: "form_msg_l", type: "text", x: 32, y: 236, width: 416, height: 16, text: "Message", color: colors.text },
        { id: "form_msg", type: "input", x: 32, y: 258, width: 416, height: 80, text: "", color: colors.text },
        { id: "form_btn", type: "button", x: 32, y: 358, width: 120, height: 44, text: "Submit", color: "#ffffff" },
      ],
    });
  }

  if (hasTable) {
    const tableY = hasCards ? startY + 2 * (cardH + gap) : contentY + 48;
    children.push({
      id: "table_1",
      type: "frame",
      x: contentX + 48,
      y: tableY,
      width: contentW - 96,
      height: 320,
      backgroundColor: colors.card,
      styles: { padding: 24, borderRadius: 12 },
      children: [
        { id: "table_title", type: "text", x: 24, y: 16, width: 400, height: 24, text: "Data Table", color: colors.text },
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
    const pricingY = contentY + 48;
    const planW = 280;
    const planGap = 32;
    const plans = [
      { name: "Starter", price: "$9", desc: "For individuals" },
      { name: "Pro", price: "$29", desc: "For teams" },
      { name: "Enterprise", price: "$99", desc: "For organizations" },
    ];
    plans.forEach((plan, i) => {
      children.push({
        id: `pricing_${i + 1}`,
        type: "card",
        x: contentX + 48 + i * (planW + planGap),
        y: pricingY,
        width: planW,
        height: 280,
        backgroundColor: colors.card,
        styles: { padding: 24, borderRadius: 12 },
        children: [
          { id: `plan_title_${i + 1}`, type: "text", x: 24, y: 24, width: 232, height: 24, text: plan.name, color: colors.text },
          { id: `plan_price_${i + 1}`, type: "text", x: 24, y: 56, width: 232, height: 36, text: plan.price + "/mo", color: colors.text },
          { id: `plan_desc_${i + 1}`, type: "text", x: 24, y: 104, width: 232, height: 20, text: plan.desc, color: colors.muted },
          { id: `plan_btn_${i + 1}`, type: "button", x: 24, y: 200, width: 232, height: 44, text: "Get Started", color: "#ffffff" },
        ],
      });
    });
  }

  if (hasSettings && !hasSidebar) {
    children.push({
      id: "settings_1",
      type: "settings",
      x: contentX + 48,
      y: contentY + 48,
      width: contentW - 96,
      height: 500,
      backgroundColor: colors.card,
      styles: { padding: 32, borderRadius: 12 },
      children: [
        { id: "set_title", type: "text", x: 32, y: 24, width: 400, height: 28, text: "Settings", color: colors.text },
        { id: "set_name_l", type: "text", x: 32, y: 80, width: 200, height: 16, text: "Display Name", color: colors.text },
        { id: "set_name", type: "input", x: 32, y: 102, width: 380, height: 44, text: "", color: colors.text },
        { id: "set_email_l", type: "text", x: 32, y: 166, width: 200, height: 16, text: "Email", color: colors.text },
        { id: "set_email", type: "input", x: 32, y: 188, width: 380, height: 44, text: "", color: colors.text },
        { id: "set_btn", type: "button", x: 32, y: 260, width: 150, height: 44, text: "Save Changes", color: "#ffffff" },
      ],
    });
  }

  if (hasGallery) {
    const galleryY = contentY + 48;
    const imgW = 200;
    const imgH = 140;
    const imgGap = 16;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        children.push({
          id: `gallery_${r}_${c}`,
          type: "image",
          x: contentX + 48 + c * (imgW + imgGap),
          y: galleryY + r * (imgH + imgGap),
          width: imgW,
          height: imgH,
          backgroundColor: colors.muted,
          children: [],
        });
      }
    }
  }

  if (hasModal) {
    children.push({
      id: "modal_1",
      type: "modal",
      x: (DEFAULT_WIDTH - 400) / 2,
      y: 200,
      width: 400,
      height: 280,
      backgroundColor: colors.card,
      styles: { padding: 24, borderRadius: 12 },
      children: [
        { id: "modal_title", type: "text", x: 24, y: 24, width: 352, height: 24, text: "Confirm Action", color: colors.text },
        { id: "modal_desc", type: "text", x: 24, y: 60, width: 352, height: 48, text: "Are you sure you want to proceed?", color: colors.muted },
        { id: "modal_cancel", type: "button", x: 24, y: 200, width: 100, height: 40, text: "Cancel", color: colors.text },
        { id: "modal_confirm", type: "button", x: 260, y: 200, width: 116, height: 40, text: "Confirm", color: "#ffffff" },
      ],
    });
  }

  if (hasHero && !hasCards && !hasLogin) {
    children.push({
      id: "hero_1",
      type: "hero",
      x: contentX + 48,
      y: contentY + 48,
      width: contentW - 96,
      height: 280,
      backgroundColor: theme === "dark" ? "#1a1b23" : "#0f172a",
      children: [
        {
          id: "hero_title",
          type: "text",
          x: 48,
          y: 48,
          width: 500,
          height: 40,
          text: "Welcome back",
          color: "#ffffff",
        },
        {
          id: "hero_sub",
          type: "text",
          x: 48,
          y: 100,
          width: 500,
          height: 24,
          text: "Here's what's happening with your projects.",
          color: "#94a3b8",
        },
      ],
    });
  }

  if (children.length === 0) {
    children.push({
      id: "content_1",
      type: "frame",
      x: 48,
      y: 48,
      width: DEFAULT_WIDTH - 96,
      height: 400,
      backgroundColor: colors.card,
      children: [
        {
          id: "title_1",
          type: "text",
          x: 24,
          y: 24,
          width: 400,
          height: 32,
          text: "Content",
          color: colors.text,
        },
      ],
    });
  }

  return {
    frame: validateAndFixFrame({
      width: dims.width,
      height: dims.height,
      background: colors.bg,
      children,
    }),
    metadata: {
      prompt: parsed.raw,
      generatedAt: new Date().toISOString(),
      version: "1.0",
    },
  };
}
