/**
 * Layout Generator — deterministic UI trees from parsed prompts (Haze local agent).
 * No external APIs; uses keyword parsing + template fallback.
 */

import type { AIUILayout, AIUIElement } from "../schema/ui-schema";
import {
  DEFAULT_WIDTH,
  VIEWPORT_DIMENSIONS,
  type ViewportType,
} from "../schema/ui-schema";
import { parsePromptWithOptions } from "./prompt-parser";
import { validateAndFixFrame } from "./rules-engine";
import type { DesignTheme } from "./theme-generator";
import { resolveRichTheme, type RichTheme } from "./layout-palettes";

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

function getViewportDims(viewport?: ViewportType): { width: number; height: number } {
  return viewport ? VIEWPORT_DIMENSIONS[viewport] : { width: 1440, height: 900 };
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

/**
 * Deterministic layout from prompt keywords — no cloud APIs.
 */
export async function generateLayoutFromPrompt(
  prompt: string,
  options?: LayoutGeneratorOptions
): Promise<AIUILayout> {
  const parsed = parsePromptWithOptions(prompt, {
    theme: options?.style,
    viewport: options?.viewport,
  });
  const layout = getFallbackLayout(parsed);
  layout.metadata = { ...layout.metadata, prompt };
  if (process.env.NODE_ENV === "development") {
    logDevParsedLayout("local", layout);
  }
  return layout;
}

function titleFromUserPrompt(raw: string): string {
  const line = raw.trim().split(/[\n.!?]/)[0]?.trim() ?? raw.trim();
  if (!line) return "App";
  return line.length > 32 ? `${line.slice(0, 29)}…` : line;
}

/** Default KPIs — never use raw prompt text as labels (avoids “BUILD ME A FULL DASHBO…”). */
const DEFAULT_FALLBACK_KPIS: { icon: string; label: string; value: string }[] = [
  { icon: "trending-up", label: "Total revenue", value: "$24.5k" },
  { icon: "users", label: "Active users", value: "1,284" },
  { icon: "activity", label: "Growth rate", value: "+12.4%" },
  { icon: "credit-card", label: "MRR", value: "$8.2k" },
];

/** Fallback KPI rows: keyword-aware first, then professional defaults (never prompt fragments). */
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

/** Muted strip inside chart card (zinc-style) — mirrors shadcn chart placeholder bg. */
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
  /** Mirrors shadcn/ui blocks dashboard-01: AppSidebar + SiteHeader + SectionCards + chart + DataTable. */
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
  const contentH = dims.height - topbarHeight;

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
    if (isDashboard01) {
      sidebarChildren.push(
        {
          id: "sb_logo",
          type: "icon",
          x: 16,
          y: 20,
          width: 22,
          height: 22,
          props: { iconName: "layout-dashboard" },
          color: colors.accent,
        },
        {
          id: "sb_team",
          type: "text",
          x: 44,
          y: 18,
          width: 188,
          height: 22,
          text: "Acme Inc",
          color: colors.text,
          styles: { fontSize: 15, fontWeight: 600 },
        },
        {
          id: "sb_team_sub",
          type: "text",
          x: 44,
          y: 40,
          width: 188,
          height: 16,
          text: "Enterprise",
          color: colors.muted,
          styles: { fontSize: 12 },
        },
        {
          id: "sb_platform",
          type: "text",
          x: 16,
          y: 76,
          width: 200,
          height: 18,
          text: "Platform",
          color: colors.muted,
          styles: { fontSize: 11, fontWeight: 600 },
        }
      );
      const navBaseY = 104;
      navItems.forEach((item, i) => {
        const y = navBaseY + i * 36;
        sidebarChildren.push(
          {
            id: `nav_icon_${i + 1}`,
            type: "icon",
            x: 16,
            y: y - 4,
            width: 20,
            height: 20,
            props: { iconName: item.icon },
            color: item.color,
          },
          {
            id: `nav_${i + 1}`,
            type: "text",
            x: 42,
            y,
            width: 200,
            height: 22,
            text: item.text,
            color: item.color,
            styles: { fontSize: 14, fontWeight: 500 },
          }
        );
      });
    } else {
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
    }
    children.push({
      id: "sidebar_1",
      type: "sidebar",
      x: 0,
      y: 0,
      width: sidebarWidth,
      height: dims.height,
      backgroundColor: colors.sidebar,
      styles: {
        boxShadow: `1px 0 0 ${colors.sidebarBorder}`,
      },
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
      children: isDashboard01
        ? [
            {
              id: "tb_bc1",
              type: "text",
              x: 24,
              y: 22,
              width: 220,
              height: 22,
              text: "Building Your Application",
              color: colors.muted,
              styles: { fontSize: 13 },
            },
            {
              id: "tb_bc_sep",
              type: "text",
              x: 248,
              y: 22,
              width: 14,
              height: 22,
              text: "/",
              color: colors.muted,
              styles: { fontSize: 13 },
            },
            {
              id: "tb_bc2",
              type: "text",
              x: 266,
              y: 22,
              width: 200,
              height: 22,
              text: "Dashboard",
              color: colors.text,
              styles: { fontSize: 13, fontWeight: 500 },
            },
            {
              id: "tb_search",
              type: "text",
              x: Math.max(320, contentW - 200),
              y: 20,
              width: 176,
              height: 26,
              text: "Search…",
              color: colors.muted,
              styles: { fontSize: 13 },
            },
          ]
        : [
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
  /** Extra top space for a real page title row (shadcn-style “Overview” strip — not empty void above cards). */
  const dashHeaderH = hasCards && !hasHero ? (isMobile ? 52 : 76) : 0;
  const startY = contentY + 32 + dashHeaderH;
  const cardsPerRow = isMobile ? 1 : isTablet ? 2 : 2;

  const cardData = inferFallbackCards(parsed.raw);

  const cardBorderStyles =
    colors.cardBorderWidth && colors.cardBorderWidth > 0 && colors.cardBorderColor
      ? { borderWidth: colors.cardBorderWidth, borderColor: colors.cardBorderColor }
      : {};

  if (hasCards && isDashboard01) {
    if (!hasHero) {
      children.push(
        {
          id: "dash_sec_title",
          type: "text",
          x: startXMain,
          y: contentY + 32,
          width: Math.min(520, contentW - 48),
          height: 30,
          text: "Overview",
          color: colors.text,
          styles: { fontSize: 22, fontWeight: 600 },
        },
        {
          id: "dash_sec_sub",
          type: "text",
          x: startXMain,
          y: contentY + 64,
          width: Math.min(560, contentW - 48),
          height: 24,
          text: "Key metrics for your workspace — last 30 days.",
          color: colors.muted,
          styles: { fontSize: 14, fontWeight: 400 },
        }
      );
    }
    const cardW4 = Math.max(196, Math.floor((contentW - padX * 2 - gapSm * 3) / 4));
    for (let i = 0; i < 4; i++) {
      const data = cardData[i];
      children.push({
        id: `card_${i + 1}`,
        type: "card",
        x: startXMain + i * (cardW4 + gapSm),
        y: startY,
        width: cardW4,
        height: metricCardH,
        backgroundColor: colors.card,
        styles: {
          padding: 24,
          borderRadius: colors.radiusCard,
          boxShadow: colors.cardShadow,
          ...cardBorderStyles,
        },
        children: [
          {
            id: `card_icon_${i + 1}`,
            type: "icon",
            x: 24,
            y: 22,
            width: 20,
            height: 20,
            props: { iconName: data.icon },
            color: colors.accent,
          },
          {
            id: `card_title_${i + 1}`,
            type: "text",
            x: 50,
            y: 22,
            width: cardW4 - 80,
            height: 20,
            text: data.label,
            color: colors.muted,
            styles: { fontSize: 12, fontWeight: 500 },
          },
          {
            id: `card_value_${i + 1}`,
            type: "text",
            x: 24,
            y: 56,
            width: cardW4 - 48,
            height: 40,
            text: data.value,
            color: colors.text,
            styles: { fontSize: 26, fontWeight: 600 },
          },
        ],
      });
    }

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
      {
        id: "chart_title",
        type: "text",
        x: 24,
        y: 20,
        width: 320,
        height: 24,
        text: "Total visitors",
        color: colors.text,
        styles: { fontSize: 16, fontWeight: 600 },
      },
      {
        id: "chart_sub",
        type: "text",
        x: 24,
        y: 44,
        width: 400,
        height: 18,
        text: "Last 3 months",
        color: colors.muted,
        styles: { fontSize: 13 },
      },
      {
        id: "chart_bg",
        type: "rectangle",
        x: 24,
        y: innerTop,
        width: chartW - 48,
        height: innerH,
        backgroundColor: chartStrip,
        styles: { borderRadius: 8 },
        children: [],
      },
    ];
    const barsWidth = 5 * barW + 4 * barGap;
    const barStart = 24 + Math.max(0, (chartW - 48 - barsWidth) / 2);
    for (let b = 0; b < 5; b++) {
      const h = barHeights[b];
      chartChildren.push({
        id: `chart_bar_${b}`,
        type: "rectangle",
        x: barStart + b * (barW + barGap),
        y: barBottom - h,
        width: barW,
        height: h,
        backgroundColor: colors.accent,
        styles: { borderRadius: 4 },
        children: [],
      });
    }

    children.push({
      id: "chart_block",
      type: "frame",
      x: startXMain,
      y: chartY,
      width: chartW,
      height: chartH,
      backgroundColor: colors.card,
      styles: {
        padding: 0,
        borderRadius: colors.radiusCard,
        boxShadow: colors.cardShadow,
        ...cardBorderStyles,
      },
      children: chartChildren,
    });

    if (hasTable) {
      const tableY = chartY + chartH + gapLg;
      children.push({
        id: "table_1",
        type: "frame",
        x: startXMain,
        y: tableY,
        width: chartW,
        height: 300,
        backgroundColor: colors.card,
        styles: {
          padding: 24,
          borderRadius: colors.radiusCard,
          boxShadow: colors.cardShadow,
          ...cardBorderStyles,
        },
        children: [
          {
            id: "table_title",
            type: "text",
            x: 24,
            y: 16,
            width: 400,
            height: 28,
            text: "Recent activity",
            color: colors.text,
            styles: { fontSize: 17, fontWeight: 600 },
          },
          {
            id: "table_h1",
            type: "text",
            x: 24,
            y: 56,
            width: 200,
            height: 20,
            text: "Name",
            color: colors.muted,
            styles: { fontSize: 12, fontWeight: 500 },
          },
          {
            id: "table_h2",
            type: "text",
            x: 240,
            y: 56,
            width: 160,
            height: 20,
            text: "Status",
            color: colors.muted,
            styles: { fontSize: 12, fontWeight: 500 },
          },
          {
            id: "table_h3",
            type: "text",
            x: 420,
            y: 56,
            width: 160,
            height: 20,
            text: "Owner",
            color: colors.muted,
            styles: { fontSize: 12, fontWeight: 500 },
          },
          {
            id: "table_h4",
            type: "text",
            x: 580,
            y: 56,
            width: 200,
            height: 20,
            text: "Updated",
            color: colors.muted,
            styles: { fontSize: 12, fontWeight: 500 },
          },
          {
            id: "table_r1a",
            type: "text",
            x: 24,
            y: 92,
            width: 200,
            height: 20,
            text: "Project Alpha",
            color: colors.text,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r1b",
            type: "text",
            x: 240,
            y: 92,
            width: 160,
            height: 20,
            text: "Done",
            color: colors.text,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r1c",
            type: "text",
            x: 420,
            y: 92,
            width: 160,
            height: 20,
            text: "You",
            color: colors.muted,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r1d",
            type: "text",
            x: 580,
            y: 92,
            width: 200,
            height: 20,
            text: "2h ago",
            color: colors.muted,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r2a",
            type: "text",
            x: 24,
            y: 128,
            width: 200,
            height: 20,
            text: "Project Beta",
            color: colors.text,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r2b",
            type: "text",
            x: 240,
            y: 128,
            width: 160,
            height: 20,
            text: "In progress",
            color: colors.text,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r2c",
            type: "text",
            x: 420,
            y: 128,
            width: 160,
            height: 20,
            text: "Team",
            color: colors.muted,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r2d",
            type: "text",
            x: 580,
            y: 128,
            width: 200,
            height: 20,
            text: "Yesterday",
            color: colors.muted,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r3a",
            type: "text",
            x: 24,
            y: 164,
            width: 200,
            height: 20,
            text: "Project Gamma",
            color: colors.text,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r3b",
            type: "text",
            x: 240,
            y: 164,
            width: 160,
            height: 20,
            text: "Queued",
            color: colors.text,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r3c",
            type: "text",
            x: 420,
            y: 164,
            width: 160,
            height: 20,
            text: "You",
            color: colors.muted,
            styles: { fontSize: 14 },
          },
          {
            id: "table_r3d",
            type: "text",
            x: 580,
            y: 164,
            width: 200,
            height: 20,
            text: "Mar 12, 2026",
            color: colors.muted,
            styles: { fontSize: 14 },
          },
        ],
      });
    }
  } else if (hasCards) {
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
      styles: {
        padding: 32,
        borderRadius: colors.radiusCard,
        boxShadow: colors.cardShadow,
      },
      children: [
        { id: "login_title", type: "text", x: 32, y: 32, width: 356, height: 32, text: "Welcome back", color: colors.text, styles: { fontSize: 22, fontWeight: 600 } },
        { id: "login_sub", type: "text", x: 32, y: 72, width: 356, height: 20, text: "Sign in to your account", color: colors.muted, styles: { fontSize: 14 } },
        { id: "login_email_l", type: "text", x: 32, y: 116, width: 356, height: 16, text: "Email", color: colors.text, styles: { fontSize: 12, fontWeight: 500 } },
        { id: "login_email", type: "input", x: 32, y: 138, width: 356, height: 46, text: "", color: colors.text, styles: { borderRadius: colors.radiusInput } },
        { id: "login_pass_l", type: "text", x: 32, y: 198, width: 356, height: 16, text: "Password", color: colors.text, styles: { fontSize: 12, fontWeight: 500 } },
        { id: "login_pass", type: "input", x: 32, y: 220, width: 356, height: 46, text: "", color: colors.text, styles: { borderRadius: colors.radiusInput } },
        {
          id: "login_btn",
          type: "button",
          x: 32,
          y: 292,
          width: 356,
          height: 48,
          text: "Sign In",
          backgroundColor: colors.accent,
          color: colors.onAccent,
          styles: { borderRadius: colors.radiusButton, fontWeight: 600 },
        },
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
      styles: { padding: 32, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
      children: [
        { id: "form_title", type: "text", x: 32, y: 24, width: 416, height: 28, text: "Contact Form", color: colors.text, styles: { fontSize: 18, fontWeight: 600 } },
        { id: "form_name_l", type: "text", x: 32, y: 72, width: 416, height: 16, text: "Name", color: colors.text },
        { id: "form_name", type: "input", x: 32, y: 94, width: 416, height: 44, text: "", color: colors.text },
        { id: "form_email_l", type: "text", x: 32, y: 154, width: 416, height: 16, text: "Email", color: colors.text },
        { id: "form_email", type: "input", x: 32, y: 176, width: 416, height: 44, text: "", color: colors.text },
        { id: "form_msg_l", type: "text", x: 32, y: 236, width: 416, height: 16, text: "Message", color: colors.text },
        { id: "form_msg", type: "input", x: 32, y: 258, width: 416, height: 80, text: "", color: colors.text },
        {
          id: "form_btn",
          type: "button",
          x: 32,
          y: 358,
          width: 120,
          height: 44,
          text: "Submit",
          backgroundColor: colors.accent,
          color: colors.onAccent,
          styles: { borderRadius: colors.radiusButton, fontWeight: 600 },
        },
      ],
    });
  }

  if (hasTable && !isDashboard01) {
    const tableY = hasCards ? startY + 2 * (cardH + gap) : contentY + 48;
    children.push({
      id: "table_1",
      type: "frame",
      x: contentX + 48,
      y: tableY,
      width: contentW - 96,
      height: 320,
      backgroundColor: colors.card,
      styles: { padding: 24, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
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
        styles: { padding: 24, borderRadius: colors.radiusCard, boxShadow: colors.cardShadow },
        children: [
          { id: `plan_title_${i + 1}`, type: "text", x: 24, y: 24, width: 232, height: 26, text: plan.name, color: colors.text, styles: { fontSize: 16, fontWeight: 600 } },
          { id: `plan_price_${i + 1}`, type: "text", x: 24, y: 56, width: 232, height: 36, text: plan.price + "/mo", color: colors.text },
          { id: `plan_desc_${i + 1}`, type: "text", x: 24, y: 104, width: 232, height: 20, text: plan.desc, color: colors.muted },
          {
            id: `plan_btn_${i + 1}`,
            type: "button",
            x: 24,
            y: 200,
            width: 232,
            height: 44,
            text: "Get Started",
            backgroundColor: colors.accent,
            color: colors.onAccent,
            styles: { borderRadius: colors.radiusButton, fontWeight: 600 },
          },
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
        {
          id: "set_btn",
          type: "button",
          x: 32,
          y: 260,
          width: 150,
          height: 44,
          text: "Save Changes",
          backgroundColor: colors.accent,
          color: colors.onAccent,
          styles: { borderRadius: colors.radiusButton, fontWeight: 600 },
        },
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
        {
          id: "modal_confirm",
          type: "button",
          x: 260,
          y: 200,
          width: 116,
          height: 40,
          text: "Confirm",
          backgroundColor: colors.accent,
          color: colors.onAccent,
          styles: { borderRadius: colors.radiusButton, fontWeight: 600 },
        },
      ],
    });
  }

  if (hasHero && !hasCards && !hasLogin) {
    const heroTitle = titleFromUserPrompt(parsed.raw);
    children.push({
      id: "hero_1",
      type: "hero",
      x: contentX + 40,
      y: contentY + 40,
      width: contentW - 80,
      height: 300,
      backgroundColor: colors.card,
      styles: {
        borderRadius: colors.radiusCard,
        boxShadow: colors.cardShadow,
      },
      children: [
        {
          id: "hero_kicker",
          type: "text",
          x: 48,
          y: 44,
          width: 120,
          height: 20,
          text: "NEW",
          color: colors.accent,
          styles: { fontSize: 11, fontWeight: 700 },
        },
        {
          id: "hero_title",
          type: "text",
          x: 48,
          y: 76,
          width: Math.min(560, contentW - 160),
          height: 52,
          text: heroTitle,
          color: colors.text,
          styles: { fontSize: 36, fontWeight: 700 },
        },
        {
          id: "hero_sub",
          type: "text",
          x: 48,
          y: 140,
          width: Math.min(520, contentW - 160),
          height: 56,
          text: "Craft a polished desktop experience — layout, typography, and motion that feel intentional.",
          color: colors.muted,
          styles: { fontSize: 16, fontWeight: 400 },
        },
        {
          id: "hero_cta",
          type: "button",
          x: 48,
          y: 216,
          width: 160,
          height: 48,
          text: "Get started",
          backgroundColor: colors.accent,
          color: colors.onAccent,
          styles: { borderRadius: colors.radiusButton, fontWeight: 600 },
        },
      ],
    });
  }

  if (children.length === 0) {
    const t = titleFromUserPrompt(parsed.raw);
    children.push({
      id: "content_1",
      type: "frame",
      x: contentX + 48,
      y: contentY + 48,
      width: contentW - 96,
      height: 420,
      backgroundColor: colors.card,
      styles: {
        borderRadius: colors.radiusCard,
        boxShadow: colors.cardShadow,
        padding: 40,
      },
      children: [
        {
          id: "title_1",
          type: "text",
          x: 40,
          y: 40,
          width: contentW - 176,
          height: 40,
          text: t,
          color: colors.text,
          styles: { fontSize: 24, fontWeight: 600 },
        },
        {
          id: "sub_1",
          type: "text",
          x: 40,
          y: 92,
          width: contentW - 176,
          height: 48,
          text: "Add keywords like “dashboard”, “glass”, “premium”, or “Stripe” in your prompt for richer layouts.",
          color: colors.muted,
          styles: { fontSize: 15 },
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
