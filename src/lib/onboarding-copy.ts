import type { WizardOption } from "@/components/onboarding/OnboardingWizard";

export const RUNTIME_WIZARD_OPTIONS: WizardOption[] = [
  {
    value: "tauri",
    title: "Tauri",
    description: "Lean desktop runtime powered by Rust + web UI.",
  },
  {
    value: "electron",
    title: "Electron",
    description: "Node-based desktop runtime with broad ecosystem support.",
  },
  {
    value: "lua",
    title: "Lua",
    description: "Script-first workflow optimized for lightweight logic layers.",
  },
  {
    value: "imgui",
    title: "ImGui",
    description: "Immediate-mode UI style for fast tooling and utility apps.",
  },
];

export const LANGUAGE_WIZARD_OPTIONS: WizardOption[] = [
  {
    value: "typescript",
    title: "TypeScript",
    description: "Strongly typed default for modern web and desktop UI code.",
  },
  {
    value: "javascript",
    title: "JavaScript",
    description: "Flexible and quick for rapid prototyping.",
  },
  {
    value: "python",
    title: "Python",
    description: "Great fit for AI and automation workflows.",
  },
  {
    value: "rust",
    title: "Rust",
    description: "Systems-focused performance and memory safety.",
  },
  {
    value: "lua",
    title: "Lua",
    description: "Lightweight scripting for game and embedded workflows.",
  },
];
