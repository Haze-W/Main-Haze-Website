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

      const nodes = figmaToSceneNodes(data);
      const store = useEditorStore.getState();

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
