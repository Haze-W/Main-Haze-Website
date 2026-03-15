import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AIGeneratePanelProps {
  onGenerate: (nodes: any[]) => void;
}

export function AIGeneratePanel({ onGenerate }: AIGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [examples] = useState([
    'Modern SaaS dashboard with sidebar and KPI cards',
    'Landing page with hero section and feature grid',
    'Analytics dashboard with charts and data table',
    'Settings page with tabs and form inputs',
  ]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await response.json();
      if (data.nodes) {
        onGenerate(data.nodes);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Sparkles size={16} className="text-purple-400" />
        <span>AI Generate</span>
      </div>
      
      <div className="space-y-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Modern SaaS dashboard with sidebar and KPI cards"
          className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3a3a3e] rounded text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
        
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate UI
            </>
          )}
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-gray-500">Examples:</div>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setPrompt(ex)}
            className="block w-full text-left text-xs text-gray-400 hover:text-white truncate"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}