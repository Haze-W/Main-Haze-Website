/**
 * Converts Lucide icon name to inline SVG string for export.
 * Uses lucide package icon data.
 */

type IconNode = [tag: string, attrs: Record<string, string | number>, children?: IconNode[]];

function iconNodeToSvgString(
  iconNode: IconNode[],
  size: number,
  color: string,
  strokeWidth: number
): string {
  const attrStr = (attrs: Record<string, string | number>) =>
    Object.entries(attrs)
      .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
      .join(" ");

  const renderNode = (node: IconNode): string => {
    const [tag, attrs, children] = node;
    const inner = children?.map(renderNode).join("") ?? "";
    return `<${tag} ${attrStr(attrs)}>${inner}</${tag}>`;
  };

  const inner = iconNode.map(renderNode).join("");
  const svgAttrs: Record<string, string | number> = {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    "stroke-width": strokeWidth,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  };
  return `<svg ${attrStr(svgAttrs)}>${inner}</svg>`;
}

export function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("");
}

// Lazy-loaded lucide icons (ESM)
let lucideModule: { icons?: Record<string, IconNode[]>; [key: string]: unknown } | null = null;

async function getLucideModule() {
  if (!lucideModule) {
    lucideModule = (await import("lucide")) as { icons?: Record<string, IconNode[]>; [key: string]: unknown };
  }
  return lucideModule;
}

/**
 * Returns inline SVG string for a Lucide icon by name (async).
 * Falls back to a simple placeholder if icon is not found.
 */
export async function getIconSvgAsync(
  iconName: string,
  size = 24,
  color = "currentColor",
  strokeWidth = 2
): Promise<string> {
  try {
    const mod = await getLucideModule();
    const pascal = toPascalCase(iconName);
    const iconNode = (mod.icons?.[pascal] ?? mod.icons?.[iconName] ?? (mod as Record<string, IconNode[]>)[pascal]) as IconNode[] | undefined;
    if (iconNode && Array.isArray(iconNode)) {
      return iconNodeToSvgString(iconNode, size, color, strokeWidth);
    }
  } catch {
    // Fallback if lucide not loaded
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}"><circle cx="12" cy="12" r="8"/></svg>`;
}

/**
 * Sync version - uses preloaded icons. Call preloadLucideIcons() before export for best results.
 */
export function getIconSvg(
  iconName: string,
  size = 24,
  color = "currentColor",
  strokeWidth = 2
): string {
  try {
    if (lucideModule) {
      const pascal = toPascalCase(iconName);
      const iconNode = (lucideModule.icons?.[pascal] ?? (lucideModule as Record<string, IconNode[]>)[pascal]) as IconNode[] | undefined;
      if (iconNode && Array.isArray(iconNode)) {
        return iconNodeToSvgString(iconNode, size, color, strokeWidth);
      }
    }
  } catch {
    // Fallback
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}"><circle cx="12" cy="12" r="8"/></svg>`;
}

export async function preloadLucideIcons(): Promise<void> {
  await getLucideModule();
}
