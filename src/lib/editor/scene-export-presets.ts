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
    const inner = `<div style="padding:12px 14px 0;font-size:14px;font-weight:600;color:${H.text};">Card Title</div><div style="padding:8px 14px 12px;font-size:12px;color:${H.textMuted};flex:1;">Card content goes here</div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;overflow:hidden;", inner);
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
    const borderC =
      v === "success" ? "rgba(34,197,94,0.35)" : v === "warning" ? "rgba(245,158,11,0.35)" : v === "error" ? "rgba(239,68,68,0.35)" : "rgba(59,130,246,0.35)";
    const bgA =
      v === "success" ? "rgba(34,197,94,0.12)" : v === "warning" ? "rgba(245,158,11,0.12)" : v === "error" ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)";
    return box(
      pad,
      extraAttrs,
      cursorStyle,
      `${styleStr};background:${bgA};border:1px solid ${borderC};border-radius:8px`,
      `padding:10px 14px;font-size:13px;color:${H.text};`,
      content.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    );
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
    const inner = `<div style="width:100%;height:8px;background:${H.progressTrack};border-radius:4px;overflow:hidden;"><div style="width:${value}%;height:100%;background:${H.accent};border-radius:4px;"></div></div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;align-items:center;padding:0 8px;", inner);
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
    const fg = (props.color as string) || "#fff";
    const bbg = (props.backgroundColor as string) || H.accent;
    const safe = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:${bbg};color:${fg};border-radius:6px`, "display:flex;align-items:center;justify-content:center;padding:4px 10px;font-size:12px;font-weight:600;", safe);
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
          `<div style="padding:8px 12px;font-size:12px;color:${i === active ? H.accent : H.textMuted};border-bottom:2px solid ${i === active ? H.accent : "transparent"};font-weight:${i === active ? "600" : "400"};">${t}</div>`
      )
      .join("");
    const inner = `<div style="display:flex;border-bottom:1px solid ${H.border};">${header}</div><div style="padding:10px 12px;font-size:11px;color:${H.textMuted};">${tabs[active] ?? tabs[0]}</div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;overflow:hidden;", inner);
  }

  // —— Spinner ——
  if (nm === "Spinner") {
    const inner = `<div style="width:22px;height:22px;border:3px solid ${H.spinnerTrack};border-top-color:${H.accent};border-radius:50%;animation:haze-spin 0.7s linear infinite;"></div>`;
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;align-items:center;justify-content:center;", inner);
  }

  // —— List ——
  if (nm === "List") {
    const inner = ["Item one", "Item two", "Item three"]
      .map((item) => `<div style="padding:8px 12px;font-size:13px;color:${H.textSecondary};border-bottom:1px solid ${H.border};">${item}</div>`)
      .join("");
    return box(pad, extraAttrs, cursorStyle, base, "display:flex;flex-direction:column;overflow:hidden;", inner);
  }

  // —— Markdown / Code block ——
  if (nm === "Markdown" || nm === "Code Block") {
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
          `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;border-radius:5px;background:${p === "1" ? H.accent : H.surfaceSubtle};color:${p === "1" ? "#fff" : H.textSecondary};border:1px solid ${p === "1" ? H.accent : H.border};">${p}</div>`
      )
      .join("");
    return box(pad, extraAttrs, cursorStyle, `${styleStr};background:transparent;border:none`, "display:flex;align-items:center;justify-content:center;gap:4px;", inner);
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

  // —— Notification-style toast row (fallback label) ——
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

  return null;
}
