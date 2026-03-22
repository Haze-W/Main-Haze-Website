import type { BlurEffect, DropShadow, Effect, InnerShadow, Paint } from "@/lib/editor/types";

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function shadowCssColor(color: string, opacity: number): string {
  if (opacity >= 1) return color;
  if (/^#/.test(color)) return hexToRgba(color, opacity);
  return color;
}

export function paintsToCss(fills?: Paint[]): string | undefined {
  if (!fills || fills.length === 0) return undefined;
  const layers = fills
    .slice()
    .reverse()
    .map((fill) => {
      if (fill.type === "SOLID") {
        const op = fill.opacity ?? 1;
        if (op >= 1) return fill.color;
        return hexToRgba(fill.color, op);
      }
      if (fill.type === "GRADIENT_LINEAR") {
        const stops = fill.stops.map((s) => `${s.color} ${s.position * 100}%`).join(", ");
        return `linear-gradient(${fill.angle ?? 90}deg, ${stops})`;
      }
      if (fill.type === "GRADIENT_RADIAL") {
        const stops = fill.stops.map((s) => `${s.color} ${s.position * 100}%`).join(", ");
        return `radial-gradient(circle, ${stops})`;
      }
      if (fill.type === "IMAGE" && fill.src) return `url(${fill.src})`;
      return "transparent";
    });
  return layers.join(", ");
}

export function effectsToBoxShadow(effects?: Effect[]): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const shadows = effects.filter(
    (e) => e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW"
  ) as (DropShadow | InnerShadow)[];
  if (!shadows.length) return undefined;
  return shadows
    .map((s) => {
      const inset = s.type === "INNER_SHADOW" ? "inset " : "";
      const color = shadowCssColor(s.color, s.opacity);
      return `${inset}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread ?? 0}px ${color}`;
    })
    .join(", ");
}

export function effectsToFilter(effects?: Effect[]): string | undefined {
  const blurs = effects?.filter((e) => e.type === "LAYER_BLUR") as BlurEffect[] | undefined;
  if (!blurs?.length) return undefined;
  return blurs.map((b) => `blur(${b.radius}px)`).join(" ");
}
