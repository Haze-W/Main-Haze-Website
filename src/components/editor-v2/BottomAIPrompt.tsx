"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronDown, Mic, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./BottomAIPrompt.module.css";

export function BottomAIPrompt() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  const addNodesToCanvas = useCallback((nodes: SceneNode[]) => {
    const s = useEditorStore.getState();
    const offset = nodes.map((n) => ({ ...n, x: n.x + s.viewport.panX * -1, y: n.y }));
    s.setNodes([...s.nodes, ...offset]);
    s.pushHistory();
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

    setLoading(true);
    setPrompt("");

    try {
      const s = useEditorStore.getState();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          nodes: s.nodes,
          projectName: "Untitled",
          mode: "ui",
          style: "dark",
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(e.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.action === "GENERATE_UI" && data.nodes?.length) {
        addNodesToCanvas(data.nodes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, addNodesToCanvas]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.promptBox}>
        <button type="button" className={styles.actionBtn} title="Add">
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

        <button type="button" className={styles.micBtn} title="Voice input">
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
