import type { CSSProperties } from "react";

/** Merge transient drag translate with existing transform (rotation / scale). */
export function mergeDragTransform(
  existingTransform: string | undefined,
  dragOffset: { dx: number; dy: number } | null
): Pick<CSSProperties, "transform" | "willChange"> | undefined {
  if (!dragOffset || (dragOffset.dx === 0 && dragOffset.dy === 0)) return undefined;
  const t = `translate(${dragOffset.dx}px, ${dragOffset.dy}px)`;
  const transform = existingTransform ? `${t} ${existingTransform}` : t;
  return { transform, willChange: "transform" };
}
