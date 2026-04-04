"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, Mic, ArrowUp } from "lucide-react";
import styles from "./AuthChatPanel.module.css";
import { useToast } from "@/components/Toast";

const MODELS = [
  { id: "Coral 1.0", comingSoon: false },
  { id: "Coral 2.0", comingSoon: true },
  { id: "Opal", comingSoon: true },
] as const;

export function AuthChatPanel() {
  const { show } = useToast();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("Coral 1.0");
  const [modelOpen, setModelOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const id = requestAnimationFrame(() => {
      if (ta.isConnected) {
        ta.style.height = "auto";
        ta.style.height = Math.min(ta.scrollHeight, 96) + "px";
      }
    });
    return () => cancelAnimationFrame(id);
  }, [input]);

  useEffect(() => {
    let mounted = true;
    const handler = (e: MouseEvent) => {
      if (!mounted) return;
      const target = e.target as Node;
      if (modelRef.current && !modelRef.current.contains(target)) {
        setModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      mounted = false;
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.bgImage}
        style={{ backgroundImage: "url(/images/auth-chat-bg.png)" }}
      />
      <div className={styles.bgFallback} aria-hidden />

      <div className={styles.chatArea}>
        <div className={styles.inputBar}>
          <textarea
            id="auth-chat-prompt"
            name="auth_chat_prompt"
            ref={taRef}
            className={styles.textarea}
            placeholder="Describe what you'd like to build..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            autoComplete="off"
          />
          <div className={styles.inputToolbar}>
            <button
              type="button"
              className={styles.addBtn}
              title="Attachments (coming soon)"
              onClick={() => show("Attachments are not available on the sign-in chat yet.", "info")}
            >
              <Plus size={20} strokeWidth={2} />
            </button>
            <div className={styles.toolbarSpacer} />
            <div className={styles.modelWrap} ref={modelRef}>
              <button
                type="button"
                className={styles.modelBtn}
                onClick={() => setModelOpen((v) => !v)}
              >
                {model}
                <ChevronDown size={16} />
              </button>
              {modelOpen && (
                <div className={styles.modelDropdown}>
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={m.comingSoon}
                      className={`${styles.modelOpt} ${m.id === model ? styles.modelOptActive : ""} ${m.comingSoon ? styles.modelOptDisabled : ""}`}
                      onClick={() => {
                        if (!m.comingSoon) {
                          setModel(m.id);
                          setModelOpen(false);
                        }
                      }}
                    >
                      {m.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.divider} aria-hidden />
            <button
              type="button"
              className={styles.micBtn}
              title="Voice input (coming soon)"
              onClick={() => show("Voice input is coming soon.", "info")}
            >
              <Mic size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      <p className={styles.footer}>Try Haze for free</p>
    </div>
  );
}
