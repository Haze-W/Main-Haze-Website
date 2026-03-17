/**
 * Layout Generator - Creates UI component tree from parsed prompt
 * Uses LLM API to generate structured JSON (OpenAI compatible)
 * Design principles inspired by Dribbble: clean, modern, professional UI
 */
export { generateLayoutFromPrompt as generateLayout };
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
  const w = parsed.frame?.width ?? 1440;
  const h = parsed.frame?.height ?? 900;
  return `User request: ${parsed.raw}

Generate a ${parsed.style} desktop UI with components: ${comps || "(infer from request)"}.
${domain}
Frame: ${w}x${h}. Light background (#f8fafc or #f1f5f9).
Match the quality and structure of the examples. Return ONLY the JSON object.`;
}

function getLoginFallbackLayout(frameW: number, frameH: number): AIUIElement[] {
  const cardW = 420;
  const cardH = 560;
  const cardX = Math.round((frameW - cardW) / 2);
  const cardY = Math.round((frameH - cardH) / 2);

  return [
    {
      id: "login_card",
      type: "card",
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      backgroundColor: "#ffffff",
      styles: { padding: 28, borderRadius: 14 },
      children: [
        {
          id: "login_logo",
          type: "icon",
          x: 28,
          y: 28,
          width: 32,
          height: 32,
          props: { iconName: "layout-dashboard" },
          color: "#4f46e5",
        },
        {
          id: "login_title",
          type: "text",
          x: 28,
          y: 80,
          width: cardW - 56,
          height: 30,
          text: "Welcome back",
          color: "#0f172a",
          styles: { fontSize: 22, fontWeight: 700 },
        },
        {
          id: "login_subtitle",
          type: "text",
          x: 28,
          y: 112,
          width: cardW - 56,
          height: 22,
          text: "Sign in to continue",
          color: "#64748b",
          styles: { fontSize: 13 },
        },
        {
          id: "email_label",
          type: "text",
          x: 28,
          y: 160,
          width: cardW - 56,
          height: 18,
          text: "Email",
          color: "#0f172a",
          styles: { fontSize: 12, fontWeight: 600 },
        },
        {
          id: "email_input",
          type: "input",
          x: 28,
          y: 192,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#ffffff",
          styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 },
          props: { placeholder: "you@company.com" },
        },
        {
          id: "pw_label",
          type: "text",
          x: 28,
          y: 256,
          width: cardW - 56,
          height: 18,
          text: "Password",
          color: "#0f172a",
          styles: { fontSize: 12, fontWeight: 600 },
        },
        {
          id: "pw_input",
          type: "input",
          x: 28,
          y: 288,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#ffffff",
          styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 },
          props: { placeholder: "********" },
        },
        {
          id: "forgot_link",
          type: "text",
          x: 28,
          y: 320,
          width: cardW - 56,
          height: 18,
          text: "Forgot password?",
          color: "#4f46e5",
          styles: { fontSize: 12, textAlign: "right" },
        },
        {
          id: "signin_btn",
          type: "button",
          x: 28,
          y: 352,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#4f46e5",
          styles: { borderRadius: 12 },
          props: { text: "Sign in" },
        },
        {
          id: "divider_or",
          type: "text",
          x: 28,
          y: 416,
          width: cardW - 56,
          height: 18,
          text: "or",
          color: "#94a3b8",
          styles: { fontSize: 12, textAlign: "center" },
        },
        {
          id: "google_btn",
          type: "button",
          x: 28,
          y: 448,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#ffffff",
          styles: { borderRadius: 12, borderColor: "#e2e8f0", borderWidth: 1 },
          props: { text: "Continue with Google" },
        },
        {
          id: "signup_hint",
          type: "text",
          x: 28,
          y: 512,
          width: cardW - 56,
          height: 18,
          text: "New here? Create an account",
          color: "#64748b",
          styles: { fontSize: 12, textAlign: "center" },
        },
      ],
    },
  ];
}

function getSignupFallbackLayout(frameW: number, frameH: number): AIUIElement[] {
  const cardW = 460;
  const cardH = 600;
  const cardX = Math.round((frameW - cardW) / 2);
  const cardY = Math.round((frameH - cardH) / 2);

  return [
    {
      id: "signup_card",
      type: "card",
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      backgroundColor: "#ffffff",
      styles: { padding: 28, borderRadius: 14 },
      children: [
        {
          id: "signup_title",
          type: "text",
          x: 28,
          y: 32,
          width: cardW - 56,
          height: 32,
          text: "Create your account",
          color: "#0f172a",
          styles: { fontSize: 22, fontWeight: 700 },
        },
        {
          id: "signup_subtitle",
          type: "text",
          x: 28,
          y: 72,
          width: cardW - 56,
          height: 20,
          text: "Start building in minutes",
          color: "#64748b",
          styles: { fontSize: 13 },
        },
        {
          id: "name_label",
          type: "text",
          x: 28,
          y: 120,
          width: cardW - 56,
          height: 20,
          text: "Full name",
          color: "#0f172a",
          styles: { fontSize: 12, fontWeight: 600 },
        },
        {
          id: "name_input",
          type: "input",
          x: 28,
          y: 144,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#ffffff",
          styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 },
          props: { placeholder: "Jane Doe" },
        },
        {
          id: "email_label_su",
          type: "text",
          x: 28,
          y: 208,
          width: cardW - 56,
          height: 20,
          text: "Email",
          color: "#0f172a",
          styles: { fontSize: 12, fontWeight: 600 },
        },
        {
          id: "email_input_su",
          type: "input",
          x: 28,
          y: 232,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#ffffff",
          styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 },
          props: { placeholder: "you@company.com" },
        },
        {
          id: "pw_label_su",
          type: "text",
          x: 28,
          y: 296,
          width: cardW - 56,
          height: 20,
          text: "Password",
          color: "#0f172a",
          styles: { fontSize: 12, fontWeight: 600 },
        },
        {
          id: "pw_input_su",
          type: "input",
          x: 28,
          y: 320,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#ffffff",
          styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 },
          props: { placeholder: "********" },
        },
        {
          id: "terms",
          type: "text",
          x: 28,
          y: 384,
          width: cardW - 56,
          height: 20,
          text: "By continuing you agree to the Terms and Privacy Policy",
          color: "#64748b",
          styles: { fontSize: 12 },
        },
        {
          id: "create_btn",
          type: "button",
          x: 28,
          y: 424,
          width: cardW - 56,
          height: 48,
          backgroundColor: "#4f46e5",
          styles: { borderRadius: 12 },
          props: { text: "Create account" },
        },
        {
          id: "signin_hint",
          type: "text",
          x: 28,
          y: 488,
          width: cardW - 56,
          height: 20,
          text: "Already have an account? Sign in",
          color: "#64748b",
          styles: { fontSize: 12, textAlign: "center" },
        },
      ],
    },
  ];
}

function getLandingFallbackLayout(frameW: number, frameH: number): AIUIElement[] {
  const pad = 64;
  const heroH = 320;
  const w = frameW - pad * 2;

  const featureW = Math.floor((w - 48) / 3);
  const featureY = pad + heroH + 48;

  const mkFeature = (i: number, title: string, body: string, icon: string): AIUIElement => ({
    id: `feature_${i}`,
    type: "card",
    x: pad + (i - 1) * (featureW + 24),
    y: featureY,
    width: featureW,
    height: 180,
    backgroundColor: "#ffffff",
    styles: { padding: 24, borderRadius: 14 },
    children: [
      { id: `feature_${i}_icon`, type: "icon", x: 24, y: 24, width: 24, height: 24, props: { iconName: icon }, color: "#4f46e5" },
      { id: `feature_${i}_title`, type: "text", x: 24, y: 60, width: featureW - 48, height: 24, text: title, color: "#0f172a", styles: { fontSize: 16, fontWeight: 700 } },
      { id: `feature_${i}_body`, type: "text", x: 24, y: 92, width: featureW - 48, height: 40, text: body, color: "#64748b", styles: { fontSize: 13 } },
    ],
  });

  return [
    {
      id: "topbar_1",
      type: "topbar",
      x: 0,
      y: 0,
      width: frameW,
      height: 72,
      backgroundColor: "#ffffff",
      children: [
        { id: "brand_icon", type: "icon", x: 64, y: 22, width: 28, height: 28, props: { iconName: "layout-dashboard" }, color: "#4f46e5" },
        { id: "brand", type: "text", x: 100, y: 22, width: 180, height: 28, text: "Acme", color: "#0f172a", styles: { fontSize: 16, fontWeight: 800 } },
        { id: "nav_why", type: "text", x: frameW - 360, y: 26, width: 80, height: 20, text: "Why", color: "#64748b" },
        { id: "nav_pricing", type: "text", x: frameW - 280, y: 26, width: 80, height: 20, text: "Pricing", color: "#64748b" },
        { id: "nav_docs", type: "text", x: frameW - 200, y: 26, width: 80, height: 20, text: "Docs", color: "#64748b" },
        { id: "cta", type: "button", x: frameW - 120, y: 18, width: 96, height: 40, backgroundColor: "#4f46e5", styles: { borderRadius: 12 }, props: { text: "Get started" } },
      ],
    },
    {
      id: "hero_1",
      type: "hero",
      x: pad,
      y: 120,
      width: w,
      height: heroH,
      backgroundColor: "#0f172a",
      styles: { borderRadius: 18, padding: 48 },
      children: [
        { id: "hero_title", type: "text", x: 48, y: 48, width: w - 96, height: 56, text: "Build beautiful UIs faster", color: "#ffffff", styles: { fontSize: 40, fontWeight: 800 } },
        { id: "hero_sub", type: "text", x: 48, y: 116, width: 640, height: 48, text: "Generate editable layouts from plain English and export instantly.", color: "#cbd5e1", styles: { fontSize: 15 } },
        { id: "hero_btn_primary", type: "button", x: 48, y: 190, width: 160, height: 48, backgroundColor: "#4f46e5", styles: { borderRadius: 14 }, props: { text: "Try generator" } },
        { id: "hero_btn_secondary", type: "button", x: 220, y: 190, width: 140, height: 48, backgroundColor: "#111827", styles: { borderRadius: 14, borderColor: "#334155", borderWidth: 1 }, props: { text: "View docs" } },
      ],
    },
    mkFeature(1, "Editable", "Everything is fully draggable and resizable.", "move"),
    mkFeature(2, "Consistent", "Grid + spacing rules keep layouts clean.", "grid-3x3"),
    mkFeature(3, "Exportable", "Export to code or assets in one click.", "download"),
    {
      id: "footer_1",
      type: "text",
      x: pad,
      y: Math.min(frameH - 72, featureY + 220),
      width: w,
      height: 24,
      text: "© 2026 Acme. All rights reserved.",
      color: "#94a3b8",
      styles: { fontSize: 12, textAlign: "center" },
    },
  ];
}

function getPricingFallbackLayout(frameW: number, frameH: number): AIUIElement[] {
  const pad = 64;
  const w = frameW - pad * 2;
  const cardW = Math.floor((w - 48) / 3);
  const y = 180;

  const mkPlan = (i: number, name: string, price: string, desc: string, primary?: boolean): AIUIElement => ({
    id: `plan_${i}`,
    type: "card",
    x: pad + (i - 1) * (cardW + 24),
    y,
    width: cardW,
    height: 360,
    backgroundColor: "#ffffff",
    styles: { padding: 24, borderRadius: 14, borderColor: primary ? "#4f46e5" : "#e2e8f0", borderWidth: 1 },
    children: [
      { id: `plan_${i}_name`, type: "text", x: 24, y: 24, width: cardW - 48, height: 24, text: name, color: "#0f172a", styles: { fontSize: 16, fontWeight: 800 } },
      { id: `plan_${i}_price`, type: "text", x: 24, y: 64, width: cardW - 48, height: 40, text: price, color: "#0f172a", styles: { fontSize: 32, fontWeight: 800 } },
      { id: `plan_${i}_desc`, type: "text", x: 24, y: 112, width: cardW - 48, height: 40, text: desc, color: "#64748b", styles: { fontSize: 13 } },
      { id: `plan_${i}_cta`, type: "button", x: 24, y: 168, width: cardW - 48, height: 44, backgroundColor: primary ? "#4f46e5" : "#ffffff", styles: { borderRadius: 12, borderColor: primary ? undefined : "#e2e8f0", borderWidth: primary ? undefined : 1 }, props: { text: primary ? "Start free trial" : "Choose plan" } },
      { id: `plan_${i}_f1`, type: "text", x: 24, y: 232, width: cardW - 48, height: 20, text: "• Unlimited projects", color: "#0f172a", styles: { fontSize: 12 } },
      { id: `plan_${i}_f2`, type: "text", x: 24, y: 264, width: cardW - 48, height: 20, text: "• Export to code", color: "#0f172a", styles: { fontSize: 12 } },
      { id: `plan_${i}_f3`, type: "text", x: 24, y: 296, width: cardW - 48, height: 20, text: "• Team sharing", color: "#0f172a", styles: { fontSize: 12 } },
    ],
  });

  return [
    {
      id: "pricing_title",
      type: "text",
      x: pad,
      y: 72,
      width: w,
      height: 48,
      text: "Pricing",
      color: "#0f172a",
      styles: { fontSize: 36, fontWeight: 900, textAlign: "center" },
    },
    {
      id: "pricing_sub",
      type: "text",
      x: pad,
      y: 128,
      width: w,
      height: 28,
      text: "Simple plans that scale with you.",
      color: "#64748b",
      styles: { fontSize: 14, textAlign: "center" },
    },
    mkPlan(1, "Starter", "$0", "For trying things out"),
    mkPlan(2, "Pro", "$19", "For creators and teams", true),
    mkPlan(3, "Business", "$49", "For growing companies"),
    {
      id: "pricing_footer",
      type: "text",
      x: pad,
      y: Math.min(frameH - 64, y + 392),
      width: w,
      height: 20,
      text: "Questions? Contact sales.",
      color: "#94a3b8",
      styles: { fontSize: 12, textAlign: "center" },
    },
  ];
}

function getSettingsFallbackLayout(frameW: number, frameH: number): AIUIElement[] {
  const sidebarW = 280;
  const pad = 32;
  const contentW = frameW - sidebarW - pad * 2;

  return [
    {
      id: "settings_sidebar",
      type: "sidebar",
      x: 0,
      y: 0,
      width: sidebarW,
      height: frameH,
      backgroundColor: "#0f172a",
      children: [
        { id: "settings_brand", type: "text", x: 24, y: 24, width: sidebarW - 48, height: 24, text: "Settings", color: "#ffffff", styles: { fontSize: 14, fontWeight: 800 } },
        { id: "nav_profile", type: "text", x: 24, y: 72, width: sidebarW - 48, height: 20, text: "Profile", color: "#ffffff" },
        { id: "nav_security", type: "text", x: 24, y: 104, width: sidebarW - 48, height: 20, text: "Security", color: "#94a3b8" },
        { id: "nav_billing", type: "text", x: 24, y: 136, width: sidebarW - 48, height: 20, text: "Billing", color: "#94a3b8" },
      ],
    },
    {
      id: "settings_panel",
      type: "card",
      x: sidebarW + pad,
      y: pad,
      width: contentW,
      height: Math.min(560, frameH - pad * 2),
      backgroundColor: "#ffffff",
      styles: { padding: 28, borderRadius: 14 },
      children: [
        { id: "settings_title", type: "text", x: 28, y: 24, width: contentW - 56, height: 28, text: "Profile", color: "#0f172a", styles: { fontSize: 18, fontWeight: 900 } },
        { id: "settings_sub", type: "text", x: 28, y: 56, width: contentW - 56, height: 20, text: "Update your personal information.", color: "#64748b", styles: { fontSize: 13 } },
        { id: "s_name_label", type: "text", x: 28, y: 112, width: 200, height: 20, text: "Name", color: "#0f172a", styles: { fontSize: 12, fontWeight: 700 } },
        { id: "s_name_input", type: "input", x: 28, y: 136, width: contentW - 56, height: 48, backgroundColor: "#ffffff", styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 }, props: { placeholder: "Jane Doe" } },
        { id: "s_email_label", type: "text", x: 28, y: 200, width: 200, height: 20, text: "Email", color: "#0f172a", styles: { fontSize: 12, fontWeight: 700 } },
        { id: "s_email_input", type: "input", x: 28, y: 224, width: contentW - 56, height: 48, backgroundColor: "#ffffff", styles: { borderRadius: 10, borderColor: "#e2e8f0", borderWidth: 1 }, props: { placeholder: "you@company.com" } },
        { id: "s_save", type: "button", x: 28, y: 312, width: 160, height: 44, backgroundColor: "#4f46e5", styles: { borderRadius: 12 }, props: { text: "Save changes" } },
      ],
    },
  ];
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

  const wantsLogin =
    parsed.components.includes("login") ||
    /\b(login|log in|sign in|signin)\b/.test(parsed.intent);
  const wantsSignup =
    /\b(sign\s*up|signup|register|create account)\b/.test(parsed.intent);
  const wantsLanding =
    parsed.components.includes("hero") ||
    /\b(landing page|marketing|homepage|hero)\b/.test(parsed.intent);
  const wantsPricing =
    parsed.components.includes("pricing") || /\bpricing|plans?\b/.test(parsed.intent);
  const wantsSettings =
    parsed.components.includes("settings") || /\bsettings|preferences\b/.test(parsed.intent);
  const frameW = parsed.frame?.width ?? DEFAULT_WIDTH;
  const frameH = parsed.frame?.height ?? 900;

  const recipe = wantsLogin
    ? getLoginFallbackLayout
    : wantsSignup
      ? getSignupFallbackLayout
      : wantsSettings
        ? getSettingsFallbackLayout
        : wantsPricing
          ? getPricingFallbackLayout
          : wantsLanding
            ? getLandingFallbackLayout
            : null;

  if (!apiKey) {
    if (recipe) {
      return {
        frame: validateAndFixFrame({
          width: frameW,
          height: frameH,
          background: "#f8fafc",
          children: recipe(frameW, frameH),
        }),
        metadata: {
          prompt: parsed.raw,
          generatedAt: new Date().toISOString(),
          version: "1.0",
        },
      };
    }
    return getFallbackLayout(parsed);
  }

  try {
    // Prefer deterministic recipes for common pages even with API key (reliability > variability).
    if (recipe) {
      return {
        frame: validateAndFixFrame({
          width: frameW,
          height: frameH,
          background: "#f8fafc",
          children: recipe(frameW, frameH),
        }),
        metadata: {
          prompt: parsed.raw,
          generatedAt: new Date().toISOString(),
          version: "1.0",
        },
      };
    }
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
  const frameW = parsed.frame?.width ?? DEFAULT_WIDTH;
  const frameH = parsed.frame?.height ?? 900;
  const hasSidebar = parsed.components.includes("sidebar");
  const hasTopbar =
    parsed.components.includes("topbar") || parsed.components.includes("navbar");
  const hasButton = parsed.components.includes("button");
  const hasInput = parsed.components.includes("input");
  const hasText = parsed.components.includes("text");
  const hasIcon = parsed.components.includes("icon");
  const sidebarWidth = hasSidebar ? 260 : 0;
  const topbarHeight = hasTopbar ? 64 : 0;
  const contentX = sidebarWidth;
  const contentY = topbarHeight;
  const contentW = frameW - sidebarWidth;
  const contentH = frameH - topbarHeight;

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
      height: frameH,
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

  // Single-element prompts (e.g. "create button") should not silently fallback to generic content.
  if (!hasCards && !hasHero) {
    const centerX = contentX + Math.max(24, (contentW - 240) / 2);
    const centerY = contentY + Math.max(24, (contentH - 56) / 2);

    if (hasButton) {
      children.push({
        id: "button_1",
        type: "button",
        x: centerX,
        y: centerY,
        width: 200,
        height: 48,
        backgroundColor: "#4f46e5",
        props: { text: "Button" },
      });
    } else if (hasInput) {
      children.push({
        id: "input_1",
        type: "input",
        x: centerX,
        y: centerY,
        width: 320,
        height: 44,
        backgroundColor: "#ffffff",
        props: { placeholder: "Type here…" },
      });
    } else if (hasText) {
      children.push({
        id: "text_1",
        type: "text",
        x: centerX,
        y: centerY,
        width: 360,
        height: 32,
        text: "Text",
        color: "#0f172a",
      });
    } else if (hasIcon) {
      children.push({
        id: "icon_1",
        type: "icon",
        x: centerX,
        y: centerY,
        width: 48,
        height: 48,
        props: { iconName: "star" },
        color: "#0f172a",
      });
    }
  }

  if (children.length === 0) {
    // If user only requested a frame preset (e.g. "create wide"), allow an empty canvas.
  }

  return {
    frame: validateAndFixFrame({
      width: frameW,
      height: frameH,
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
