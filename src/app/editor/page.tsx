"use client";

import { EditorShell } from "@/components/editor-v2/EditorShell";
import { useEditorStore } from "@/lib/editor/store";
import "./editor.css";

export default function EditorPage() {
  const theme = useEditorStore((s) => s.theme);
  return (
    <div className="editor-page" data-editor-theme={theme}>
      <EditorShell />
    </div>
  );
}
