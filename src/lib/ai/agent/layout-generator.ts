/**
 * Layout Generator - Creates UI component tree from parsed prompt
 * Uses Ollama (local AI) - Coral 1.0. No API keys. Returns structured JSON for Haze.
 */

import type { AIUILayout, AIUIElement, AIUIFrame } from "../schema/ui-schema";
import { parsePromptWithOptions } from "./prompt-parser";
import { validateAndFixFrame } from "./rules-engine";
<<<<<<< HEAD
import { DEFAULT_WIDTH, VIEWPORT_DIMENSIONS, type ViewportType } from "../schema/ui-schema";
import type { DesignTheme } from "./theme-generator";
import { callLLM } from "../providers";
=======
import { DEFAULT_WIDTH } from "../schema/ui-schema";
import { generateFromOllama } from "../ollama";

export interface LayoutGeneratorOptions {
  model?: string;
  style?: "light" | "dark";
  runtimeTarget?: string;
  languageTarget?: string;
  /** Base64 data URLs - when using vision models; otherwise described in text */
  images?: string[];
}
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2

const DRIBBBLE_EXAMPLE_1 = `{
  "frame": {
    "width": 1440,
    "height": 900,
    "background": "#f8fafc",
    "children": [
      {
        "id": "sidebar_1",
        "type": "sidebar",
        "x": 0,
        "y": 0,
        "width": 260,
        "height": 900,
        "backgroundColor": "#0f172a",
        "children": [
          { "id": "nav_icon_1", "type": "icon", "x": 24, "y": 28, "width": 24, "height": 24, "props": { "iconName": "layout-dashboard" }, "color": "#ffffff" },
          { "id": "nav_1", "type": "text", "x": 56, "y": 32, "width": 180, "height": 24, "text": "Dashboard", "color": "#ffffff" },
          { "id": "nav_icon_2", "type": "icon", "x": 24, "y": 60, "width": 24, "height": 24, "props": { "iconName": "bar-chart-2" }, "color": "#94a3b8" },
          { "id": "nav_2", "type": "text", "x": 56, "y": 64, "width": 180, "height": 24, "text": "Analytics", "color": "#94a3b8" },
          { "id": "nav_icon_3", "type": "icon", "x": 24, "y": 92, "width": 24, "height": 24, "props": { "iconName": "folder" }, "color": "#94a3b8" },
          { "id": "nav_3", "type": "text", "x": 56, "y": 96, "width": 180, "height": 24, "text": "Projects", "color": "#94a3b8" },
          { "id": "nav_icon_4", "type": "icon", "x": 24, "y": 124, "width": 24, "height": 24, "props": { "iconName": "settings" }, "color": "#94a3b8" },
          { "id": "nav_4", "type": "text", "x": 56, "y": 128, "width": 180, "height": 24, "text": "Settings", "color": "#94a3b8" }
        ]
      },
      {
        "id": "topbar_1",
        "type": "topbar",
        "x": 260,
        "y": 0,
        "width": 1180,
        "height": 64,
        "backgroundColor": "#ffffff",
        "children": [
          { "id": "logo_icon", "type": "icon", "x": 32, "y": 18, "width": 28, "height": 28, "props": { "iconName": "layout-dashboard" }, "color": "#0f172a" },
          { "id": "logo", "type": "text", "x": 68, "y": 18, "width": 140, "height": 28, "text": "Acme", "color": "#0f172a" }
        ]
      },
      {
        "id": "card_1",
        "type": "card",
        "x": 296,
        "y": 96,
        "width": 320,
        "height": 180,
        "backgroundColor": "#ffffff",
        "styles": { "padding": 24, "borderRadius": 12 },
        "children": [
          { "id": "c1_icon", "type": "icon", "x": 24, "y": 24, "width": 24, "height": 24, "props": { "iconName": "dollar-sign" }, "color": "#64748b" },
          { "id": "c1_title", "type": "text", "x": 56, "y": 24, "width": 240, "height": 20, "text": "Total Revenue", "color": "#64748b" },
          { "id": "c1_val", "type": "text", "x": 24, "y": 56, "width": 272, "height": 36, "text": "$45,231", "color": "#0f172a" }
        ]
      },
      {
        "id": "card_2",
        "type": "card",
        "x": 640,
        "y": 96,
        "width": 320,
        "height": 180,
        "backgroundColor": "#ffffff",
        "styles": { "padding": 24, "borderRadius": 12 },
        "children": [
          { "id": "c2_icon", "type": "icon", "x": 24, "y": 24, "width": 24, "height": 24, "props": { "iconName": "users" }, "color": "#64748b" },
          { "id": "c2_title", "type": "text", "x": 56, "y": 24, "width": 240, "height": 20, "text": "Active Users", "color": "#64748b" },
          { "id": "c2_val", "type": "text", "x": 24, "y": 56, "width": 272, "height": 36, "text": "2,350", "color": "#0f172a" }
        ]
      },
      {
        "id": "card_3",
        "type": "card",
        "x": 984,
        "y": 96,
        "width": 320,
        "height": 180,
        "backgroundColor": "#ffffff",
        "styles": { "padding": 24, "borderRadius": 12 },
        "children": [
          { "id": "c3_icon", "type": "icon", "x": 24, "y": 24, "width": 24, "height": 24, "props": { "iconName": "trending-up" }, "color": "#64748b" },
          { "id": "c3_title", "type": "text", "x": 56, "y": 24, "width": 240, "height": 20, "text": "Conversion", "color": "#64748b" },
          { "id": "c3_val", "type": "text", "x": 24, "y": 56, "width": 272, "height": 36, "text": "+12.5%", "color": "#0f172a" }
        ]
      }
    ]
  }
}`;

const DRIBBBLE_EXAMPLE_2 = `{
  "frame": {
    "width": 1440,
    "height": 900,
    "background": "#f1f5f9",
    "children": [
      {
        "id": "sidebar_1",
        "type": "sidebar",
        "x": 0,
        "y": 0,
        "width": 280,
        "height": 900,
        "backgroundColor": "#1e293b",
        "children": [
          { "id": "nav_icon_1", "type": "icon", "x": 32, "y": 36, "width": 24, "height": 24, "props": { "iconName": "home" }, "color": "#f8fafc" },
          { "id": "nav_1", "type": "text", "x": 64, "y": 40, "width": 200, "height": 24, "text": "Overview", "color": "#f8fafc" },
          { "id": "nav_icon_2", "type": "icon", "x": 32, "y": 72, "width": 24, "height": 24, "props": { "iconName": "bar-chart-2" }, "color": "#94a3b8" },
          { "id": "nav_2", "type": "text", "x": 64, "y": 76, "width": 200, "height": 24, "text": "Reports", "color": "#94a3b8" },
          { "id": "nav_icon_3", "type": "icon", "x": 32, "y": 108, "width": 24, "height": 24, "props": { "iconName": "settings" }, "color": "#94a3b8" },
          { "id": "nav_3", "type": "text", "x": 64, "y": 112, "width": 200, "height": 24, "text": "Settings", "color": "#94a3b8" }
        ]
      },
      {
        "id": "topbar_1",
        "type": "topbar",
        "x": 280,
        "y": 0,
        "width": 1160,
        "height": 72,
        "backgroundColor": "#ffffff",
        "children": [
          { "id": "logo_icon", "type": "icon", "x": 32, "y": 24, "width": 24, "height": 24, "props": { "iconName": "layout-dashboard" }, "color": "#0f172a" },
          { "id": "logo", "type": "text", "x": 64, "y": 22, "width": 120, "height": 28, "text": "Dashboard", "color": "#0f172a" }
        ]
      },
      {
        "id": "hero_1",
        "type": "hero",
        "x": 320,
        "y": 104,
        "width": 1080,
        "height": 240,
        "backgroundColor": "#0f172a",
        "children": [
          { "id": "hero_title", "type": "text", "x": 48, "y": 48, "width": 500, "height": 36, "text": "Welcome back", "color": "#ffffff" },
          { "id": "hero_sub", "type": "text", "x": 48, "y": 96, "width": 400, "height": 24, "text": "Here's what's happening with your projects.", "color": "#94a3b8" }
        ]
      }
    ]
  }
}`;

const SYSTEM_PROMPT = `You are an elite UI/UX designer. Generate RICH, DETAILED UI layouts as JSON.

⚠️ CRITICAL - NEVER output a single rectangle or empty layout. Every layout MUST have:
- At least 3 major sections (e.g. sidebar + topbar + content area, or hero + cards + footer)
- Sidebar (260px) with nav items: icon + text per item. Types: layout-dashboard, bar-chart-2, settings, folder
- Topbar (64px) with logo icon + text
- At least 3 CARDS in the content area. Each card MUST have children: icon, title text, value text
- Real content: "Total Revenue", "$45,231", "Active Users", "2,350" — never empty or placeholder

FORMAT - copy this structure exactly:
{
  "frame": { "width": 1440, "height": 900, "background": "#0d0f12", "children": [
    { "id": "sidebar_1", "type": "sidebar", "x": 0, "y": 0, "width": 260, "height": 900, "backgroundColor": "#151620", "children": [
      { "id": "nav_icon_1", "type": "icon", "x": 24, "y": 28, "width": 24, "height": 24, "props": { "iconName": "layout-dashboard" }, "color": "#ffffff" },
      { "id": "nav_1", "type": "text", "x": 56, "y": 32, "width": 180, "height": 24, "text": "Dashboard", "color": "#ffffff" }
    ]},
    { "id": "topbar_1", "type": "topbar", "x": 260, "y": 0, "width": 1180, "height": 64, "backgroundColor": "#0d0f12", "children": [
      { "id": "logo", "type": "text", "x": 32, "y": 18, "width": 140, "height": 28, "text": "App", "color": "#e6edf3" }
    ]},
    { "id": "card_1", "type": "card", "x": 296, "y": 96, "width": 320, "height": 180, "backgroundColor": "#1a1b23", "styles": { "padding": 24, "borderRadius": 12 }, "children": [
      { "id": "c1_icon", "type": "icon", "x": 24, "y": 24, "width": 24, "height": 24, "props": { "iconName": "dollar-sign" }, "color": "#8b949e" },
      { "id": "c1_title", "type": "text", "x": 56, "y": 24, "width": 240, "height": 20, "text": "Total Revenue", "color": "#8b949e" },
      { "id": "c1_val", "type": "text", "x": 24, "y": 56, "width": 272, "height": 36, "text": "$45,231", "color": "#e6edf3" }
    ]}
  ]}
}

<<<<<<< HEAD
RULES:
- Output ONLY valid JSON. No markdown, no \`\`\`json\`\`\`, no explanation.
- Every element MUST have: id (unique string), type, x, y, width, height.
- Valid types: navbar, sidebar, topbar, hero, card, dashboard, form, table, button, text, input, image, icon, frame, container.
- ALWAYS add icons: sidebar nav items need icons (layout-dashboard, bar-chart-2, folder, settings, home, users). Cards need icons (dollar-sign, users, trending-up, shopping-cart, activity). Topbar needs logo icon. Use type "icon" with props: { "iconName": "lucide-name" }. Lucide icons: layout-dashboard, bar-chart-2, settings, home, users, dollar-sign, trending-up, shopping-cart, activity, folder, pie-chart.
- Use hex colors only.
- Children coordinates (x, y) are relative to parent.
- For DESKTOP (1440x900): Sidebar at x=0, topbar at x=sidebar_width. Cards 320x180, 3-4 per row, gap 24px.
- For TABLET (768x1024): Optional sidebar 200px. Cards ~340px wide, 2 per row.
- For MOBILE (375x812): NO sidebar. Use topbar only. Cards full width, stacked vertically. Single column layout.`;

function getViewportDims(viewport?: ViewportType): { width: number; height: number } {
  return viewport ? VIEWPORT_DIMENSIONS[viewport] : { width: 1440, height: 900 };
}

function buildUserPrompt(parsed: ReturnType<typeof parsePrompt>, theme?: DesignTheme): string {
  const comps = parsed.components.join(", ");
  const domain = parsed.domain ? ` Context: ${parsed.domain}.` : "";
  const dims = getViewportDims(parsed.viewport);
  const viewportHint = parsed.viewport === "mobile"
    ? " Mobile layout: no sidebar, use topbar or bottom nav, stacked cards, single column."
    : parsed.viewport === "tablet"
    ? " Tablet layout: optional collapsible sidebar, 2-column cards."
    : "";
  const themeHint = theme
    ? ` Use this color palette: primary=${theme.colors.primary}, background=${theme.colors.background}, surface=${theme.colors.surface}, sidebar=${theme.colors.sidebar ?? theme.colors.primary}, text=${theme.colors.text}, textMuted=${theme.colors.textMuted}. Font: ${theme.typography.fontFamily}.`
    : "";
  return `Generate a ${parsed.style} ${parsed.viewport ?? "desktop"} UI with: ${comps}.${domain}
Frame: ${dims.width}x${dims.height}. Light background (#f8fafc or #f1f5f9).${viewportHint}${themeHint}
Match the quality and structure of the examples. Return ONLY the JSON object.`;
=======
RULES: Every element needs id, type, x, y, width, height. Text elements need "text" and "color". Icons need props.iconName. Cards need styles.padding and styles.borderRadius. Return ONLY valid JSON, no markdown.`;

function buildUserPrompt(
  parsed: ReturnType<typeof parsePromptWithOptions>,
  options?: Pick<LayoutGeneratorOptions, "runtimeTarget" | "languageTarget">
): string {
  const targetHint = options?.runtimeTarget ? `Runtime target: ${options.runtimeTarget}. ` : "";
  const languageHint = options?.languageTarget ? `Preferred language: ${options.languageTarget}. ` : "";
  const themeHint = parsed.theme === "dark"
    ? "Dark theme: background #0d0f12, cards #1a1b23, sidebar #151620, text #e6edf3, muted #8b949e. "
    : "Light background (#f8fafc or #f1f5f9). ";
  const compHint = parsed.components.length > 0
    ? `\nDetected components (use as guidance, not limits): ${parsed.components.join(", ")}.`
    : "";
  const domainHint = parsed.domain ? `\nDomain/context: ${parsed.domain}.` : "";

  const presetHint = parsed.designPreset
    ? `\nDESIGN PRESET: ${parsed.designPreset}`
    : "";
  const templateHint = parsed.sectionTemplate
    ? `\nSECTION TEMPLATE: ${parsed.sectionTemplate}`
    : "";
  const realTextRule =
    "\nREAL TEXT: Use realistic copy (e.g. \"Track your revenue in real time\", \"Manage your team efficiently\"). NEVER use \"Lorem ipsum\" or placeholder gibberish.";

  const structureRule = parsed.sectionTemplate
    ? `\nSTRUCTURE: ${parsed.sectionTemplate}`
    : parsed.components.length > 0
      ? `\nINCLUDE these components with real content: ${parsed.components.join(", ")}. Each card needs icon + title + value. Sidebar needs icon + text per nav item.`
      : "\nINCLUDE: sidebar (nav with icons), topbar (logo), and at least 3 cards. Each card: icon, title, value (e.g. Total Revenue, $45,231).";

  return `USER REQUEST:
"""
${parsed.raw}
"""
Frame: 1440x900. ${themeHint}${targetHint}${languageHint}${compHint}${domainHint}${presetHint}${templateHint}${realTextRule}${structureRule}

Generate a complete layout. Return ONLY the JSON object, no markdown.`;
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
}

function ensureIds(el: AIUIElement, prefix: string, idx: number): AIUIElement {
  const id = el.id || `${prefix}_${idx}`;
  const children = el.children?.map((c, i) => ensureIds(c, `${id}_child`, i)) ?? [];
  return { ...el, id, children };
}

function countContentElements(el: AIUIElement): number {
  const isContent = el.type === "text" || el.type === "icon" || (el.type === "button" && el.text);
  let n = isContent ? 1 : 0;
  for (const c of el.children ?? []) n += countContentElements(c);
  return n;
}

function isLayoutMinimal(layout: AIUILayout): boolean {
  const children = layout.frame.children ?? [];
  if (children.length < 2) return true;
  const contentCount = children.reduce((sum, c) => sum + countContentElements(c), 0);
  return contentCount < 4; // Need at least 4 text/icon/button elements
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
<<<<<<< HEAD
  options?: { apiKey?: string; model?: string; viewport?: ViewportType; theme?: DesignTheme }
): Promise<AIUILayout> {
  const parsed = parsePrompt(prompt);
  if (options?.viewport) parsed.viewport = options.viewport;
  const userPrompt = buildUserPrompt(parsed, options?.theme);

  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  const hasAnyKey = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!hasAnyKey) {
    return getFallbackLayout(parsed);
  }

  try {
    const { content } = await callLLM({
      apiKey,
      model: options?.model ?? "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Example 1 (dashboard with KPI cards):\n${DRIBBBLE_EXAMPLE_1}` },
        { role: "assistant", content: "Understood." },
        { role: "user", content: `Example 2 (dashboard with hero):\n${DRIBBBLE_EXAMPLE_2}` },
        { role: "assistant", content: "Understood." },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.25,
      maxTokens: 4096,
      jsonMode: true,
    });

    if (!content) return getFallbackLayout(parsed);

    const layout = parseLayoutResponse(content);
    if (!layout) return getFallbackLayout(parsed);

    layout.frame = validateAndFixFrame(layout.frame);
    layout.metadata = { ...layout.metadata, prompt };
    return layout;
=======
  options?: LayoutGeneratorOptions
): Promise<AIUILayout> {
  const parsed = parsePromptWithOptions(prompt, { theme: options?.style });
  const userPrompt = buildUserPrompt(parsed, {
    runtimeTarget: options?.runtimeTarget,
    languageTarget: options?.languageTarget,
  });
  const imageHint = buildImageHint(userPrompt, options?.images);
  const model = options?.model;

  const fullPrompt = `${SYSTEM_PROMPT}

Full example to follow (dashboard with sidebar, topbar, 3 cards):
${DRIBBBLE_EXAMPLE_1}

---
${userPrompt}${imageHint}

Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    let output = await generateFromOllama(fullPrompt, {
      model,
      temperature: 0.2,
    });

    let parsedLayout: AIUILayout | null = parseLayoutResponse(output);

    if (!parsedLayout) {
      const retryPrompt = `Extract the JSON layout. Return ONLY valid JSON, no other text:

${output}`;
      const retry = await generateFromOllama(retryPrompt, { model, temperature: 0.1 });
      parsedLayout = parseLayoutResponse(retry);
    }

    if (!parsedLayout || isLayoutMinimal(parsedLayout)) {
      return getFallbackLayout(parsed);
    }

    parsedLayout.frame = validateAndFixFrame(parsedLayout.frame);
    parsedLayout.metadata = { ...parsedLayout.metadata, prompt };
    return parsedLayout;
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
  } catch (err) {
    console.error("Layout generation error (Ollama):", err);
    return getFallbackLayout(parsed);
  }
}

<<<<<<< HEAD
function getFallbackLayout(parsed: ReturnType<typeof parsePrompt>): AIUILayout {
  const dims = getViewportDims(parsed.viewport);
  const isMobile = parsed.viewport === "mobile";
  const isTablet = parsed.viewport === "tablet";
  const hasSidebar = !isMobile && parsed.components.includes("sidebar");
=======
type ThemeColors = {
  bg: string;
  card: string;
  sidebar: string;
  topbar: string;
  text: string;
  muted: string;
};

function getThemeColors(theme: "light" | "dark"): ThemeColors {
  return theme === "dark"
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
  const theme = parsed.theme ?? "dark";
  const colors = getThemeColors(theme);
  const hasSidebar = parsed.components.includes("sidebar");
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
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
<<<<<<< HEAD
      height: dims.height,
      backgroundColor: "#0f172a",
=======
      height: 900,
      backgroundColor: colors.sidebar,
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
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
<<<<<<< HEAD
=======
  const hasForm = parsed.components.includes("form");
  const hasTable = parsed.components.includes("table");
  const hasPricing = parsed.components.includes("pricing");
  const hasLogin = parsed.components.includes("login");
  const hasModal = parsed.components.includes("modal");
  const hasGallery = parsed.components.includes("gallery");
  const hasSettings = parsed.components.includes("settings");

  const cardW = 320;
  const cardH = 180;
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
  const gap = 24;
  const cardW = isMobile ? contentW - 32 : isTablet ? Math.min(340, (contentW - 36 - gap) / 2) : 320;
  const cardH = isMobile ? 120 : 180;
  const startX = contentX + (isMobile ? 16 : 36);
  const startY = contentY + 32;
  const cardsPerRow = isMobile ? 1 : isTablet ? 2 : 2;

  const cardData = [
    { icon: "dollar-sign", label: "Total Revenue", value: "$45,231" },
    { icon: "users", label: "Active Users", value: "2,350" },
    { icon: "shopping-cart", label: "Orders", value: "342" },
    { icon: "trending-up", label: "Growth", value: "+12.5%" },
  ];

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
<<<<<<< HEAD
      width: dims.width,
      height: dims.height,
      background: "#f8fafc",
=======
      width: DEFAULT_WIDTH,
      height: 900,
      background: colors.bg,
>>>>>>> 40654b5c72e1012b95437f52552b8bd9ed7b0ed2
      children,
    }),
    metadata: {
      prompt: parsed.raw,
      generatedAt: new Date().toISOString(),
      version: "1.0",
    },
  };
}
