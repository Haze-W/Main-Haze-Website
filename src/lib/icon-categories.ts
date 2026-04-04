/**
 * Categorize Lucide icon names by prefix/pattern for the icon picker.
 */
export function getIconCategory(name: string): string {
  if (name.startsWith("arrow-")) return "Arrows";
  if (name.startsWith("circle-") || name.startsWith("square-") || name.startsWith("triangle-")) return "Shapes";
  if (name.startsWith("file-")) return "Files";
  if (name.startsWith("user-") || name.startsWith("users-") || name.startsWith("contact")) return "Users";
  if (name.startsWith("settings-") || name.startsWith("cog") || name.startsWith("sliders")) return "Settings";
  if (name.startsWith("mail-") || name.startsWith("message") || name.startsWith("send")) return "Communication";
  if (name.startsWith("image-") || name.startsWith("photo") || name.startsWith("picture")) return "Media";
  if (name.startsWith("music") || name.startsWith("video") || name.startsWith("play")) return "Media";
  if (name.startsWith("home-") || name.startsWith("building") || name.startsWith("house")) return "Layout";
  if (name.startsWith("layout") || name.startsWith("panel") || name.startsWith("columns")) return "Layout";
  if (name.startsWith("menu") || name.startsWith("sidebar") || name.startsWith("grid")) return "Layout";
  if (name.startsWith("check") || name.startsWith("x-") || name.startsWith("minus")) return "Actions";
  if (name.startsWith("plus") || name.startsWith("trash") || name.startsWith("edit")) return "Actions";
  if (name.startsWith("search") || name.startsWith("filter") || name.startsWith("sort")) return "Actions";
  if (name.startsWith("download") || name.startsWith("upload") || name.startsWith("share")) return "Actions";
  if (name.startsWith("lock") || name.startsWith("key") || name.startsWith("shield")) return "Security";
  if (name.startsWith("heart") || name.startsWith("star") || name.startsWith("bookmark")) return "Favorites";
  if (name.startsWith("chart") || name.startsWith("bar-chart") || name.startsWith("line-chart")) return "Charts";
  if (name.startsWith("code") || name.startsWith("terminal") || name.startsWith("braces")) return "Development";
  if (name.startsWith("database") || name.startsWith("server") || name.startsWith("cloud")) return "Data";
  if (name.startsWith("calendar") || name.startsWith("clock") || name.startsWith("timer")) return "Time";
  if (name.startsWith("map") || name.startsWith("globe") || name.startsWith("earth")) return "Location";
  if (name.startsWith("shopping") || name.startsWith("credit") || name.startsWith("wallet")) return "Commerce";
  if (name.startsWith("printer") || name.startsWith("scanner") || name.startsWith("monitor")) return "Devices";
  if (name.startsWith("bell") || name.startsWith("alert") || name.startsWith("info")) return "Alerts";
  if (name.startsWith("eye") || name.startsWith("visibility")) return "Visibility";
  if (name.startsWith("folder") || name.startsWith("archive") || name.startsWith("box")) return "Storage";
  return "General";
}

export const CATEGORY_ORDER = [
  "General",
  "Actions",
  "Arrows",
  "Shapes",
  "Layout",
  "Files",
  "Users",
  "Media",
  "Charts",
  "Development",
  "Settings",
  "Communication",
  "Alerts",
  "Time",
  "Location",
  "Security",
  "Favorites",
  "Data",
  "Commerce",
  "Devices",
  "Visibility",
  "Storage",
];
