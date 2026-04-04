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

/** Parse the local update-log.json format (categories with changes) into UpdateLogEntry[] */
export function parseLocalUpdateLog(value: unknown): UpdateLogEntry[] {
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const entries = obj.entries;
  if (!Array.isArray(entries)) return [];

  const result: UpdateLogEntry[] = [];
  const baseDate = (obj.lastUpdated as string) || new Date().toISOString();

  entries.forEach((cat: unknown, catIdx: number) => {
    if (!cat || typeof cat !== "object") return;
    const c = cat as Record<string, unknown>;
    const category = String(c.category || "Updates");
    const changes = Array.isArray(c.changes) ? c.changes : [];

    changes.forEach((ch: unknown, chIdx: number) => {
      if (!ch || typeof ch !== "object") return;
      const change = ch as Record<string, unknown>;
      const title = String(change.title || "Update");
      const desc = change.description;
      const descStr = typeof desc === "string" ? desc : Array.isArray(desc) ? desc.join(" ") : "";
      result.push({
        id: `cat-${catIdx}-ch-${chIdx}`,
        title: `[${category}] ${title}`,
        description: descStr ? [descStr] : [title],
        publishedAt: baseDate,
      });
    });
  });

  return result.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
