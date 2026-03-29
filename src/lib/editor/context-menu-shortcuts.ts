/**
 * Labels for context menu shortcut column — match the user's OS (macOS vs Windows/Linux).
 */

export function isMacLikeOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  return /Mac/i.test(platform) && !/iPhone|iPad|iPod/i.test(ua);
}

export interface ContextMenuShortcutLabels {
  copy: string;
  paste: string;
  duplicate: string;
  bringFront: string;
  sendBack: string;
  group: string;
  ungroup: string;
  flipH: string;
  flipV: string;
  delete: string;
}

export function getContextMenuShortcutLabels(): ContextMenuShortcutLabels {
  if (isMacLikeOS()) {
    return {
      copy: "⌘C",
      paste: "⌘V",
      duplicate: "⌘D",
      bringFront: "]",
      sendBack: "[",
      group: "⌘G",
      ungroup: "⌘⇧G",
      flipH: "⇧H",
      flipV: "⇧V",
      delete: "⌫",
    };
  }
  return {
    copy: "Ctrl+C",
    paste: "Ctrl+V",
    duplicate: "Ctrl+D",
    bringFront: "]",
    sendBack: "[",
    group: "Ctrl+G",
    ungroup: "Ctrl+Shift+G",
    flipH: "Shift+H",
    flipV: "Shift+V",
    delete: "Del",
  };
}
