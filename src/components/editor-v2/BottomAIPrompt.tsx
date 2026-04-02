"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronDown, Mic, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { useToast } from "@/components/Toast";
import type { SceneNode } from "@/lib/editor/types";
import { getCapabilities } from "@/lib/editor/collaboration";
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
  const collabRole = useEditorStore((s) => s.collabRole);
  const canAi = getCapabilities(collabRole).canUseAiBuild;

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
    if (!getCapabilities(useEditorStore.getState().collabRole).canUseAiBuild) {
      show("You can’t run AI build with view-only access to this project.", "info");
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("haze-open-chat"));
      // The AI Panel intercepts this to execute the prompt via Coral 1.0 logic
      window.dispatchEvent(new CustomEvent("haze-set-ai-input", { detail: { text, mode: "ui", submit: true } }));
    }
    setPrompt("");
  }, [prompt, loading, show]);

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
          placeholder={
            canAi ? "What would you like to build?" : "View-only — AI build is disabled for your role."
          }
          value={prompt}
          onFocus={() => {
            if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("haze-open-chat"));
          }}
          onChange={(e) => {
            const v = e.target.value;
            setPrompt(v);
          }}
          onKeyDown={onKeyDown}
          rows={1}
          autoComplete="off"
          readOnly={!canAi}
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
                  <span className={styles.dropdownDot} />
                  Coral 1.0
                </button>
                <div className={`${styles.dropdownItem} ${styles.dropdownItemDisabled}`}>
                  Hybrid Pro
                  <span className={styles.comingSoonBadge}>Coming Soon</span>
                </div>
                <div className={`${styles.dropdownItem} ${styles.dropdownItemDisabled}`}>
                  Opal
                  <span className={styles.comingSoonBadge}>Coming Soon</span>
                </div>
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
          disabled={loading || !prompt.trim() || !canAi}
          title="Send"
        >
          <ChevronRight size={18} style={{ transform: "rotate(-90deg)" }} />
        </button>
      </div>
    </div>
  );
}
