'use client';

import { useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import type { CanvasNode } from '@/lib/types';
import type { SceneNode } from '@/lib/editor/types';

export function AIGeneratePanel() {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { addNode, activeFrameId, frames } = useEditorStore(); // Use addNode instead

  const sceneNodeToCanvasNode = (n: SceneNode): Omit<CanvasNode, "id" | "children"> & { children: CanvasNode[] } => {
    const typeMap: Record<string, CanvasNode["type"]> = {
      FRAME: "container",
      GROUP: "container",
      RECTANGLE: "container",
      CONTAINER: "container",
      PANEL: "panel",
      TOPBAR: "titlebar",
      TEXT: "text",
      BUTTON: "button",
      INPUT: "input",
      IMAGE: "image",
      ICON: "icon",
      LIST: "list",
      CHECKBOX: "checkbox",
      SELECT: "select",
      DIVIDER: "divider",
      SPACER: "spacer",
    };
    const type = typeMap[String(n.type)] ?? "container";
    const props = (n.props ?? {}) as CanvasNode["props"];
    return {
      type,
      props,
      layout: { x: n.x, y: n.y, width: n.width, height: n.height },
      children: (n.children ?? []).map((c) => {
        const cn = sceneNodeToCanvasNode(c);
        return { id: c.id, ...cn } as CanvasNode;
      }),
    };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (data.nodes) {
        // API can return either legacy CanvasNode[] or editor-v2 SceneNode[] (wrapped in a root frame).
        const first = data.nodes?.[0];
        const isLegacy = first && typeof first === "object" && "type" in first && "props" in first && ("layout" in first || Array.isArray(first.children));
        const isScene = first && typeof first === "object" && "name" in first && "x" in first && "width" in first;

        if (isLegacy) {
          (data.nodes as CanvasNode[]).forEach((node) => addNode(node));
        } else if (isScene) {
          const sceneNodes = data.nodes as SceneNode[];
          const root = sceneNodes.length === 1 && sceneNodes[0]?.type === "FRAME" ? sceneNodes[0] : null;
          const toInsert = root ? root.children : sceneNodes;
          toInsert.forEach((sn) => {
            const cn = sceneNodeToCanvasNode(sn);
            addNode({ ...cn, id: sn.id } as unknown as CanvasNode);
          });
        }
        setPrompt('');
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold mb-3">🤖 AI Generate</h3>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your UI...&#10;e.g., 'Modern dashboard with sidebar and 3 stat cards'"
        className="w-full h-24 px-3 py-2 text-sm bg-dark-100 border border-dark-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Generating...' : 'Generate UI'}
      </button>
    </div>
  );
}