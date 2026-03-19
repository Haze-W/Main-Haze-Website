/**
 * AI UI Generation System
 * @module ai
 */

export * from "./schema/ui-schema";
export { aiLayoutToSceneNodes, sceneNodesToAILayout } from "./schema/adapter";
export { parsePrompt } from "./agent/prompt-parser";
export { generateLayoutFromPrompt } from "./agent/layout-generator";
export { extractLayoutFromScreenshot } from "./agent/screenshot-extractor";
export { generateThemeFromPrompt } from "./agent/theme-generator";
export type { DesignTheme } from "./agent/theme-generator";
export { validateAndFixFrame } from "./agent/rules-engine";
