"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronDown, Mic, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { useToast } from "@/components/Toast";
import type { SceneNode } from "@/lib/editor/types";
import { endAiBuildTicker, pushAiBuildStatus, startAiBuildTicker } from "@/lib/editor/ai-build-ui";
import { shouldUseRefineForBottomBar } from "@/lib/ai/agent/generate-intent";
import styles from "./BottomAIPrompt.module.css";

type BottomAIPromptProps = {
  /** Use `inline` when nested in a fixed bottom row (e.g. next to AI Chat). Default keeps centered fixed positioning. */
  layout?: "fixed" | "inline";
};

export function BottomAIPrompt({ layout = "fixed" }: BottomAIPromptProps) {
  const { show } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const colorMode = useEditorStore((s) => s.theme);
  const canvasNodes = useEditorStore((s) => s.nodes);

  const applyGeneratedLayout = useCallback((newNodes: SceneNode[]) => {
    const s = useEditorStore.getState();
    s.setNodes(newNodes);
    s.pushHistory();
    s.setMode("preview");
  }, []);

  useEffect(() => {
    const onFocus = () => taRef.current?.focus();
    window.addEventListener("haze-focus-ai", onFocus);
    return () => window.removeEventListener("haze-focus-ai", onFocus);
  }, []);

  useEffect(() => {
    if (!showAgent) return;
    const h = (e: MouseEvent) => {
      if (agentRef.current && !agentRef.current.contains(e.target as Node)) setShowAgent(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showAgent]);

  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 72) + "px";
    }
  }, [prompt]);

  const send = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    const stopTicker = startAiBuildTicker(text);
    setLoading(true);
    setPrompt("");

    try {
      const useRefine = shouldUseRefineForBottomBar(text, canvasNodes.length > 0);

      if (useRefine) {
        pushAiBuildStatus("Refining current canvas (partial update)…");
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, nodes: canvasNodes }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
        }
        if ((data as { nodes?: SceneNode[] }).nodes?.length) {
          pushAiBuildStatus("Applying refined layout…");
          applyGeneratedLayout((data as { nodes: SceneNode[] }).nodes);
          pushAiBuildStatus("Done — changes merged into your UI.");
        } else {
          const hint =
            typeof (data as { suggestion?: string }).suggestion === "string"
              ? (data as { suggestion: string }).suggestion
              : "No changes returned. Try a more specific edit, or say “build a …” for a fresh layout.";
          throw new Error(hint);
        }
      } else {
        pushAiBuildStatus("Generating new layout from your prompt…");
        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            style: colorMode,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
        }

        if ((data as { nodes?: SceneNode[] }).nodes?.length) {
          pushAiBuildStatus("Applying generated UI to the canvas…");
          applyGeneratedLayout((data as { nodes: SceneNode[] }).nodes);
          pushAiBuildStatus("Done — preview is open. Tweak in Design mode if needed.");
        } else {
          throw new Error((data as { error?: string }).error || "No layout was returned");
        }
      }
    } catch (err) {
      console.error(err);
      show(err instanceof Error ? err.message : "Generation failed", "error");
      pushAiBuildStatus(`Error: ${err instanceof Error ? err.message : "failed"}`);
    } finally {
      setLoading(false);
      endAiBuildTicker(stopTicker);
    }
  }, [prompt, loading, applyGeneratedLayout, colorMode, canvasNodes, show]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className={
        layout === "inline" ? `${styles.wrapper} ${styles.wrapperInline}` : styles.wrapper
      }
    >
      <div className={styles.promptBox}>
        <button
          type="button"
          className={styles.actionBtn}
          title="Attachments (coming soon)"
          onClick={() =>
            show("File attachments in the prompt bar are coming soon. Use Assets → Screenshot in the editor.", "info")
          }
        >
          <Plus size={18} strokeWidth={2} />
        </button>

        <textarea
          id="editor-bottom-ai-prompt"
          name="bottom_ai_prompt"
          ref={taRef}
          className={styles.textarea}
          placeholder="What would you like to build?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          autoComplete="off"
          aria-label="What would you like to build"
        />

        <div className={styles.dropdownWrap} ref={agentRef}>
            <button
              type="button"
              className={styles.agentBtn}
              onClick={() => setShowAgent((v) => !v)}
            >
              Coral 1.0
              <ChevronDown size={16} />
            </button>
            {showAgent && (
              <div className={styles.dropdown}>
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${styles.dropdownItemActive}`}
                  onClick={() => setShowAgent(false)}
                >
                  Coral 1.0
                </button>
              </div>
            )}
          </div>

        <button
          type="button"
          className={styles.micBtn}
          title="Voice input (coming soon)"
          onClick={() => show("Voice input is coming soon.", "info")}
        >
          <Mic size={18} strokeWidth={2} />
        </button>

        <button
          type="button"
          className={styles.sendBtn}
          onClick={send}
          disabled={loading || !prompt.trim()}
          title="Send"
        >
          <ChevronRight size={18} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>
    </div>
  );
}
