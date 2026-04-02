import type { TextSegment } from "./types";

export type TextSegmentWithRange = TextSegment & { start?: number; end?: number };

/** Figma uses LINE/PARAGRAPH SEPARATOR (U+2028 / U+2029) or NEL (U+0085) instead of `\n`; same code-unit length as LF so indices stay valid. */
export function normalizeFigmaUnicodeLineBreaks(s: string): string {
  return s.replace(/\u2028|\u2029|\u0085/g, "\n");
}

/**
 * Aligns styled runs to `content` using Figma `start`/`end` (UTF-16, end exclusive), so newlines,
 * tabs, and paragraph breaks match the full text. If runs still do not reconstruct `content`,
 * falls back to one run with full `content` (preserves whitespace; may lose per-run styling).
 */
export function alignFigmaTextSegmentsToContent(
  content: string,
  segments: TextSegmentWithRange[] | undefined | null
): TextSegmentWithRange[] | undefined {
  content = normalizeFigmaUnicodeLineBreaks(content);

  if (!segments?.length) return segments ?? undefined;

  if (content === "") {
    const legacy = segments.map((s) => normalizeFigmaUnicodeLineBreaks(String(s.characters ?? ""))).join("");
    if (legacy.length > 0) {
      return segments.map((s) => ({
        ...s,
        characters: normalizeFigmaUnicodeLineBreaks(String(s.characters ?? "")),
      }));
    }
  }

  const aligned: TextSegmentWithRange[] = segments.map((seg) => {
    const s = typeof seg.start === "number" ? seg.start : -1;
    const e = typeof seg.end === "number" ? seg.end : -1;
    if (s >= 0 && e > s) {
      const endC = Math.min(e, content.length);
      if (s < content.length && s < endC) {
        return { ...seg, characters: content.slice(s, endC), start: s, end: endC };
      }
      return { ...seg, characters: "", start: s, end: Math.max(s, endC) };
    }
    return { ...seg, characters: normalizeFigmaUnicodeLineBreaks(String(seg.characters ?? "")) };
  });

  const joined = aligned.map((x) => x.characters).join("");
  if (joined === content) return aligned;

  const head = aligned[0] ?? segments[0];
  return [
    {
      ...head,
      characters: content,
      start: 0,
      end: content.length,
    },
  ];
}
