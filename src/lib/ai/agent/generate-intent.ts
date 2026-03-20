/**
 * Decide whether the bottom-bar prompt should refine the current canvas
 * vs run a full layout generation (greenfield).
 */

export function isGreenfieldLayoutRequest(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (
    /\b(redo everything|from scratch|replace entire\s+ui|start over|rebuild\s+(all|everything)|brand new\s+(app|ui|layout))\b/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(build|create|generate|design)\s+(a|an|my|the)?\s*(full|complete)?\s*(app|dashboard|landing|website|ui|interface|screen|page|flow|chatbot|portal|tool)\b/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /^make\s+(a|an|my)\s+/i.test(text) &&
    /\b(app|dashboard|landing|chatbot|player|portfolio|store|crm|admin|saas|website|page|ui|tool|portal|interface)\b/i.test(
      text
    )
  ) {
    return true;
  }
  if (/\bi\s+want\s+(a|an|to build|to create)\b/.test(t)) {
    return true;
  }
  return false;
}

/** Heuristic: user is tweaking existing UI (partial / non-destructive intent). */
export function isLikelyLayoutPatch(text: string): boolean {
  const t = text.toLowerCase();
  const patchMakeIt =
    /\b(make it|turn it)\s+(darker|lighter|dark|light|smaller|larger|wider|narrower|blue|red|green|black|white|monochrome|minimal|compact|taller|shorter)\b/i.test(
      text
    );
  return (
    patchMakeIt ||
    /\b(change|update|modify|adjust|tweak|move|resize|remove|delete|fix|improve|recolor)\b/.test(t) ||
    /\b(darker|lighter|smaller|larger|wider|narrower|tighter|looser)\b/.test(t) ||
    /\b(spacing|padding|margin|rounded|radius|border|shadow|glass|blur)\b/.test(t) ||
    /\b(color|palette|theme|typography|font|sidebar|topbar|header|footer|navbar)\b/.test(t) ||
    /\b(dark\s*mode|light\s*mode)\b/.test(t) ||
    /\badd\s+(a|the|another)\s/.test(t) ||
    /\b(switch to|set to)\s+(dark|light)\b/.test(t)
  );
}

export function shouldUseRefineForBottomBar(text: string, hasNodes: boolean): boolean {
  if (!hasNodes || !text.trim()) return false;
  if (isGreenfieldLayoutRequest(text)) return false;
  return isLikelyLayoutPatch(text);
}
