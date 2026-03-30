/**
 * Shared “cool slate” chrome for library preset containers — editor canvas and preview/export HTML.
 * Keep CSS variables in globals.css (:root) in sync with these literals.
 */
export const HAZE_COMP = {
  surface: "#ffffff",
  surfaceSubtle: "#f8fafc",
  headerBar: "#f1f5f9",
  surfaceNav: "#0f172a",
  surfaceDark: "#0c1222",
  surfaceCode: "#0b1020",
  text: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textOnDark: "#e8eef7",
  textOnDarkMuted: "#94a3b8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  borderOnDark: "rgba(148, 163, 184, 0.28)",
  shadowSm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  shadowMd: "0 8px 24px rgba(15, 23, 42, 0.1)",
  toastShadow: "0 4px 16px rgba(15, 23, 42, 0.12)",
  modalShadow: "0 16px 48px rgba(15, 23, 42, 0.18)",
  accent: "#5e5ce6",
  accentSoftBg: "rgba(94, 92, 230, 0.1)",
  accentSoftBorder: "rgba(94, 92, 230, 0.28)",
  success: "#16a34a",
  inputBg: "#f8fafc",
  kanbanCardBg: "#ffffff",
  heroGradient: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #f1f5f9 100%)",
  playOverlay: "rgba(15, 23, 42, 0.1)",
  playIconBg: "rgba(15, 23, 42, 0.08)",
  progressTrack: "#e2e8f0",
  spinnerTrack: "rgba(15, 23, 42, 0.12)",
} as const;

/** Injected at the top of exported/preview HTML so presets can use var(--haze-comp-*). */
export function buildHazeComponentRootStyle(): string {
  const c = HAZE_COMP;
  return `:root {
  --accent: ${c.accent};
  --fg-primary: ${c.text};
  --fg-secondary: ${c.textSecondary};
  --fg-muted: ${c.textMuted};
  --bg-input: ${c.inputBg};
  --border-default: ${c.border};
  --border-muted: ${c.borderStrong};
  --haze-comp-surface: ${c.surface};
  --haze-comp-surface-subtle: ${c.surfaceSubtle};
  --haze-comp-header-bar: ${c.headerBar};
  --haze-comp-surface-nav: ${c.surfaceNav};
  --haze-comp-surface-dark: ${c.surfaceDark};
  --haze-comp-surface-code: ${c.surfaceCode};
  --haze-comp-text: ${c.text};
  --haze-comp-text-secondary: ${c.textSecondary};
  --haze-comp-text-muted: ${c.textMuted};
  --haze-comp-text-on-dark: ${c.textOnDark};
  --haze-comp-text-on-dark-muted: ${c.textOnDarkMuted};
  --haze-comp-border: ${c.border};
  --haze-comp-border-strong: ${c.borderStrong};
  --haze-comp-border-on-dark: ${c.borderOnDark};
  --haze-comp-shadow-sm: ${c.shadowSm};
  --haze-comp-shadow-md: ${c.shadowMd};
  --haze-comp-toast-shadow: ${c.toastShadow};
  --haze-comp-modal-shadow: ${c.modalShadow};
  --haze-comp-accent: ${c.accent};
  --haze-comp-accent-soft-bg: ${c.accentSoftBg};
  --haze-comp-accent-soft-border: ${c.accentSoftBorder};
  --haze-comp-success: ${c.success};
  --haze-comp-input-bg: ${c.inputBg};
  --haze-comp-kanban-card-bg: ${c.kanbanCardBg};
  --haze-comp-progress-track: ${c.progressTrack};
  --haze-comp-spinner-track: ${c.spinnerTrack};
}
`;
}
