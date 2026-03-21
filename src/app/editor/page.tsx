"use client";

import dynamic from "next/dynamic";
import { useEditorStore } from "@/lib/editor/store";
import "./editor.css";

const EditorShell = dynamic(
  () => import("@/components/editor-v2/EditorShell").then((m) => ({ default: m.EditorShell })),
  {
    ssr: false,
    loading: () => (
      <div
        className="editor-page editor-page-loading"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--editor-bg, #0a0a0c)",
          color: "var(--shade-09, #e6edf3)",
          fontSize: 14,
          letterSpacing: "0.02em",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "2px solid rgba(255,255,255,0.12)",
              borderTopColor: "rgba(99,102,241,0.9)",
              borderRadius: "50%",
              margin: "0 auto 16px",
              animation: "editor-spin 0.7s linear infinite",
            }}
          />
          <div style={{ opacity: 0.85 }}>Loading editor…</div>
        </div>
        <style>{`@keyframes editor-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    ),
  }
);

export default function EditorPage() {
  const theme = useEditorStore((s) => s.theme);

  return (
    <div className="editor-page" data-editor-theme={theme}>
      <EditorShell />
    </div>
  );
}
