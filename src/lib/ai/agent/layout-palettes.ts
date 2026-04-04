/**
 * Curated “product UI” palettes — elevation, accents, and hierarchy for local generation.
 */

import type { DesignPresetId, ParsedPrompt } from "./prompt-parser";

export type RichTheme = {
  bg: string;
  card: string;
  sidebar: string;
  topbar: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  /** Primary metric / CTA text on accent buttons */
  onAccent: string;
  cardShadow: string;
  /** Right edge of sidebar (1px line) */
  sidebarBorder: string;
  topbarShadow: string;
  /** shadcn-style Card border (optional; omit for shadow-only cards) */
  cardBorderWidth?: number;
  cardBorderColor?: string;
  radiusCard: number;
  radiusInput: number;
  radiusButton: number;
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Rotating dark palettes when no preset matches — still feels “designed”, not default gray. */
const DRIBBBLE_DARK_ROTATIONS: Omit<RichTheme, "radiusCard" | "radiusInput" | "radiusButton">[] = [
  {
    bg: "#07090f",
    card: "#12151f",
    sidebar: "#0b0e18",
    topbar: "#0b0e18",
    text: "#f4f4f8",
    muted: "#8b8fa3",
    accent: "#6366f1",
    accentSoft: "rgba(99,102,241,0.15)",
    onAccent: "#ffffff",
    cardShadow: "0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
    sidebarBorder: "rgba(255,255,255,0.07)",
    topbarShadow: "0 1px 0 rgba(255,255,255,0.06)",
  },
  {
    bg: "#0a0c10",
    card: "#141820",
    sidebar: "#0e1118",
    topbar: "#0e1118",
    text: "#eef1f7",
    muted: "#9aa3b2",
    accent: "#22d3ee",
    accentSoft: "rgba(34,211,238,0.12)",
    onAccent: "#041016",
    cardShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.12)",
    sidebarBorder: "rgba(255,255,255,0.06)",
    topbarShadow: "0 1px 0 rgba(255,255,255,0.05)",
  },
  {
    bg: "#0f0a12",
    card: "#1a121c",
    sidebar: "#160e18",
    topbar: "#160e18",
    text: "#faf5ff",
    muted: "#b4a0bc",
    accent: "#e879f9",
    accentSoft: "rgba(232,121,249,0.12)",
    onAccent: "#1a0520",
    cardShadow: "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(232,121,249,0.1)",
    sidebarBorder: "rgba(255,255,255,0.06)",
    topbarShadow: "0 1px 0 rgba(255,255,255,0.05)",
  },
  {
    bg: "#0c0f0c",
    card: "#151a15",
    sidebar: "#0f140f",
    topbar: "#0f140f",
    text: "#ecfdf3",
    muted: "#94a89a",
    accent: "#4ade80",
    accentSoft: "rgba(74,222,128,0.12)",
    onAccent: "#052e14",
    cardShadow: "0 6px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,222,128,0.1)",
    sidebarBorder: "rgba(255,255,255,0.06)",
    topbarShadow: "0 1px 0 rgba(255,255,255,0.05)",
  },
];

/** Light default — shadcn/ui zinc + New York–style shell (bordered cards, shadow-sm) */
const LIGHT_ROTATION: RichTheme = {
  bg: "#fafafa",
  card: "#ffffff",
  sidebar: "#fafafa",
  topbar: "#ffffff",
  text: "#09090b",
  muted: "#71717a",
  accent: "#18181b",
  accentSoft: "rgba(24,24,27,0.06)",
  onAccent: "#fafafa",
  cardShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sidebarBorder: "#e4e4e7",
  topbarShadow: "0 1px 0 #e4e4e7",
  cardBorderWidth: 1,
  cardBorderColor: "#e4e4e7",
  radiusCard: 8,
  radiusInput: 6,
  radiusButton: 6,
};

function presetRich(
  id: DesignPresetId,
  theme: "light" | "dark"
): RichTheme {
  if (theme === "light") {
    const r = { ...LIGHT_ROTATION };
    if (id === "shadcn") {
      r.bg = "#fafafa";
      r.card = "#ffffff";
      r.sidebar = "#fafafa";
      r.topbar = "#ffffff";
      r.text = "#09090b";
      r.muted = "#71717a";
      r.accent = "#18181b";
      r.onAccent = "#fafafa";
      r.cardShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
      r.cardBorderWidth = 1;
      r.cardBorderColor = "#e4e4e7";
      r.radiusCard = 8;
      r.radiusInput = 6;
      r.radiusButton = 6;
    }
    if (id === "apple") {
      r.bg = "#fafafa";
      r.card = "#ffffff";
      r.accent = "#0071e3";
      r.onAccent = "#ffffff";
      r.cardShadow = "0 2px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)";
      r.cardBorderWidth = 0;
      r.cardBorderColor = undefined;
      r.radiusCard = 18;
    }
    if (id === "stripe") {
      r.accent = "#635bff";
      r.bg = "#f6f9fc";
      r.onAccent = "#ffffff";
      r.sidebar = "#ffffff";
      r.sidebarBorder = "#e6ebf1";
      r.cardShadow = "0 4px 24px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06)";
      r.cardBorderWidth = 0;
      r.cardBorderColor = undefined;
    }
    return r;
  }

  const base = (i: number): RichTheme => ({
    ...DRIBBBLE_DARK_ROTATIONS[i % DRIBBBLE_DARK_ROTATIONS.length],
    radiusCard: 20,
    radiusInput: 12,
    radiusButton: 12,
  });

  switch (id) {
    case "shadcn":
      return {
        ...base(0),
        bg: "#09090b",
        card: "#18181b",
        sidebar: "#09090b",
        topbar: "#09090b",
        text: "#fafafa",
        muted: "#a1a1aa",
        accent: "#fafafa",
        accentSoft: "rgba(250,250,250,0.08)",
        onAccent: "#09090b",
        cardShadow: "0 1px 2px 0 rgb(0 0 0 / 0.4)",
        cardBorderWidth: 1,
        cardBorderColor: "#27272a",
        sidebarBorder: "#27272a",
        topbarShadow: "0 1px 0 #27272a",
        radiusCard: 8,
        radiusInput: 6,
        radiusButton: 6,
      };
    case "stripe":
      return {
        ...base(0),
        bg: "#0a2540",
        card: "#1a3a52",
        sidebar: "#051729",
        topbar: "#051729",
        accent: "#635bff",
        accentSoft: "rgba(99,91,255,0.2)",
        onAccent: "#ffffff",
        cardShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
      };
    case "apple":
      return {
        ...base(1),
        bg: "#000000",
        card: "#1c1c1e",
        sidebar: "#000000",
        topbar: "#000000",
        text: "#f5f5f7",
        muted: "#a1a1a6",
        accent: "#0a84ff",
        accentSoft: "rgba(10,132,255,0.15)",
        onAccent: "#ffffff",
        cardShadow: "0 4px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        radiusCard: 18,
      };
    case "glassmorphism":
      return {
        ...base(2),
        bg: "#06080f",
        card: "#12162a",
        sidebar: "#0a0d18",
        topbar: "#0a0d18",
        accent: "#a78bfa",
        accentSoft: "rgba(167,139,250,0.15)",
        onAccent: "#0f0518",
        cardShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
        radiusCard: 22,
      };
    case "linear":
      return {
        ...base(3),
        bg: "#08090a",
        card: "#141517",
        sidebar: "#0d0e10",
        topbar: "#0d0e10",
        accent: "#5e6ad2",
        accentSoft: "rgba(94,106,210,0.2)",
        onAccent: "#ffffff",
        cardShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.6)",
      };
    case "notion":
      return {
        ...base(0),
        bg: "#191919",
        card: "#252525",
        sidebar: "#202020",
        topbar: "#202020",
        text: "#ebebeb",
        muted: "#9b9b9b",
        accent: "#529cca",
        accentSoft: "rgba(82,156,202,0.15)",
        onAccent: "#ffffff",
        cardShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)",
      };
    case "landing":
      return {
        ...base(1),
        accent: "#6366f1",
        cardShadow: "0 12px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
        radiusCard: 24,
      };
    default:
      return base(0);
  }
}

/**
 * Resolve typography-adjacent styling: shadows, accents, radii — tuned from prompt + preset.
 */
export function resolveRichTheme(parsed: ParsedPrompt): RichTheme {
  const { theme, designPresetId, raw } = parsed;
  const h = hashSeed(raw);

  if (theme === "light") {
    const id = designPresetId ?? "shadcn";
    return presetRich(id, "light");
  }

  if (designPresetId) {
    return presetRich(designPresetId, "dark");
  }

  const r = DRIBBBLE_DARK_ROTATIONS[h % DRIBBBLE_DARK_ROTATIONS.length];
  return {
    ...r,
    radiusCard: 18 + (h % 6),
    radiusInput: 12,
    radiusButton: 12,
  };
}
