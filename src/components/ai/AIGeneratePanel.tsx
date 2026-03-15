'use client';

import { useState } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import type { CanvasNode } from '@/lib/types';

export function AIGeneratePanel() {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { addNode, activeFrameId, frames } = useEditorStore(); // Use addNode instead

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
        // Add nodes one by one using addNode
        data.nodes.forEach((node: CanvasNode) => {
          addNode(node);
        });
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