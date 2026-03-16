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
  ChevronDown,
  Clock,
  Copy,
  Check,
  Layers,
  Cpu,
  MessageCircle,
  Wrench,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ImagePlus,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./AIPanel.module.css";

type SlashMode = "ui" | "backend" | "agent" | "fix" | null;

interface AttachedImage {
  id: string;
  dataUrl: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  { mode: "ui" as SlashMode, cmd: "/ui", icon: Layers, desc: "Generate UI layouts" },
  { mode: "backend" as SlashMode, cmd: "/backend", icon: Cpu, desc: "Tauri backend code" },
  { mode: "agent" as SlashMode, cmd: "/agent", icon: MessageCircle, desc: "Ask questions" },
  { mode: "fix" as SlashMode, cmd: "/fix", icon: Wrench, desc: "Fix issues" },
];

const AGENTS = [
  { id: "coral-1", name: "Coral 1.0", active: true },
  { id: "coral-2", name: "Coral 2.0", active: false },
  { id: "coral-vision", name: "Coral Vision", active: false },
];

const CHIPS: { mode: SlashMode; prompts: string[] }[] = [
  { mode: "ui", prompts: ["Chatbot app with sidebar and settings", "Build a settings page", "Create a login screen"] },
  { mode: "backend", prompts: ["System info backend", "File read/write commands"] },
  { mode: "agent", prompts: ["Window events?", "Tauri permissions"] },
  { mode: "fix", prompts: ["Make the chat textbox work", "Fix canvas layout", "Debug Rust command"] },
];

const MODE_LABELS: Record<string, string> = {
  ui: "/ui", backend: "/backend", agent: "/agent", fix: "/fix",
};

function mdToHtml(text: string): string {
  return text
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
  const [agent, setAgent] = useState("coral-1");
  const [showAgents, setShowAgents] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);

  const threadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo(0, threadRef.current.scrollHeight);
  }, [messages, loading]);

  useEffect(() => {
    if (!showAgents) return;
    const h = (e: MouseEvent) => {
      if (agentRef.current && !agentRef.current.contains(e.target as Node)) setShowAgents(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showAgents]);

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

  const send = useCallback(async (text: string, m: SlashMode) => {
    if (!text.trim() && attachedImages.length === 0) return;
    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      content: text.trim() || "(image attached)",
      images: attachedImages.length > 0 ? [...attachedImages] : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedImages([]);
    setLoading(true);

    const lid = nanoid();
    setMessages((prev) => [...prev, { id: lid, role: "assistant", content: "", loading: true }]);

    try {
      const s = useEditorStore.getState();
      const hist = messages.filter((x) => !x.loading && !x.error).map((x) => ({ role: x.role, content: x.content }));
      hist.push({ role: "user", content: text.trim() });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: hist, nodes: s.nodes, projectName: "Untitled", mode: m }),
      });

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
      setMessages((prev) => prev.map((x) => x.id === lid ? {
        id: lid, role: "assistant" as const, content: err instanceof Error ? err.message : "Error", error: true,
      } : x));
    } finally {
      setLoading(false);
    }
  }, [messages, addNodesToCanvas, applyFixes, attachedImages]);

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

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (filtered[slashIdx]) pickSlash(filtered[slashIdx]); return; }
      if (e.key === "Escape") { e.preventDefault(); setShowSlash(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!loading && (input.trim() || attachedImages.length > 0)) send(input, mode); }
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
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 72) + "px"; }
  }, [input]);

  const renderMsg = (msg: Message) => {
    if (msg.loading) return <div className={styles.loadingDots}><div className={styles.loadDot} /><div className={styles.loadDot} /><div className={styles.loadDot} /></div>;

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
        <button className={styles.retryBtn} onClick={() => {
          const last = [...messages].reverse().find((x) => x.role === "user");
          if (last) { setMessages((p) => p.filter((x) => x.id !== msg.id)); send(last.content, mode); }
        }}>
          <RotateCcw size={10} /> Retry
        </button>
      </div>
    );

    return (
      <div className={styles.assistantCard}>
        {msg.content && <p dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }} />}

        {msg.action === "GENERATE_UI" && msg.addedToCanvas && (
          <div className={`${styles.badge} ${styles.badgeOk}`}><Check size={10} /> Added to Canvas</div>
        )}
        {msg.action === "GENERATE_UI" && !msg.addedToCanvas && msg.nodes?.length && (
          <button className={styles.actionBtn} onClick={() => {
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
              <button className={styles.copyBtn} onClick={() => copy(msg.rust!, `r-${msg.id}`)}>
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
              <button className={styles.copyBtn} onClick={() => copy(msg.js!, `j-${msg.id}`)}>
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
          <button className={styles.actionBtn} onClick={() => useEditorStore.getState().setMode("code")}>
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
        <div className={styles.agentWrap} ref={agentRef}>
          <button className={styles.agentBtn} onClick={() => setShowAgents((v) => !v)}>
            <Sparkles size={12} />
            <span>{AGENTS.find((a) => a.id === agent)?.name}</span>
            <ChevronDown size={10} />
          </button>
          {showAgents && (
            <div className={styles.agentDrop}>
              {AGENTS.map((a) => (
                <button key={a.id} className={`${styles.agentOpt} ${a.id === agent ? styles.agentOptActive : ""}`}
                  disabled={!a.active} onClick={() => { if (a.active) { setAgent(a.id); setShowAgents(false); } }}>
                  {a.active ? <Sparkles size={11} /> : <Clock size={11} />}
                  <span>{a.name}</span>
                  {!a.active && <span className={styles.agentSoon}>Coming soon</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className={styles.clearBtn} onClick={() => { setMessages([]); setMode(null); }} title="Clear chat">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Thread or empty */}
      {messages.length > 0 ? (
        <div className={styles.thread} ref={threadRef}>
          {messages.map((msg) => <div key={msg.id}>{renderMsg(msg)}</div>)}
        </div>
      ) : (
        <div className={styles.empty}>
          <Sparkles size={28} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Coral AI</p>
          <p className={styles.emptyDesc}>Type a message or use / commands.</p>
          <div className={styles.chipGroups}>
            {CHIPS.map((g) => (
              <div key={g.mode} className={styles.chipGroup}>
                <span className={styles.chipLabel}>{SLASH_COMMANDS.find((c) => c.mode === g.mode)?.cmd}</span>
                <div className={styles.chips}>
                  {g.prompts.map((p) => (
                    <button key={p} className={styles.chip} onClick={() => { setMode(g.mode); setInput(p); taRef.current?.focus(); }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={styles.inputArea}>
        {showSlash && filtered.length > 0 && (
          <div className={styles.slashWrap} id="ai-slash">
            <div className={styles.slashMenu}>
              {filtered.map((c, i) => (
                <button key={c.cmd} className={`${styles.slashItem} ${i === slashIdx ? styles.slashActive : ""}`}
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
            <Sparkles size={9} />
            <span>{MODE_LABELS[mode]}</span>
            <button className={styles.pillClear} onClick={() => setMode(null)}>×</button>
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
          <button type="button" className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} title="Upload image (or paste)">
            <ImagePlus size={16} />
          </button>
          <textarea ref={taRef} className={styles.textarea}
            placeholder={mode ? `Message (${mode})...` : "Message, paste image, or type /..."}
            value={input} onChange={(e) => onInput(e.target.value)} onKeyDown={onKey} onPaste={onPaste} rows={1} />
          <button className={styles.sendBtn} disabled={loading || (!input.trim() && attachedImages.length === 0)} onClick={() => send(input, mode)}>
            <ArrowUp size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
