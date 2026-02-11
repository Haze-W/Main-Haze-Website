"use client";

import { create } from "zustand";

export type TitleBarStyle = "windows" | "macos";

export interface ExportSettings {
  appName: string;
  titleBarStyle: TitleBarStyle;
  /** Custom icon URL - if set, used for app icon (base64 or URL) */
  customIconUrl?: string;
}

const defaultSettings: ExportSettings = {
  appName: "my-tauri-app",
  titleBarStyle: "windows",
};

export const useExportSettings = create<ExportSettings & {
  setAppName: (name: string) => void;
  setTitleBarStyle: (style: TitleBarStyle) => void;
  setCustomIconUrl: (url?: string) => void;
}>((set) => ({
  ...defaultSettings,
  setAppName: (appName) => set({ appName }),
  setTitleBarStyle: (titleBarStyle) => set({ titleBarStyle }),
  setCustomIconUrl: (customIconUrl) => set({ customIconUrl }),
}));
