/**
 * Layout Generator - Creates UI component tree from parsed prompt
 * Uses LLM API to generate structured JSON (OpenAI compatible)
 * Design principles inspired by Dribbble: clean, modern, professional UI
 */

import type { AIUILayout, AIUIElement, AIUIFrame } from "../schema/ui-schema";
import { parsePromptWithOptions } from "./prompt-parser";
import { validateAndFixFrame } from "./rules-engine";
import { DEFAULT_WIDTH } from "../schema/ui-schema";

export interface LayoutGeneratorOptions {
  apiKey?: string;
  model?: string;
  style?: "light" | "dark";
  runtimeTarget?: string;
  languageTarget?: string;
  /** Base64 data URLs for vision - AI will understand and place images per user instructions */
  images?: string[];
}

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

const SYSTEM_PROMPT = `You are an expert UI designer. Your job is to CAREFULLY READ and UNDERSTAND the user's prompt before generating anything.

CRITICAL: Analyze the FULL user request. Do NOT just match keywords. The user may want:
- A specific type of dashboard (e.g. "e-commerce dashboard with order stats" vs "fitness dashboard with workout charts")
- Custom content (e.g. "dashboard for a coffee shop" → use coffee-related labels like "Daily Sales", "Brews Today")
- Specific layout preferences (e.g. "minimal dashboard with only 2 cards")
- Images in specific places (e.g. "hero section with the uploaded photo as background")
- Domain-specific UI (e.g. "hospital patient dashboard" → medical terminology)

Read every word. Infer intent. Generate exactly what they asked for, not a generic template.

DRIBBBLE DESIGN PRINCIPLES:
- Generous whitespace: 24-32px between major sections, 16-24px inside cards
- Clear typography hierarchy: titles 18-24px, labels 12-14px, values 24-36px
- Subtle color palette: light grays (#f8fafc, #f1f5f9) for backgrounds, dark (#0f172a, #1e293b) for sidebars, muted (#64748b, #94a3b8) for secondary text
- Rounded corners: 8-12px on cards and containers
- Sidebar: dark background, 260-280px wide, full height, nav items 32px apart
- Topbar: white, 64-72px tall
- Cards: white, 300-340px wide, 160-200px tall, arranged in a 2-3 column grid with 24px gaps
- Never use tiny dimensions: text needs width ≥80px to display, cards need height ≥140px

STRICT OUTPUT FORMAT - Return ONLY valid JSON:
{
  "frame": {
    "width": 1440,
    "height": 900,
    "background": "#f8fafc",
    "children": [ ... ]
  }
}

RULES:
- Output ONLY valid JSON. No markdown, no \`\`\`json\`\`\`, no explanation.
- Every element MUST have: id (unique string), type, x, y, width, height.
- Valid types: navbar, sidebar, topbar, hero, card, dashboard, form, table, button, text, input, image, icon, frame, container.
- ALWAYS add icons: sidebar nav items need icons (layout-dashboard, bar-chart-2, folder, settings, home, users). Cards need icons (dollar-sign, users, trending-up, shopping-cart, activity). Topbar needs logo icon. Use type "icon" with props: { "iconName": "lucide-name" }. Lucide icons: layout-dashboard, bar-chart-2, settings, home, users, dollar-sign, trending-up, shopping-cart, activity, folder, pie-chart.
- Use hex colors only.
- Children coordinates (x, y) are relative to parent.
- Sidebar at x=0, topbar at x=sidebar_width. Content starts at y=topbar_height.
- When generating cards: use 3-4 cards in a row, each 320x180, gap 24px.`;

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
  return `USER REQUEST (read carefully and generate exactly what they want):
"""
${parsed.raw}
"""
Frame: 1440x900. ${themeHint}${targetHint}${languageHint}${compHint}${domainHint}

Analyze the request. Generate a layout that fulfills their specific intent. Use appropriate labels, content, and structure. Return ONLY the JSON object, no markdown.`;
}

function ensureIds(el: AIUIElement, prefix: string, idx: number): AIUIElement {
  const id = el.id || `${prefix}_${idx}`;
  const children = el.children?.map((c, i) => ensureIds(c, `${id}_child`, i)) ?? [];
  return { ...el, id, children };
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

function buildUserMessageContent(
  userPrompt: string,
  images?: string[]
): { type: "text"; text: string } | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
  if (!images || images.length === 0) {
    return userPrompt;
  }
  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  for (const url of images.slice(0, 4)) {
    if (url && url.startsWith("data:")) parts.push({ type: "image_url", image_url: { url } });
  }
  const isDesignReference = /replicate|recreate|copy|match|like this|similar to|based on this|design reference|reference image|screenshot|mockup|wireframe/i.test(userPrompt);
  const imageInstruction = isDesignReference
    ? "\n\nDESIGN REFERENCE: The user attached a reference image/screenshot/mockup. REPLICATE this design as closely as possible. Analyze the layout, colors, typography, spacing, and structure. Create a JSON layout that matches the visual design. Use the exact data URL from the first image for any image elements. Match component placement, hierarchy, and styling."
    : "\n\nThe user attached image(s) in this message. Use them in the layout where appropriate. For image elements, use the exact data URL from the first image in props.src. Place images per the user's instructions (e.g. hero background, profile photo, product image).";
  parts.push({
    type: "text",
    text: userPrompt + imageInstruction,
  });
  return parts;
}

export async function generateLayoutFromPrompt(
  prompt: string,
  options?: LayoutGeneratorOptions
): Promise<AIUILayout> {
  const parsed = parsePromptWithOptions(prompt, { theme: options?.style });
  const userPrompt = buildUserPrompt(parsed, {
    runtimeTarget: options?.runtimeTarget,
    languageTarget: options?.languageTarget,
  });

  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options?.model ?? "gpt-4o";
  const images = options?.images;

  if (!apiKey) {
    return getFallbackLayout(parsed);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const userContent = buildUserMessageContent(userPrompt, images);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Example 1 (dashboard with KPI cards):\n${DRIBBBLE_EXAMPLE_1}` },
          { role: "assistant", content: "Understood." },
          { role: "user", content: `Example 2 (dashboard with hero):\n${DRIBBBLE_EXAMPLE_2}` },
          { role: "assistant", content: "Understood." },
          { role: "user", content: userContent },
        ],
        temperature: 0.25,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const err = await response.text();
      console.error("OpenAI API error:", err);
      return getFallbackLayout(parsed);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      clearTimeout(timeoutId);
      return getFallbackLayout(parsed);
    }

    const layout = parseLayoutResponse(content);
    if (!layout) {
      clearTimeout(timeoutId);
      return getFallbackLayout(parsed);
    }

    layout.frame = validateAndFixFrame(layout.frame);
    layout.metadata = { ...layout.metadata, prompt };
    clearTimeout(timeoutId);
    return layout;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Layout generation error:", err);
    return getFallbackLayout(parsed);
  }
}

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
  const hasTopbar =
    parsed.components.includes("topbar") || parsed.components.includes("navbar");
  const sidebarWidth = hasSidebar ? 260 : 0;
  const topbarHeight = hasTopbar ? 64 : 0;
  const contentX = sidebarWidth;
  const contentY = topbarHeight;
  const contentW = DEFAULT_WIDTH - sidebarWidth;
  const contentH = 900 - topbarHeight;

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
      height: 900,
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

  const cardW = 320;
  const cardH = 180;
  const gap = 24;
  const startX = contentX + 36;
  const startY = contentY + 32;

  const cardData = [
    { icon: "dollar-sign", label: "Total Revenue", value: "$45,231" },
    { icon: "users", label: "Active Users", value: "2,350" },
    { icon: "shopping-cart", label: "Orders", value: "342" },
    { icon: "trending-up", label: "Growth", value: "+12.5%" },
  ];

  if (hasCards) {
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
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
      width: DEFAULT_WIDTH,
      height: 900,
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
