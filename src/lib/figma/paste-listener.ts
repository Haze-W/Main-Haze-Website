"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/lib/editor/store";
import { isRenderPayload } from "./types";
import { figmaToSceneNodes } from "./converter";

export function useFigmaPasteListener() {
  const router = useRouter();

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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
        data = JSON.parse(text);
      } catch {
        return;
      }

      if (!isRenderPayload(data)) return;

      e.preventDefault();

      let nodes = figmaToSceneNodes(data);
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
