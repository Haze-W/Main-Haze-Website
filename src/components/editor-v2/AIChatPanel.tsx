"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./AIChatPanel.module.css";

interface AIChatPanelProps {
  nodes: SceneNode[];
  onApplyNodes: (nodes: SceneNode[]) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AIChatPanel({ nodes, onApplyNodes }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, message: text }),
      });
      const data = await res.json();
      if (data.nodes?.length) {
        onApplyNodes(data.nodes);
        setMessages((m) => [...m, { role: "assistant", content: `Applied: ${text}` }]);
      } else if (data.suggestion) {
        setMessages((m) => [...m, { role: "assistant", content: data.suggestion }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.error || "No response" }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Request failed" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <MessageCircle size={14} />
        <span>AI Refine</span>
      </div>
      <p className={styles.hint}>
        Describe changes to apply to your layout. e.g. &quot;Make the sidebar darker&quot;, &quot;Add a footer&quot;
      </p>
      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>No messages yet. Describe the changes you want.</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <Loader2 size={14} className={styles.spinner} />
            Thinking…
          </div>
        )}
      </div>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          placeholder="Describe changes..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
