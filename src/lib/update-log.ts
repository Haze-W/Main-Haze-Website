export type UpdateLogEntry = {
  id: string;
  title: string;
  description: string[];
  publishedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDescription(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEntry(entry: unknown): UpdateLogEntry | null {
  if (!isRecord(entry)) return null;

  const id = typeof entry.id === "string" ? entry.id.trim() : "";
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const publishedAt =
    typeof entry.publishedAt === "string" ? entry.publishedAt.trim() : "";
  const description = normalizeDescription(entry.description);

  if (!id || !title || !publishedAt || description.length === 0) return null;

  return {
    id,
    title,
    description,
    publishedAt,
  };
}

export function parseUpdateLog(value: unknown): UpdateLogEntry[] {
  if (!Array.isArray(value)) return [];

  const parsed = value
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is UpdateLogEntry => Boolean(entry));

  return parsed.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
