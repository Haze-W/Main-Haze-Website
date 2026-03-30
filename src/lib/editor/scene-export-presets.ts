/**
 * HTML for library CONTAINER presets that have no children — mirrors SceneNodeRenderer placeholders.
 * Colors come from component-content-tokens (same as editor CSS variables).
 */

import type { SceneNode } from "./types";
import { HAZE_COMP as H } from "./component-content-tokens";

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function box(
  pad: string,
  extraAttrs: string,
  cursorStyle: string,
  styleStr: string,
  extraBox: string,
  inner: string
): string {
  const full = `${cursorStyle}${styleStr};${extraBox}`;
  return `${pad}<div ${extraAttrs} style="${escAttr(full)}">${inner}</div>`;
}

/** @returns full HTML div or null to fall through to generic CONTAINER */
export function buildPresetEmptyContainerHtml(
  node: SceneNode,
  pad: string,
  extraAttrs: string,
  cursorStyle: string,
  styleStr: string
): string | null {
  if (node.type !== "CONTAINER" || (node.children?.length ?? 0) > 0) return null;

  const props = node.props ?? {};
  const variant = (props.variant as string) ?? "";
  const nm = node.name;
  const bgUser = props.backgroundColor as string | undefined;
  const bg = bgUser ?? H.surface;
  const radius = (props.borderRadius as number) ?? 10;

  const base = `${styleStr};background:${bg};border:1px solid ${H.border};border-radius:${radius}px`;

  // —— Card ——
  if (variant === "card" || nm === "Card") {
    const inner = `<div class="cardHeader">Card Title</div><div class="cardBody">Card content goes here</div>`;
    return `${pad}<div ${extraAttrs} class="cardNode" style="${escAttr(styleStr)}">${inner}</div>`;
  }

  // —— Toast ——
  if (variant === "toast" || nm === "Toast") {
    const inner = `<span style="font-size:16px;color:${H.success};flex-shrink:0;">✓</span><span style="flex:1;font-size:13px;color:${H.text};">Action completed successfully</span><span style="font-size:14px;color:${H.textMuted};">✕</span>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      base,
      `display:flex;align-items:center;gap:10px;padding:0 14px;box-shadow:${H.toastShadow};`,
      inner
    );
  }

  // —— Video (VIDEO_PLAYER preset name "Video") ——
  if (nm === "Video") {
    const inner = `<div style="width:40px;height:40px;background:${H.playIconBg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;color:${H.textOnDark};">▶</div><div style="width:80%;height:4px;background:${H.borderOnDark};border-radius:2px;"></div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${bgUser ?? H.surfaceDark};border:1px solid ${H.borderOnDark};border-radius:8px`,
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;",
      inner
    );
  }

  // —— Pricing Card ——
  if (nm === "Pricing Card") {
    const feats = ["Unlimited projects", "Priority support", "Analytics"]
      .map(
        (f) =>
          `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:${H.textSecondary};"><span style="color:${H.success};">✓</span>${f}</div>`
      )
      .join("");
    const inner = `<div style="font-size:12px;font-weight:600;color:${H.accent};text-transform:uppercase;letter-spacing:0.08em;">Pro</div><div style="font-size:28px;font-weight:800;color:${H.text};">$49<span style="font-size:13px;color:${H.textMuted};font-weight:400;">/mo</span></div>${feats}<div style="padding:8px;background:${H.accent};color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-align:center;margin-top:4px;">Get Started</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${bgUser ?? H.surface};border:1px solid ${H.border};border-radius:12px;box-shadow:${H.shadowSm}`,
      "display:flex;flex-direction:column;padding:20px 16px;gap:8px;",
      inner
    );
  }

  // —— Notification ——
  if (nm === "Notification") {
    const inner = `<div style="font-size:20px;flex-shrink:0;">🔔</div><div style="flex:1;"><div style="font-size:13px;font-weight:600;color:${H.text};">New message</div><div style="font-size:11px;color:${H.textMuted};">2 minutes ago</div></div><div style="width:8px;height:8px;background:${H.accent};border-radius:50%;flex-shrink:0;"></div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;align-items:center;gap:10px;padding:0 14px;", inner);
  }

  // —— Alert ——
  if (nm === "Alert") {
    const content = (props.content as string) ?? "Alert message";
    const v = (props.variant as string) ?? "info";
    const alertClass = (
      v === "success" ? "alertSuccess" :
      v === "warning" ? "alertWarning" :
      v === "error" ? "alertError" : "alertInfo"
    );
    return `${pad}<div ${extraAttrs} class="alertNode ${alertClass}" style="${escAttr(styleStr)}">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
  }

  // —— Modal ——
  if (variant === "modal" || nm === "Modal") {
    const inner = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${H.border};font-size:14px;font-weight:600;color:${H.text};"><span>Modal Title</span><span style="font-size:16px;color:${H.textMuted};">✕</span></div><div style="flex:1;padding:14px 16px;font-size:13px;color:${H.textSecondary};">Modal content</div><div style="display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid ${H.border};"><div style="padding:6px 14px;font-size:12px;border-radius:6px;background:${H.headerBar};color:${H.text};border:1px solid ${H.border};">Cancel</div><div style="padding:6px 14px;font-size:12px;border-radius:6px;background:${H.accent};color:#fff;">Confirm</div></div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:12px;box-shadow:${H.modalShadow}`,
      "display:flex;flex-direction:column;overflow:hidden;",
      inner
    );
  }

  // —— Drawer ——
  if (variant === "drawer" || nm === "Drawer") {
    const inner = `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${H.border};font-size:14px;font-weight:600;color:${H.text};"><span>Drawer</span><span style="color:${H.textMuted};">✕</span></div><div style="flex:1;padding:14px 16px;font-size:13px;color:${H.textSecondary};">Drawer content</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px;box-shadow:${H.shadowMd}`,
      "display:flex;flex-direction:column;overflow:hidden;",
      inner
    );
  }

  // —— Navbar ——
  if (variant === "navbar" || nm === "Navbar") {
    const inner = `<div style="font-size:14px;font-weight:700;color:${H.textOnDark};">Logo</div><div style="display:flex;gap:16px;font-size:13px;color:${H.textOnDarkMuted};"><span>Home</span><span>About</span><span>Docs</span></div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${bgUser ?? H.surfaceNav};border:1px solid ${H.borderOnDark};border-radius:6px`,
      "display:flex;align-items:center;justify-content:space-between;padding:0 16px;",
      inner
    );
  }

  // —— Sidebar ——
  if (variant === "sidebar" || nm === "Sidebar") {
    const items = ["Dashboard", "Projects", "Settings", "Account"]
      .map(
        (t, i) =>
          `<div style="padding:7px 10px;border-radius:5px;font-size:13px;color:${i === 0 ? H.accent : H.textSecondary};font-weight:${i === 0 ? "500" : "400"};background:${i === 0 ? H.accentSoftBg : "transparent"};">${t}</div>`
      )
      .join("");
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${bgUser ?? H.surfaceSubtle};border:1px solid ${H.border};border-radius:8px`,
      "display:flex;flex-direction:column;padding:8px;gap:2px;",
      items
    );
  }

  // —— Table ——
  if (nm === "Table") {
    const cols = ["Name", "Status", "Value"];
    const rows = [
      ["Item A", "Active", "$120"],
      ["Item B", "Pending", "$80"],
    ];
    const head = `<div style="display:flex;background:${H.headerBar};border-bottom:1px solid ${H.border};">${cols.map((c) => `<div style="flex:1;padding:7px 10px;font-size:12px;font-weight:600;color:${H.text};">${c}</div>`).join("")}</div>`;
    const body = rows
      .map(
        (row) =>
          `<div style="display:flex;border-bottom:1px solid ${H.border};">${row.map((cell) => `<div style="flex:1;padding:7px 10px;font-size:12px;color:${H.textSecondary};">${cell}</div>`).join("")}</div>`
      )
      .join("");
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`,
      "overflow:hidden;display:flex;flex-direction:column;",
      head + body
    );
  }

  // —— Form / Login ——
  if (nm === "Form" || nm === "Login Form") {
    const title = nm === "Login Form" ? `<div style="font-size:16px;font-weight:700;color:${H.text};margin-bottom:4px;">Sign In</div>` : "";
    const field = (label: string, val: string) =>
      `<div style="display:flex;flex-direction:column;gap:3px;"><div style="font-size:11px;color:${H.textMuted};">${label}</div><div style="padding:6px 10px;background:${H.inputBg};border:1px solid ${H.border};border-radius:5px;font-size:12px;color:${H.textSecondary};">${val}</div></div>`;
    const inner =
      title +
      field("Email", "email@example.com") +
      field("Password", "••••••••") +
      `<div style="padding:8px;background:${H.accent};color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-align:center;margin-top:4px;">${nm === "Login Form" ? "Sign In" : "Submit"}</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:10px`,
      "display:flex;flex-direction:column;padding:16px;gap:10px;",
      inner
    );
  }

  // —— Hero ——
  if (nm === "Hero") {
    const inner = `<div style="font-size:20px;font-weight:800;color:${H.text};">Build something great</div><div style="font-size:12px;color:${H.textMuted};">The fastest way to ship real desktop apps.</div><div style="padding:8px 20px;background:${H.accent};color:#fff;font-size:13px;font-weight:600;border-radius:6px;margin-top:4px;">Get Started</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${bgUser ?? H.heroGradient};border:1px solid ${H.border};border-radius:12px`,
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;",
      inner
    );
  }

  // —— CTA ——
  if (nm === "CTA") {
    const inner = `<div style="font-size:14px;font-weight:600;color:${H.text};">Ready to get started?</div><div style="padding:8px 18px;background:${H.accent};color:#fff;font-size:13px;font-weight:600;border-radius:6px;">Try for free</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.accentSoftBg};border:1px solid ${H.accentSoftBorder};border-radius:12px`,
      "display:flex;align-items:center;justify-content:space-between;padding:0 20px;",
      inner
    );
  }

  // —— Audio ——
  if (nm === "Audio") {
    const inner = `<span style="font-size:18px;color:${H.text};">▶</span><div style="flex:1;height:4px;background:${H.progressTrack};border-radius:2px;"><div style="width:35%;height:100%;background:${H.accent};border-radius:2px;"></div></div><span style="font-size:11px;color:${H.textMuted};">0:00</span>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`,
      "display:flex;align-items:center;gap:10px;padding:0 12px;",
      inner
    );
  }

  // —— Progress ——
  if (variant === "progress" || nm === "Progress Bar") {
    const value = (props.value as number) ?? 60;
    const inner = `<div class="progressFill" style="width:${value}%;"></div>`;
    return `${pad}<div ${extraAttrs} class="progressNode" style="${escAttr(styleStr)}"><div class="progressTrack">${inner}</div></div>`;
  }

  // —— Stats ——
  if (nm === "Stats") {
    const inner = `<div style="font-size:24px;font-weight:700;color:${H.text};">2,847</div><div style="font-size:11px;color:${H.textMuted};margin-top:2px;">Total Users</div><div style="font-size:11px;color:${H.success};margin-top:4px;">↑ 12% this week</div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:12px 14px;", inner);
  }

  // —— Bar chart ——
  if (nm === "Bar Chart") {
    const raw = ((props.data as string) ?? "60,85,45,90,70,55,80").split(",").map((v) => Math.max(2, Math.min(100, Number(v.trim()) || 50)));
    const bars = raw
      .map((h) => `<div style="flex:1;background:${H.accent};border-radius:2px 2px 0 0;min-height:4px;height:${h}%;opacity:0.85;"></div>`)
      .join("");
    const inner = `<div style="display:flex;align-items:flex-end;gap:4px;width:100%;height:80%;">${bars}</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`,
      "display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:12px 8px 8px;overflow:hidden;",
      inner
    );
  }

  // —— Badge / Tag ——
  if (nm === "Badge" || nm === "Tag") {
    const content = (props.content as string) ?? nm;
    const safe = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const userStyle = `${styleStr};`;
    return `${pad}<div ${extraAttrs} class="badgeNode" style="${escAttr(userStyle)}">${safe}</div>`;
  }

  // —— Tooltip ——
  if (nm === "Tooltip") {
    const t = (props.content as string) ?? "Tooltip text";
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:6px;box-shadow:${H.shadowMd}`,
      `display:flex;align-items:center;justify-content:center;padding:6px 12px;font-size:12px;color:${H.text};`,
      t.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    );
  }

  // —— Tabs ——
  if (nm === "Tabs") {
    const tabs = (props.tabs as string[]) ?? ["Tab 1", "Tab 2"];
    const active = (props.activeTab as number) ?? 0;
    const header = tabs
      .map(
        (t, i) =>
          `<div class="tabItem${i === active ? " tabActive" : ""}">${t}</div>`
      )
      .join("");
    const inner = `<div class="tabsHeader">${header}</div><div class="tabsBody">${tabs[active] ?? tabs[0]}</div>`;
    return `${pad}<div ${extraAttrs} class="tabsNode" style="${escAttr(styleStr)}">${inner}</div>`;
  }

  // —— Spinner ——
  if (nm === "Spinner") {
    return `${pad}<div ${extraAttrs} class="spinnerNode" style="${escAttr(styleStr)}"><div class="spinner"></div></div>`;
  }

  // —— List ——
  // —— List ——
  if (nm === "List") {
    const inner = ["Item one", "Item two", "Item three"]
      .map((item) => `<div class="listItem">${item}</div>`)
      .join("");
    return `${pad}<div ${extraAttrs} class="listNode" style="${escAttr(styleStr)}">${inner}</div>`;
  }

  // —— Markdown / Code block ——
  if (nm === "Markdown") {
    const inner = `<div style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.5;color:${H.textOnDarkMuted};"><div><span style="color:#f97316;">const</span> <span style="color:#60a5fa;">app</span> = <span style="color:#a3e635;">"Haze"</span></div><div><span style="color:#f97316;">export</span> <span style="color:#f97316;">default</span> app</div></div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surfaceCode};border:1px solid ${H.borderOnDark};border-radius:8px`,
      "padding:12px 14px;",
      inner
    );
  }

  if (nm === "Code Block") {
    const lang = (props.language as string) ?? "javascript";
    const inner = `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(0,0,0,0.2);border-bottom:1px solid ${H.borderOnDark};font-size:11px;color:${H.textOnDarkMuted};font-weight:600;">${lang.toUpperCase()}</div><div style="padding:12px 14px;font-family:ui-monospace,monospace;font-size:12px;line-height:1.5;color:${H.textOnDarkMuted};"><div><span style="color:#f97316;">const</span> <span style="color:#60a5fa;">value</span> = <span style="color:#a3e635;">42</span></div><div><span style="color:#f97316;">return</span> value</div></div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surfaceCode};border:1px solid ${H.borderOnDark};border-radius:8px`,
      "display:flex;flex-direction:column;",
      inner
    );
  }

  // —— Kanban ——
  if (nm === "Kanban") {
    const cards = ["Task one", "Task two", "Task three"]
      .map(
        (t) =>
          `<div style="background:${H.kanbanCardBg};border:1px solid ${H.border};border-radius:6px;padding:7px 10px;font-size:12px;color:${H.textSecondary};box-shadow:${H.shadowSm};">${t}</div>`
      )
      .join("");
    const inner = `<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${H.text};padding-bottom:6px;border-bottom:1px solid ${H.border};">To Do <span style="background:${H.accent};color:#fff;border-radius:9999px;padding:1px 6px;font-size:10px;">3</span></div>${cards}`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surfaceSubtle};border:1px solid ${H.border};border-radius:10px`,
      "display:flex;flex-direction:column;padding:10px;gap:6px;",
      inner
    );
  }

  // —— Chat bubble ——
  if (nm === "Chat Bubble") {
    const inner = `<div style="width:28px;height:28px;background:${H.accent};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">U</div><div style="background:${H.accentSoftBg};border:1px solid ${H.accentSoftBorder};border-radius:12px 12px 12px 3px;padding:7px 12px;font-size:13px;color:${H.text};">Hey, how's it going?</div>`;
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:transparent;border:none`, "display:flex;align-items:center;gap:8px;", inner);
  }

  // —— File upload ——
  if (nm === "File Upload") {
    const inner = `<div style="font-size:24px;">📁</div><div style="font-size:12px;color:${H.textMuted};margin-top:4px;">Drop files here or click to upload</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surfaceSubtle};border:2px dashed ${H.borderStrong};border-radius:10px`,
      "display:flex;flex-direction:column;align-items:center;justify-content:center;",
      inner
    );
  }

  // —— Pagination ——
  if (nm === "Pagination") {
    const inner = ["‹", "1", "2", "3", "›"]
      .map(
        (p, i) =>
          `<div class="pageBtn${p === "1" ? " pageActive" : ""}">${p}</div>`
      )
      .join("");
    return `${pad}<div ${extraAttrs} class="paginationNode" style="${escAttr(styleStr)}">${inner}</div>`;
  }

  // —— Breadcrumbs ——
  if (nm === "Breadcrumbs") {
    const parts = ["Home", "Projects", "Current"];
    const inner = parts
      .map(
        (b, i, arr) =>
          `<span style="display:flex;align-items:center;gap:4px;"><span style="font-size:12px;color:${i === arr.length - 1 ? H.text : H.accent};font-weight:${i === arr.length - 1 ? "500" : "400"};">${b}</span>${i < arr.length - 1 ? `<span style="color:${H.textMuted};font-size:11px;">/</span>` : ""}</span>`
      )
      .join("");
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:transparent;border:none`, "display:flex;align-items:center;gap:4px;padding:0;", inner);
  }

  // —— Empty State / Error State / Success State ——
  if (nm === "Empty State" || nm === "Error State" || nm === "Success State") {
    const map = {
      "Empty State": { icon: "📭", t: "Nothing here yet", s: "Add some content to get started" },
      "Error State": { icon: "❌", t: "Something went wrong", s: "Please try again" },
      "Success State": { icon: "✅", t: "All done!", s: "Action completed successfully" },
    } as const;
    const m = map[nm as keyof typeof map];
    const inner = `<div style="font-size:32px;">${m.icon}</div><div style="font-size:14px;font-weight:600;color:${H.text};">${m.t}</div><div style="font-size:12px;color:${H.textMuted};">${m.s}</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:12px`,
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:16px;",
      inner
    );
  }

  // —— Skeleton ——
  if (nm === "Skeleton") {
    return `${pad}<div ${extraAttrs} class="skeletonNode" style="${escAttr(styleStr)}"></div>`;
  }

  // —— Listbox ——
  if (nm === "Listbox" || nm === "Dropdown" || nm === "Dropdown Menu") {
    const items = ["Option 1", "Option 2", "Option 3"]
      .map(
        (item, i) =>
          `<div style="padding:8px 12px;font-size:12px;color:${i === 0 ? H.accent : H.text};background:${i === 0 ? H.accentSoftBg : "transparent"};cursor:pointer;">${item}</div>`
      )
      .join("");
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:6px;overflow:hidden`, "display:flex;flex-direction:column;", items);
  }

  // —— Slider ——
  if (nm === "Slider") {
    const value = (props.sliderValue as number) ?? 40;
    const inner = `<div class="sliderFill" style="width:${value}%;"></div><div class="sliderThumb" style="left:${value}%;"></div>`;
    return `${pad}<div ${extraAttrs} class="sliderNode" style="${escAttr(styleStr)}"><div class="sliderTrack">${inner}</div></div>`;
  }

  // —— Timeline ——
  if (nm === "Timeline") {
    const events = ["Project started", "First release", "Version 2.0"]
      .map(
        (e, i) =>
          `<div style="display:flex;gap:12px;padding:8px 0;"><div style="width:12px;height:12px;background:${H.accent};border-radius:50%;flex-shrink:0;margin-top:4px;"></div><div style="font-size:12px;font-weight:600;color:${H.text};">${e}</div></div>`
      )
      .join("");
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;padding:12px 14px;", events);
  }

  // —— Gauge / Meter ——
  if (nm === "Gauge") {
    const inner = `<svg viewBox="0 0 100 60" style="width:80%"><path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e0e0e0" stroke-width="8" stroke-linecap="round" /><path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="${H.accent}" stroke-width="8" stroke-linecap="round" stroke-dasharray="75 126" /></svg><div style="font-size:13px;font-weight:600;color:${H.text};margin-top:-8px;">75%</div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;", inner);
  }

  // —— Comment ——
  if (nm === "Comment") {
    const inner = `<div style="width:24px;height:24px;background:${H.accent};border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:white;">+</div><div style="flex:1;background:${H.inputBg};border:1px solid ${H.border};border-radius:20px;padding:6px 12px;font-size:12px;color:${H.textMuted};">Add comment...</div>`;
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:transparent;border:none`, "display:flex;align-items:center;gap:8px;padding:8px 0;", inner);
  }

  // —— User Profile ——
  if (nm === "User Profile") {
    const inner = `<div style="width:40px;height:40px;background:${H.accent};border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:white;">U</div><div><div style="font-size:13px;font-weight:600;color:${H.text};">John Doe</div><div style="font-size:11px;color:${H.textMuted};">john@example.com</div></div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;align-items:center;gap:10px;padding:12px 14px;", inner);
  }

  // —— Carousel ——
  if (nm === "Carousel") {
    const slides = ["Slide 1", "Slide 2", "Slide 3"];
    const activeSlide = 0;
    const slidesHtml = `<div style="width:100%;height:100%;background:${H.accent};display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:600;">${slides[activeSlide]}</div>`;
    const nav = `<div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:8px;background:rgba(0,0,0,0.1);"><span style="font-size:14px;color:#fff;cursor:pointer;">‹</span>${[0,1,2].map((i) => `<div style="width:6px;height:6px;background:${i === activeSlide ? H.accent : H.border};border-radius:50%;"></div>`).join('')}<span style="font-size:14px;color:#fff;cursor:pointer;">›</span></div>`;
    const inner = `${slidesHtml}${nav}`;
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`, "display:flex;flex-direction:column;overflow:hidden;", inner);
  }

  // —— Line Chart ——
  if (nm === "Line Chart") {
    const points = "<polyline points='10,60 40,40 70,50 100,30 130,45 160,20' style='fill:none;stroke:" + H.accent + ";stroke-width:2;'></polyline>";
    const inner = `<svg width="100%" height="100%" viewBox="0 0 170 80" style="overflow:visible;">${points}</svg>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`,
      "display:flex;align-items:center;justify-content:center;padding:12px 8px;",
      inner
    );
  }

  // —— Pie Chart ——
  if (nm === "Pie Chart") {
    const inner = `<svg width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="${H.accent}"/><circle cx="50" cy="50" r="40" fill="${H.surface}"/><path d="M50,50 L50,10 A40,40 0 0,1 85,78 Z" fill="${H.accent}"/><circle cx="50" cy="50" r="15" fill="${H.surface}"/></svg>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;align-items:center;justify-content:center;", inner);
  }

  // —— Color Picker ——
  if (nm === "Color Picker") {
    const colors = ["#5e5ce6", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"]
      .map((c) => `<div style="width:24px;height:24px;background:${c};border-radius:4px;border:2px solid #fff;box-shadow:0 0 0 1px ${H.border};cursor:pointer;"></div>`)
      .join("");
    const hexValue = `<div style="padding:6px 10px;background:${H.inputBg};border:1px solid ${H.border};border-radius:4px;font-size:12px;color:${H.text};font-family:monospace;">#5e5ce6</div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;gap:8px;padding:8px;", `${colors}${hexValue}`);
  }

  // —— Settings Panel ——
  if (nm === "Settings") {
    const settings = ["Dark Mode", "Notifications", "Privacy"]
      .map(
        (s) =>
          `<div style="padding:10px 12px;border-bottom:1px solid ${H.border};font-size:13px;color:${H.text};">${s}</div>`
      )
      .join("");
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`, "display:flex;flex-direction:column;", `<div style="font-size:12px;font-weight:600;color:${H.text};padding:8px 12px;">${nm}</div>${settings}`);
  }

  // —— Map ——
  if (nm === "Map") {
    const inner = `<div style="font-size:32px;">🗺</div><div style="font-size:12px;color:${H.textMuted};margin-top:4px;">Map placeholder</div>`;
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:8px`, "display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;", inner);
  }

  // —— Date Picker ——
  if (nm === "Date Picker") {
    const inner = `<div style="font-size:12px;color:${H.textMuted};margin-bottom:4px;">Selected: Mar 31, 2026</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;"><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">S</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">M</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">T</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">W</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">T</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">F</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:10px;color:${H.textMuted};">S</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;color:${H.text};">15</div><div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;color:${H.accent};background:${H.accentSoftBg};border-radius:3px;font-weight:600;">31</div></div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;padding:10px 12px;", inner);
  }

  // —— Time Picker ——
  if (nm === "Time Picker") {
    const inner = `<div style="font-size:14px;color:${H.textMuted};margin-bottom:4px;">Selected: 14:30</div><div style="display:flex;gap:8px;align-items:center;"><input type="number" min="0" max="23" value="14" style="width:40px;padding:4px;border:1px solid ${H.border};border-radius:4px;text-align:center;font-size:12px;"><div style="font-size:16px;color:${H.text};">:</div><input type="number" min="0" max="59" value="30" style="width:40px;padding:4px;border:1px solid ${H.border};border-radius:4px;text-align:center;font-size:12px;"></div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;padding:10px 12px;", inner);
  }

  // —— Search Box ——
  if (nm === "Search" || nm === "Search Box") {
    const inner = `<span style="font-size:14px;color:${H.textMuted};flex-shrink:0;">🔍</span><input type="text" placeholder="Search..." style="flex:1;border:none;background:transparent;outline:none;font-size:13px;color:${H.text};padding:8px 0;" />`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${H.inputBg};border:1px solid ${H.border};border-radius:6px`,
      "display:flex;align-items:center;gap:8px;padding:0 10px;height:36px;",
      inner
    );
  }

  // —— Footer ——
  if (nm === "Footer") {
    const inner = `<span style="font-size:12px;color:${H.textMuted};">© 2026 App</span><div style="display:flex;gap:16px;font-size:12px;color:${H.textMuted};"><span>Privacy</span><span>Terms</span><span>Contact</span></div>`;
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:${H.surface};border:1px solid ${H.border};border-radius:6px`, "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;", inner);
  }

  // —— Section ——
  if (nm === "Section") {
    const inner = `<div style="font-size:16px;font-weight:700;color:${H.text};margin-bottom:8px;">Section Title</div><div style="font-size:13px;color:${H.textSecondary};">This is a content section with some descriptive text and information.</div>`;
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:transparent;border:none`,
      "padding:0",
      inner
    );
  }

  return null;
}
