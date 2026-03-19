/**
 * Validates and normalises Lucide icon names.
 * lucide-react DynamicIcon expects kebab-case keys ("layout-dashboard").
 * This module validates against iconNames and returns the correct format.
 */

let validKebabSet: Set<string> | null = null;

function getValidKebabNames(): Set<string> {
  if (!validKebabSet) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("lucide-react/dynamic") as { iconNames?: string[] };
      const names = mod?.iconNames;
      if (names && Array.isArray(names)) {
        validKebabSet = new Set(names);
      } else {
        validKebabSet = new Set(["circle", "star", "home", "settings", "user"]);
      }
    } catch {
      validKebabSet = new Set(["circle", "star", "home", "settings", "user"]);
    }
  }
  return validKebabSet;
}

/** Convert kebab-case to PascalCase: "arrow-right" → "ArrowRight" */
export function kebabToPascal(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Convert PascalCase to kebab-case: "ArrowRight" → "arrow-right" */
export function pascalToKebab(name: string): string {
  return name
    .replace(/([A-Z])/g, (match, letter, offset) =>
      offset > 0 ? `-${letter.toLowerCase()}` : letter.toLowerCase()
    );
}

/**
 * Returns a valid kebab-case icon name for use with DynamicIcon.
 * DynamicIcon expects keys from dynamicIconImports which are kebab-case.
 * Accepts both kebab-case and PascalCase input.
 * Falls back to "circle" if the name is invalid.
 */
export function getValidIconName(name: string | undefined): string {
  if (!name || typeof name !== "string") return "circle";

  // Normalise to kebab for validation
  const kebab = name.includes("-") ? name : pascalToKebab(name);
  const valid = getValidKebabNames();

  if (valid.has(kebab)) {
    return kebab;
  }

  // Try direct match (already PascalCase)
  const asKebab = pascalToKebab(name);
  if (valid.has(asKebab)) {
    return asKebab;
  }

  return "circle";
}
