import { useEditorStore } from "./store";

const TICKER_LINES = [
  "Analyzing your description & screen type…",
  "Choosing structure (navigation, main content, actions)…",
  "Synthesizing layout with AI…",
  "Validating coordinates & hierarchy…",
];

/**
 * Begin on-canvas AI build log + rotating status lines. Returns `stop` to clear the interval.
 */
export function startAiBuildTicker(userPrompt: string): () => void {
  const excerpt =
    userPrompt.length > 70 ? `${userPrompt.slice(0, 67)}…` : userPrompt.trim() || "(empty)";
  useEditorStore.getState().setAiBuild({
    lines: ["AI Builder started", `Request: “${excerpt}”`],
  });
  let i = 0;
  const id = window.setInterval(() => {
    if (i < TICKER_LINES.length) {
      useEditorStore.getState().appendAiBuildLine(TICKER_LINES[i]);
      i += 1;
    }
  }, 550);
  return () => window.clearInterval(id);
}

export function pushAiBuildStatus(line: string) {
  useEditorStore.getState().appendAiBuildLine(line);
}

export function endAiBuildTicker(stopInterval: () => void, holdVisibleMs = 2200) {
  stopInterval();
  window.setTimeout(() => useEditorStore.getState().clearAiBuild(), holdVisibleMs);
}
