/**
 * Layout Generator - Creates UI component tree from parsed prompt
 * Uses LLM API to generate structured JSON (OpenAI compatible)
 * Design principles inspired by Dribbble: clean, modern, professional UI
 */

import type { AIUILayout, AIUIElement, AIUIFrame } from "../schema/ui-schema";
import { parsePrompt } from "./prompt-parser";
import { validateAndFixFrame } from "./rules-engine";
import { DEFAULT_WIDTH } from "../schema/ui-schema";

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

const SYSTEM_PROMPT = `You are an expert UI designer. Create layouts in the style of Dribbble: clean, modern, professional, with strong visual hierarchy.

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

function buildUserPrompt(parsed: ReturnType<typeof parsePrompt>): string {
  const comps = parsed.components.join(", ");
  const domain = parsed.domain ? ` Context: ${parsed.domain}.` : "";
  return `Generate a ${parsed.style} desktop UI with: ${comps}.${domain}
Frame: 1440x900. Light background (#f8fafc or #f1f5f9).
Match the quality and structure of the examples. Return ONLY the JSON object.`;
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

export async function generateLayoutFromPrompt(
  prompt: string,
  options?: { apiKey?: string; model?: string }
): Promise<AIUILayout> {
  const parsed = parsePrompt(prompt);
  const userPrompt = buildUserPrompt(parsed);

  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options?.model ?? "gpt-4o";

  if (!apiKey) {
    return getFallbackLayout(parsed);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.25,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI API error:", err);
      return getFallbackLayout(parsed);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return getFallbackLayout(parsed);

    const layout = parseLayoutResponse(content);
    if (!layout) return getFallbackLayout(parsed);

    layout.frame = validateAndFixFrame(layout.frame);
    layout.metadata = { ...layout.metadata, prompt };
    return layout;
  } catch (err) {
    console.error("Layout generation error:", err);
    return getFallbackLayout(parsed);
  }
}

function getFallbackLayout(parsed: ReturnType<typeof parsePrompt>): AIUILayout {
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

  const navItems = [
    { icon: "layout-dashboard", text: "Dashboard", color: "#ffffff" },
    { icon: "bar-chart-2", text: "Analytics", color: "#94a3b8" },
    { icon: "settings", text: "Settings", color: "#94a3b8" },
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
      backgroundColor: "#0f172a",
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
      backgroundColor: "#ffffff",
      children: [
        {
          id: "logo_icon",
          type: "icon",
          x: 24,
          y: 18,
          width: 28,
          height: 28,
          props: { iconName: "layout-dashboard" },
          color: "#0f172a",
        },
        {
          id: "logo",
          type: "text",
          x: 60,
          y: 16,
          width: 140,
          height: 32,
          text: parsed.domain ? parsed.domain : "App",
          color: "#0f172a",
        },
      ],
    });
  }

  const hasCards = parsed.components.includes("card");
  const hasHero = parsed.components.includes("hero");
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
        backgroundColor: "#ffffff",
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
            color: "#64748b",
          },
          {
            id: `card_title_${i + 1}`,
            type: "text",
            x: 56,
            y: 24,
            width: cardW - 80,
            height: 20,
            text: data.label,
            color: "#64748b",
          },
          {
            id: `card_value_${i + 1}`,
            type: "text",
            x: 24,
            y: 56,
            width: cardW - 48,
            height: 36,
            text: data.value,
            color: "#0f172a",
          },
        ],
      });
    }
  }

  if (hasHero && !hasCards) {
    children.push({
      id: "hero_1",
      type: "hero",
      x: contentX + 48,
      y: contentY + 48,
      width: contentW - 96,
      height: 280,
      backgroundColor: "#0f172a",
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
      backgroundColor: "#ffffff",
      children: [
        {
          id: "title_1",
          type: "text",
          x: 24,
          y: 24,
          width: 400,
          height: 32,
          text: "Content",
          color: "#0f172a",
        },
      ],
    });
  }

  return {
    frame: validateAndFixFrame({
      width: DEFAULT_WIDTH,
      height: 900,
      background: "#f8fafc",
      children,
    }),
    metadata: {
      prompt: parsed.raw,
      generatedAt: new Date().toISOString(),
      version: "1.0",
    },
  };
}
