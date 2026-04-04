"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import { isRenderPayload } from "./types";
import { figmaToSceneNodes } from "./converter";

function isRenderCopyPayload(data: unknown): data is { _renderCopy: true; nodes: SceneNode[] } {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d._renderCopy !== true || !Array.isArray(d.nodes)) return false;
  return d.nodes.length > 0 && typeof (d.nodes[0] as SceneNode).id === "string";
}

/** Parse clipboard JSON (minified or pretty; trims BOM/whitespace). */
function parseClipboardJson(text: string): unknown {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  return JSON.parse(trimmed);
}

/** Process clipboard text and paste into the scene. Returns true if pasted. */
export async function tryPasteFromClipboard(text: string): Promise<boolean> {
  let data: unknown;
  try {
    data = parseClipboardJson(text);
  } catch {
    return false;
  }

  const store = useEditorStore.getState();

  if (isRenderCopyPayload(data)) {
    store.pasteNodes(data.nodes);
    return true;
  }

  if (!isRenderPayload(data)) return false;

  let payload = data as Parameters<typeof figmaToSceneNodes>[0];
  let nodes = figmaToSceneNodes(payload);

  const pt = store.lastCanvasPoint;
  if (pt && nodes.length > 0) {
    const dx = pt.x - nodes[0].x;
    const dy = pt.y - nodes[0].y;
    nodes = nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }));
  }

  store.pushHistory();
  store.setNodes([...store.nodes, ...nodes]);
  if (nodes.length > 0) store.setSelectedIds(new Set([nodes[0].id]));
  return true;
}

/** Convert clipboard image blob to base64 data URL */
async function blobToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Inject clipboard image into payload when plugin sends image as separate clipboard item */
async function injectClipboardImage<T extends { frame: unknown; assets?: Record<string, unknown> }>(
  data: T,
  clipboardData: DataTransfer
): Promise<T> {
  const items = clipboardData.items;
  if (!items) return data;

  let imageFile: File | null = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type === "image/png" || items[i].type === "image/jpeg") {
      const file = items[i].getAsFile();
      if (file) {
        imageFile = file;
        break;
      }
    }
  }
  if (!imageFile) return data;

  const dataUrl = await blobToDataUrl(imageFile);
  const assets = { ...(data.assets ?? {}) } as Record<string, unknown>;

  const frame = data.frame as { id: string; type: string; children?: unknown[] };
  const findFirstImageOrVectorId = (node: { id: string; type: string; children?: unknown[] }): string | null => {
    if (node.type === "IMAGE" || node.type === "VECTOR") return node.id;
    for (const c of node.children ?? []) {
      const found = findFirstImageOrVectorId(c as { id: string; type: string; children?: unknown[] });
      if (found) return found;
    }
    return null;
  };
  const targetId = findFirstImageOrVectorId(frame);
  if (targetId && !assets[targetId]) {
    assets[targetId] = dataUrl;
  }

  return { ...data, assets } as T;
}

export function useFigmaPasteListener() {
  const router = useRouter();

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;

      let data: unknown;
      try {
        data = parseClipboardJson(text);
      } catch {
        return;
      }

      if (isRenderCopyPayload(data)) {
        e.preventDefault();
        const store = useEditorStore.getState();
        store.pasteNodes(data.nodes);
        if (!window.location.pathname.startsWith("/editor")) router.push("/editor");
        return;
      }

      if (!isRenderPayload(data)) return;

      e.preventDefault();

      let payload = data as Parameters<typeof figmaToSceneNodes>[0];
      if (e.clipboardData) {
        payload = await injectClipboardImage(payload, e.clipboardData);
      }

      let nodes = figmaToSceneNodes(payload);
      const store = useEditorStore.getState();

      const pt = store.lastCanvasPoint;
      if (pt && nodes.length > 0) {
        const dx = pt.x - nodes[0].x;
        const dy = pt.y - nodes[0].y;
        nodes = nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }));
      }

      store.pushHistory();
      store.setNodes([...store.nodes, ...nodes]);

      if (!window.location.pathname.startsWith("/editor")) {
        router.push("/editor");
      }

      if (nodes.length > 0) {
        store.setSelectedIds(new Set([nodes[0].id]));
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [router]);
}
