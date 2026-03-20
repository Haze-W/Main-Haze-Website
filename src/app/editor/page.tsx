"use client";

import { useEffect, useRef } from "react";
import { EditorShell } from "@/components/editor-v2/EditorShell";
import { useEditorStore } from "@/lib/editor/store";
import "./editor.css";

export default function EditorPage() {
  const theme = useEditorStore((s) => s.theme);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // #region agent log
    const el = pageRef.current;
    const pageBox = el?.getBoundingClientRect();
    fetch("http://127.0.0.1:7414/ingest/06c84fbc-4d5d-429d-95c7-09038428f9b6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a51597" },
      body: JSON.stringify({
        sessionId: "a51597",
        runId: "post-fix",
        hypothesisId: "A",
        location: "editor/page.tsx:mount",
        message: "EditorPage mounted + viewport",
        data: {
          innerWidth: typeof window !== "undefined" ? window.innerWidth : null,
          innerHeight: typeof window !== "undefined" ? window.innerHeight : null,
          pageW: pageBox?.width,
          pageH: pageBox?.height,
          below1340:
            typeof window !== "undefined" ? window.innerWidth <= 1340 : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  useEffect(() => {
    // #region agent log
    const onErr = (e: ErrorEvent) => {
      fetch("http://127.0.0.1:7414/ingest/06c84fbc-4d5d-429d-95c7-09038428f9b6", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a51597" },
        body: JSON.stringify({
          sessionId: "a51597",
          runId: "post-fix",
          hypothesisId: "B",
          location: "editor/page.tsx:window.error",
          message: String(e.message || "error"),
          data: { filename: e.filename, lineno: e.lineno, colno: e.colno },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const reason =
        e.reason instanceof Error ? e.reason.message : String(e.reason);
      fetch("http://127.0.0.1:7414/ingest/06c84fbc-4d5d-429d-95c7-09038428f9b6", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a51597" },
        body: JSON.stringify({
          sessionId: "a51597",
          runId: "post-fix",
          hypothesisId: "B",
          location: "editor/page.tsx:unhandledrejection",
          message: reason,
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
    // #endregion
  }, []);

  return (
    <div ref={pageRef} className="editor-page" data-editor-theme={theme}>
      <EditorShell />
    </div>
  );
}
