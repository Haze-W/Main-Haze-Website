/**
 * Rule-based layout refinement — no external APIs.
 * Parses the current AI layout JSON and applies instructions from natural language + hex colors.
 */

import type { AIUIElement, AIUIFrame, AIUILayout } from "@/lib/ai/schema/ui-schema";
import { validateAndFixFrame } from "@/lib/ai/agent/rules-engine";

function parseLayoutJson(json: string): AIUILayout | null {
  try {
    const cleaned = json
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const raw = JSON.parse(cleaned) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    if (o.frame && typeof o.frame === "object") {
      const frame = o.frame as AIUIFrame;
      if (!frame.children) return null;
      return {
        frame,
        metadata:
          typeof o.metadata === "object" && o.metadata
            ? (o.metadata as AIUILayout["metadata"])
            : { generatedAt: new Date().toISOString(), version: "1.0" },
      };
    }
    const frame = raw as AIUIFrame;
    if (!frame?.children) return null;
    return {
      frame,
      metadata: { generatedAt: new Date().toISOString(), version: "1.0" },
    };
  } catch {
    return null;
  }
}

function cloneLayout(layout: AIUILayout): AIUILayout {
  return JSON.parse(JSON.stringify(layout)) as AIUILayout;
}

function findHexes(text: string): string[] {
  const m = text.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
  return m ?? [];
}

function normalizeHex(h: string): string {
  if (h.length === 4 && h.startsWith("#")) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return h;
}

function walkElements(
  nodes: AIUIElement[],
  visit: (el: AIUIElement) => void
): void {
  for (const n of nodes) {
    visit(n);
    if (n.children?.length) walkElements(n.children, visit);
  }
}

/**
 * Apply simple refinements. Returns null if nothing could be applied.
 */
export function applyLocalRefinement(
  layout: AIUILayout,
  userMessage: string
): { layout: AIUILayout; notes: string[] } | null {
  const msg = userMessage.toLowerCase();
  const hexes = findHexes(userMessage).map(normalizeHex);
  const out = cloneLayout(layout);
  const notes: string[] = [];
  const frame = out.frame;

  if (hexes.length > 0 && /\b(background|canvas|app|root|page)\b/i.test(userMessage)) {
    frame.background = hexes[0];
    notes.push(`Canvas background → ${hexes[0]}`);
  }

  if (msg.includes("sidebar") && hexes.length > 0) {
    const c = hexes[hexes.length > 1 ? 1 : 0];
    let hit = false;
    walkElements(frame.children, (el) => {
      if (el.type === "sidebar" && !hit) {
        el.backgroundColor = c;
        if (el.styles) el.styles.backgroundColor = c;
        hit = true;
      }
    });
    if (hit) notes.push(`Sidebar background → ${c}`);
  }

  if (/\b(top\s*bar|topbar|header\s*bar|navbar)\b/i.test(userMessage) && hexes.length > 0) {
    const c = hexes[hexes.length > 1 ? hexes.length - 1 : 0];
    let hit = false;
    walkElements(frame.children, (el) => {
      if ((el.type === "topbar" || el.type === "navbar") && !hit) {
        el.backgroundColor = c;
        if (el.styles) el.styles.backgroundColor = c;
        hit = true;
      }
    });
    if (hit) notes.push(`Top bar / navbar background → ${c}`);
  }

  if (/\b(darker|darken)\b/.test(msg) && !hexes.length) {
    const darken = (hex: string): string => {
      const h = hex.replace("#", "");
      if (h.length !== 6) return hex;
      const n = (x: string) =>
        Math.max(0, Math.floor(parseInt(x, 16) * 0.85))
          .toString(16)
          .padStart(2, "0");
      return `#${n(h.slice(0, 2))}${n(h.slice(2, 4))}${n(h.slice(4, 6))}`;
    };
    frame.background = darken(frame.background);
    notes.push("Darkened canvas background slightly");
  }

  if (/\b(lighter|lighten)\b/.test(msg) && !hexes.length) {
    const lighten = (hex: string): string => {
      const h = hex.replace("#", "");
      if (h.length !== 6) return hex;
      const n = (x: string) =>
        Math.min(255, Math.floor(parseInt(x, 16) + (255 - parseInt(x, 16)) * 0.12))
          .toString(16)
          .padStart(2, "0");
      return `#${n(h.slice(0, 2))}${n(h.slice(2, 4))}${n(h.slice(4, 6))}`;
    };
    frame.background = lighten(frame.background);
    notes.push("Lightened canvas background slightly");
  }

  if (/\b(increase|larger|bigger)\b.*\b(font|text)\b|\b(font|text)\b.*\b(increase|larger|bigger)\b/.test(msg)) {
    let n = 0;
    walkElements(frame.children, (el) => {
      if (el.type === "text") {
        const fs = el.styles?.fontSize ?? 14;
        el.styles = { ...el.styles, fontSize: fs + 6 };
        n++;
      }
    });
    if (n) notes.push(`Increased font size on ${n} text node(s)`);
  }

  if (notes.length === 0) return null;

  out.frame = validateAndFixFrame(out.frame);
  return { layout: out, notes };
}

export function refineLayoutFromJsonString(
  currentLayoutJson: string,
  userMessage: string
): { layout: AIUILayout; response: string } | { suggestion: string } {
  const parsed = parseLayoutJson(currentLayoutJson);
  if (!parsed) {
    return {
      suggestion:
        "Could not read the current layout JSON. Try rebuilding the canvas or resetting the frame.",
    };
  }

  const result = applyLocalRefinement(parsed, userMessage);
  if (result) {
    return {
      layout: result.layout,
      response: `Applied: ${result.notes.join("; ")}`,
    };
  }

  return {
    suggestion:
      `Try being specific with a **hex color** (e.g. \`#1a1a2e\`) and what to change: **canvas background**, **sidebar**, or **top bar**. ` +
      `You can also say **darker** / **lighter** for the canvas, or **larger font** for text. ` +
      `Full rebuilds and new sections use the **Generate** bar below (or /ui in the agent panel).`,
  };
}
