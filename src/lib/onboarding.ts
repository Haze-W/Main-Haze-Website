export const RUNTIME_OPTIONS = ["tauri", "electron", "lua", "imgui"] as const;
export const LANGUAGE_OPTIONS = ["typescript", "javascript", "python", "rust", "lua"] as const;

export type RuntimeOption = (typeof RUNTIME_OPTIONS)[number];
export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

export interface OnboardingPreferences {
  onboardingCompleted: boolean;
  preferredRuntime: RuntimeOption | null;
  preferredLanguage: LanguageOption | null;
}

export function isRuntimeOption(value: unknown): value is RuntimeOption {
  return typeof value === "string" && RUNTIME_OPTIONS.includes(value as RuntimeOption);
}

export function isLanguageOption(value: unknown): value is LanguageOption {
  return typeof value === "string" && LANGUAGE_OPTIONS.includes(value as LanguageOption);
}
