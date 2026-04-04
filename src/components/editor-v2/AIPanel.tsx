"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import {
  ArrowUp,
  Trash2,
  Copy,
  Check,
  Layers,
  MessageCircle,
  ExternalLink,
  ImagePlus,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import { consumeNormalizedChatSSE } from "@/lib/ai/sse-client";
import styles from "./AIPanel.module.css";

type SlashMode = "ui" | "agent" | null;

interface AttachedImage {
  id: string;
  dataUrl: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  images?: AttachedImage[];
  action?: "GENERATE_UI" | "GENERATE_CODE" | "ANSWER" | "FIX";
  nodes?: SceneNode[];
  rust?: string;
  js?: string;
  deps?: string[];
  fixes?: { nodeId: string; changes: Partial<SceneNode> }[];
  error?: boolean;
  loading?: boolean;
  addedToCanvas?: boolean;
}

const SLASH_COMMANDS = [
  { mode: "ui" as SlashMode, cmd: "/ui", icon: Layers, desc: "Generate UI layout on the canvas" },
  { mode: "agent" as SlashMode, cmd: "/agent", icon: MessageCircle, desc: "Talk with Coral 1.0 about code or design" },
];

const MODE_LABELS: Record<string, string> = {
  ui: "/ui",
  agent: "/agent",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mdToHtml(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}

export function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<SlashMode>(null);
  const [loading, setLoading] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIdx, setSlashIdx] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  
  // Hardcode theme to match EditorShell light/dark eventually without manual toggle
  const theme = "dark"; 

  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo(0, threadRef.current.scrollHeight);
  }, [messages, loading]);

  useEffect(() => {
    const onFocus = () => taRef.current?.focus();
    window.addEventListener("haze-focus-ai", onFocus);
    return () => window.removeEventListener("haze-focus-ai", onFocus);
  }, []);

  useEffect(() => {
    if (!showSlash) return;
    const h = (e: MouseEvent) => {
      const el = document.getElementById("ai-slash");
      if (el && !el.contains(e.target as Node)) setShowSlash(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSlash]);

  const filtered = SLASH_COMMANDS.filter((c) => c.cmd.startsWith("/" + slashFilter));

  const addNodesToCanvas = useCallback((nodes: SceneNode[]) => {
    const s = useEditorStore.getState();
    const offset = nodes.map((n) => ({ ...n, x: n.x + s.viewport.panX * -1, y: n.y }));
    s.setNodes([...s.nodes, ...offset]);
    s.pushHistory();
  }, []);

  const applyFixes = useCallback((fixes: { nodeId: string; changes: Partial<SceneNode> }[]) => {
    const s = useEditorStore.getState();
    fixes.forEach(({ nodeId, changes }) => s.updateNode(nodeId, changes));
    s.pushHistory();
  }, []);

  const addImageFromFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAttachedImages((prev) => [...prev, { id: nanoid(), dataUrl }]);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeAttachedImage = useCallback((id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Handlers moved below to avoid hoisting issues

  const send = useCallback(async (text: string, m: SlashMode) => {
    if (!text.trim() && attachedImages.length === 0) return;
    const imagesToSend = attachedImages.length > 0 ? [...attachedImages] : undefined;
    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      content: text.trim() || "(image attached)",
      images: imagesToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedImages([]);
    setLoading(true);
    setThinkingSteps([]);

    const lid = nanoid();
    setMessages((prev) => [...prev, { id: lid, role: "assistant", content: "", loading: true }]);

    const thinkingUiSteps = [
      "Generating Response...",
      "Analyzing your request...",
      "Designing layout structure...",
      "Generating UI JSON...",
      "Applying layout rules...",
    ];
    const thinkingChatSteps = [
      "Generating Response...",
      "Thinking through your question...",
      "Writing the answer...",
    ];

    if (m === "ui") {
      setThinkingSteps([thinkingUiSteps[0]]);
      const timers: ReturnType<typeof setTimeout>[] = [];
      thinkingUiSteps.slice(1).forEach((step, i) => {
        timers.push(setTimeout(() => setThinkingSteps((s) => (s.length ? [...s, step] : s)), (i + 1) * 90));
      });
      const clearThinking = () => {
        timers.forEach(clearTimeout);
        setThinkingSteps([]);
      };
      try {
        const s = useEditorStore.getState();
        const hist = messages.filter((x) => !x.loading && !x.error).map((x) => ({ role: x.role, content: x.content }));
        hist.push({ role: "user", content: text.trim() });

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: hist,
            nodes: s.nodes,
            projectName: "Untitled",
            mode: "ui",
            images: imagesToSend?.map((i) => ({ dataUrl: i.dataUrl })),
            style: theme,
          }),
        });

        clearThinking();

        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(e.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        let added = false;
        if (data.action === "GENERATE_UI" && data.nodes?.length) { addNodesToCanvas(data.nodes); added = true; }
        if (data.action === "FIX" && data.fixes?.length) applyFixes(data.fixes);

        setMessages((prev) => prev.map((x) => x.id === lid ? {
          id: nanoid(), role: "assistant" as const, content: data.text || "",
          action: data.action, nodes: data.nodes, rust: data.rust, js: data.js,
          deps: data.deps, fixes: data.fixes, addedToCanvas: added,
        } : x));
      } catch (err) {
        clearThinking();
        setMessages((prev) => prev.map((x) => x.id === lid ? {
          id: lid, role: "assistant" as const, content: err instanceof Error ? err.message : "Error", error: true,
        } : x));
      } finally {
        setLoading(false);
      }
    } else {
      // Default Agent behavior
      setThinkingSteps([thinkingChatSteps[0]]);
      const timers: ReturnType<typeof setTimeout>[] = [];
      thinkingChatSteps.slice(1).forEach((step, i) => {
        timers.push(setTimeout(() => setThinkingSteps((s) => (s.length ? [...s, step] : s)), (i + 1) * 90));
      });
      const clearThinking = () => {
        timers.forEach(clearTimeout);
        setThinkingSteps([]);
      };

      try {
        const s = useEditorStore.getState();
        const hist = messages.filter((x) => !x.loading && !x.error).map((x) => ({ role: x.role, content: x.content }));
        hist.push({ role: "user", content: text.trim() });

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: hist,
            nodes: s.nodes,
            projectName: "Untitled",
            mode: "agent",
            stream: true,
          }),
        });

        const isSse = res.ok && (res.headers.get("content-type") ?? "").includes("text/event-stream");

        if (isSse && res.body) {
          let content = "";
          let reasoning = "";
          const sseErr = await consumeNormalizedChatSSE(res.body, (d) => {
            content += d.content;
            reasoning += d.reasoning;
            setMessages((prev) =>
              prev.map((x) =>
                x.id === lid
                  ? { ...x, content, reasoning, loading: true }
                  : x
              )
            );
          });
          clearThinking();
          if (sseErr.error) throw new Error(sseErr.error);
          setMessages((prev) =>
            prev.map((x) =>
              x.id === lid
                ? {
                    id: nanoid(),
                    role: "assistant" as const,
                    content,
                    reasoning: reasoning || undefined,
                    action: "ANSWER",
                    loading: false,
                  }
                : x
            )
          );
        } else {
          if (!res.ok) {
            clearThinking();
            const e = await res.json().catch(() => ({ error: "Request failed" }));
            throw new Error((e as { error?: string }).error || `HTTP ${res.status}`);
          }
          clearThinking();
          const data = await res.json();
          let added = false;
          if (data.action === "GENERATE_UI" && data.nodes?.length) { addNodesToCanvas(data.nodes); added = true; }
          if (data.action === "FIX" && data.fixes?.length) applyFixes(data.fixes);

          setMessages((prev) => prev.map((x) => x.id === lid ? {
            id: nanoid(), role: "assistant" as const, content: data.text || "",
            action: data.action, nodes: data.nodes, rust: data.rust, js: data.js,
            deps: data.deps, fixes: data.fixes, addedToCanvas: added,
          } : x));
        }
      } catch (err) {
        clearThinking();
        setMessages((prev) => prev.map((x) => x.id === lid ? {
          id: lid, role: "assistant" as const, content: err instanceof Error ? err.message : "Error", error: true,
        } : x));
      } finally {
        setLoading(false);
      }
    }
  }, [messages, addNodesToCanvas, applyFixes, attachedImages, theme]);

  const onInput = (val: string) => {
    setInput(val);
    if (val === "/") { setShowSlash(true); setSlashFilter(""); setSlashIdx(0); }
    else if (val.startsWith("/") && !val.includes(" ")) { setShowSlash(true); setSlashFilter(val.slice(1)); setSlashIdx(0); }
    else setShowSlash(false);
  };

  const pickSlash = (c: typeof SLASH_COMMANDS[0]) => {
    setMode(c.mode);
    setInput("");
    setShowSlash(false);
    taRef.current?.focus();
  };

  // Update input text externally (e.g. from BottomAIPrompt)
  useEffect(() => {
    const h = (e: CustomEvent<{ text: string, mode?: SlashMode, submit?: boolean }>) => {
      const txt = e.detail.text;
      const m = e.detail.mode;
      if (txt) setInput(txt);
      if (m !== undefined) setMode(m);
      
      // Let states update before sending if submit is true
      if (e.detail.submit && txt) {
        // Need to use the values from event as state update is async
        setTimeout(() => send(txt, m ?? null), 10);
      } else {
        taRef.current?.focus();
      }
    };
    window.addEventListener("haze-set-ai-input" as any, h);
    return () => window.removeEventListener("haze-set-ai-input" as any, h);
  }, [send]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { 
        e.preventDefault(); 
        if (filtered[slashIdx]) pickSlash(filtered[slashIdx]); 
        return; 
      }
      if (e.key === "Escape") { e.preventDefault(); setShowSlash(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      if (!loading && (input.trim() || attachedImages.length > 0)) {
        send(input, mode); 
      }
    }
  };

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) addImageFromFile(file);
        break;
      }
    }
  }, [addImageFromFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) addImageFromFile(files[i]);
    e.target.value = "";
  }, [addImageFromFile]);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  };

  useEffect(() => {
    const ta = taRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  }, [input]);

  const renderMsg = (msg: Message) => {
    if (msg.loading) return (
      <div className={styles.loadingCard}>
        <div className={styles.loadingDots}><div className={styles.loadDot} /><div className={styles.loadDot} /><div className={styles.loadDot} /></div>
        {thinkingSteps.length > 0 && (
          <ul className={styles.thinkingSteps}>
            {thinkingSteps.map((step, i) => (
              <li key={i} className={styles.thinkingStep}>{step}</li>
            ))}
          </ul>
        )}
        {msg.reasoning ? (
          <details open className={styles.reasoningBlock}>
            <summary className={styles.reasoningSummary}>Thinking</summary>
            <pre className={styles.reasoningPre}>{msg.reasoning}</pre>
          </details>
        ) : null}
        {msg.content ? (
          <div
            className={styles.streamingPreview}
            dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }}
          />
        ) : null}
      </div>
    );

    if (msg.role === "user") {
      return (
        <div className={styles.userBubble}>
          {msg.images && msg.images.length > 0 && (
            <div className={styles.msgImages}>
              {msg.images.map((img) => (
                <img key={img.id} src={img.dataUrl} alt="Attached" className={styles.msgImage} />
              ))}
            </div>
          )}
          {msg.content && <span>{msg.content}</span>}
        </div>
      );
    }

    if (msg.error) return (
      <div className={`${styles.assistantCard} ${styles.errorCard}`}>
        <p>{msg.content}</p>
        {/* We can provide a basic retry button without full logic here for simplicity */}
      </div>
    );

    return (
      <div className={styles.assistantCard}>
        {msg.reasoning && (
          <details className={styles.reasoningBlock}>
            <summary className={styles.reasoningSummary}>Reasoning</summary>
            <pre className={styles.reasoningPre}>{msg.reasoning}</pre>
          </details>
        )}
        {msg.content && <p dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }} />}

        {msg.action === "GENERATE_UI" && msg.addedToCanvas && (
          <div className={`${styles.badge} ${styles.badgeOk}`}><Check size={10} /> Added to Canvas</div>
        )}
        {msg.action === "GENERATE_UI" && !msg.addedToCanvas && msg.nodes?.length && (
          <button type="button" className={styles.actionBtn} onClick={() => {
            addNodesToCanvas(msg.nodes!);
            setMessages((p) => p.map((x) => x.id === msg.id ? { ...x, addedToCanvas: true } : x));
          }}><Layers size={11} /> Add to Canvas</button>
        )}

        {msg.action === "FIX" && msg.fixes?.length && (
          <div className={`${styles.badge} ${styles.badgeFix}`}><Check size={10} /> Canvas Updated</div>
        )}

        {msg.rust && (
          <div className={styles.codeWrap}>
            <div className={styles.codeLabelRow}>
              <span className={styles.codeLang}>Rust</span>
              <button type="button" className={styles.copyBtn} onClick={() => copy(msg.rust!, `r-${msg.id}`)}>
                {copied === `r-${msg.id}` ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
              </button>
            </div>
            <pre className={styles.codeBlock}>{msg.rust}</pre>
          </div>
        )}

        {msg.js && (
          <div className={styles.codeWrap}>
            <div className={styles.codeLabelRow}>
              <span className={styles.codeLang}>TypeScript</span>
              <button type="button" className={styles.copyBtn} onClick={() => copy(msg.js!, `j-${msg.id}`)}>
                {copied === `j-${msg.id}` ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
              </button>
            </div>
            <pre className={styles.codeBlock}>{msg.js}</pre>
          </div>
        )}

        {msg.deps && msg.deps.length > 0 && (
          <div className={styles.depsWrap}>
            <span className={styles.codeLang}>Dependencies</span>
            <ul className={styles.depsList}>{msg.deps.map((d, i) => <li key={i}>{d}</li>)}</ul>
          </div>
        )}

        {(msg.action === "GENERATE_CODE" || (msg.action === "FIX" && (msg.rust || msg.js))) && (
          <button type="button" className={styles.actionBtn} onClick={() => useEditorStore.getState().setMode("code")}>
            <ExternalLink size={11} /> View in Code Panel
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.agentTitle}>Coral 1.0</div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.clearBtn} onClick={() => { setMessages([]); setMode(null); }} title="Clear chat">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Thread or empty */}
      {messages.length > 0 ? (
        <div className={styles.thread} ref={threadRef}>
          {messages.map((msg) => <div key={msg.id}>{renderMsg(msg)}</div>)}
        </div>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Start a conversation</p>
          <p className={styles.emptyDesc}>
            Type anything below or use /ui to generate layouts.
          </p>
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        {showSlash && filtered.length > 0 && (
          <div className={styles.slashWrap} id="ai-slash">
            <div className={styles.slashMenu}>
              {filtered.map((c, i) => (
                <button type="button" key={c.cmd} className={`${styles.slashItem} ${i === slashIdx ? styles.slashActive : ""}`}
                  onClick={() => pickSlash(c)} onMouseEnter={() => setSlashIdx(i)}>
                  <div className={styles.slashIcon}><c.icon size={12} /></div>
                  <div className={styles.slashText}>
                    <span className={styles.slashCmd}>{c.cmd}</span>
                    <span className={styles.slashDesc}>{c.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode && (
          <div className={styles.modePill}>
            <span>{MODE_LABELS[mode]}</span>
            <button type="button" className={styles.pillClear} onClick={() => setMode(null)}>
              <X size={10} />
            </button>
          </div>
        )}

        {attachedImages.length > 0 && (
          <div className={styles.attachedRow}>
            {attachedImages.map((img) => (
              <div key={img.id} className={styles.attachedThumb}>
                <img src={img.dataUrl} alt="Attached" />
                <button type="button" className={styles.attachedRemove} onClick={() => removeAttachedImage(img.id)} title="Remove">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.inputRow}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className={styles.fileInput}
            onChange={onFileChange}
          />
          <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} title="Attach Image">
            <ImagePlus size={16} />
          </button>
          <textarea 
            ref={taRef} 
            className={styles.textarea}
            placeholder={mode ? `Message (${mode})...` : "Type a message or / for commands..."}
            value={input} 
            onChange={(e) => onInput(e.target.value)} 
            onKeyDown={onKey} 
            onPaste={onPaste} 
            rows={1} 
          />
          <button type="button" className={styles.sendBtn} disabled={loading || (!input.trim() && attachedImages.length === 0)} onClick={() => send(input, mode)}>
            <ArrowUp size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
