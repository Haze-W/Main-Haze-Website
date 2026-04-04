/**
 * Validates and normalises Lucide icon names.
 * lucide-react DynamicIcon expects kebab-case keys ("layout-dashboard").
 * Uses the same `iconNames` list as IconPickerContent / lucide dynamic API.
 */

import { iconNames } from "lucide-react/dynamic";

let validKebabSet: Set<string> | null = null;

function getValidKebabNames(): Set<string> {
  if (!validKebabSet) {
    validKebabSet = new Set(iconNames);
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
  return name.replace(/([A-Z])/g, (match, letter, offset) =>
    offset > 0 ? `-${letter.toLowerCase()}` : letter.toLowerCase()
  );
}

/**
 * Returns a valid kebab-case icon name for use with DynamicIcon.
 * Accepts kebab-case, PascalCase, or mixed case. Falls back to "circle" if unknown.
 */
export function getValidIconName(name: string | undefined): string {
  if (!name || typeof name !== "string") return "circle";

  const raw = name.trim();
  if (!raw) return "circle";

  const valid = getValidKebabNames();
  const lowerKebab = raw.toLowerCase().replace(/_/g, "-");
  if (valid.has(lowerKebab)) return lowerKebab;

  const fromPascal = pascalToKebab(raw);
  if (valid.has(fromPascal)) return fromPascal;

  return "circle";
}
