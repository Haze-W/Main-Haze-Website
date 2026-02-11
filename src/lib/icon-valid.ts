/**
 * Validates Lucide icon names. Falls back to "circle" if invalid.
 * Uses lucide-react/dynamic iconNames for validation when available.
 */

let validNamesSet: Set<string> | null = null;

function getValidNames(): Set<string> {
  if (!validNamesSet) {
    try {
      const mod = require("lucide-react/dynamic");
      const names = mod?.iconNames;
      if (names && Array.isArray(names)) {
        validNamesSet = new Set(names as string[]);
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
