"use client";

import { useState, useCallback } from "react";

interface Props {
  onGenerate: (prompt: string) => void;
  onRefine: (prompt: string) => void;
  hasNodes: boolean;
  layout?: "inline" | "default";
}

export default function BottomAIPrompt({
  onGenerate,
  onRefine,
  hasNodes,
  layout = "default",
}: Props)
const [text, setText] = useState("");
const [loading, setLoading] = useState(false);

const shouldUseRefine = (input: string, hasNodes: boolean) => {
if (hasNodes) return true;


const lower = input.toLowerCase();

if (
  lower.includes("change") ||
  lower.includes("edit") ||
  lower.includes("update") ||
  lower.includes("fix") ||
  lower.includes("make it")
) {
  return true;
}

return false;


};

const send = useCallback(async () => {
const prompt = text.trim();
if (!prompt || loading) return;


setLoading(true);

try {
  if (shouldUseRefine(prompt, hasNodes)) {
    onRefine(prompt);
  } else {
    onGenerate(prompt);
  }

  setText("");
} catch (err) {
  console.error("AI send error:", err);
} finally {
  setLoading(false);
}


}, [text, hasNodes, loading, onGenerate, onRefine]);

if (layout === "inline") {
return ( <div className="bottom-ai-inline">
<textarea
value={text}
onChange={(e) => setText(e.target.value)}
placeholder="Describe what you want to build..."
onKeyDown={(e) => {
if (e.key === "Enter" && !e.shiftKey) {
e.preventDefault();
send();
}
}}
/>

```
  <button onClick={send} disabled={loading}>
    {loading ? "..." : "Send"}
  </button>
</div>
```

);
}

return (

  <div className="w-full border-t border-gray-200 bg-white p-4">
    <div className="flex items-center gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe what you want to build..."
        className="flex-1 resize-none rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-black"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />

```
  <button
    onClick={send}
    disabled={loading}
    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
  >
    {loading ? "..." : "Send"}
  </button>
</div>
```

  </div>
);

}
