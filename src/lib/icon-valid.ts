/**
 * Validates Lucide icon names. Falls back to "circle" if invalid.
 * Uses lucide-react/dynamic iconNames for validation when available.
 */

let validNamesSet: Set<string> | null = null;

function getValidNames(): Set<string> {
  if (!validNamesSet) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic validation at runtime
      const mod = require("lucide-react/dynamic") as { iconNames?: string[] };
      const names = mod?.iconNames;
      if (names && Array.isArray(names)) {
        validNamesSet = new Set(names);
      } else {
        validNamesSet = new Set(["circle", "star", "home", "settings", "user"]);
      }
    } catch {
      validNamesSet = new Set(["circle", "star", "home", "settings", "user"]);
    }
  }
  return validNamesSet;
}

export function getValidIconName(name: string | undefined): string {
  if (!name || typeof name !== "string") return "circle";
  const valid = getValidNames();
  return valid.has(name) ? name : "circle";
}
