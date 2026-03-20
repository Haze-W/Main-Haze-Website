"use client";

import { Suspense } from "react";
import { EditorShell } from "@/components/editor-v2/EditorShell";
import { useEditorStore } from "@/lib/editor/store";
import "./editor.css";

export default function EditorPage() {
  const theme = useEditorStore((s) => s.theme);
  return (
    <div className="editor-page" data-editor-theme={theme}>
      <Suspense fallback={<div className="editor-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Loading editor...</div>}>
        <EditorShell />
      </Suspense>
    </div>
  );
}
