import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, "../src/lib/ai/agent/layout-generator.ts");
let s = fs.readFileSync(p, "utf8");

const ABSTRACT = `/** No concrete example UI JSON — avoids the model copying the same dashboard labels every time. */
const ABSTRACT_JSON_SHAPE_GUIDE = \`
Output shape: { "frame": { "width", "height", "background" (hex), "children": [ ... ] } }
Each child: "id", "type", "x", "y", "width", "height", optional "backgroundColor", "color", "text", "styles": { "padding", "borderRadius" }, "props": { "iconName": "lucide-kebab-name" }, "children": [ nested ] }.
Types: sidebar, topbar, navbar, hero, card, text, button, input, icon, image, frame, container, form, table, modal, settings.
Coordinates are relative to parent. Vary structure to match the user's app (chat thread, player, login, landing, etc.) — do NOT default to sidebar + three KPI metric cards unless they asked for analytics.
\`.trim();
`;

const i1 = s.indexOf("const DRIBBBLE_EXAMPLE_1");
const i2 = s.indexOf("const SYSTEM_PROMPT");
if (i1 < 0 || i2 < 0) {
  console.error("markers", i1, i2);
  process.exit(1);
}
s = s.slice(0, i1) + ABSTRACT + s.slice(i2);
fs.writeFileSync(p, s);
console.log("OK, length", s.length);
