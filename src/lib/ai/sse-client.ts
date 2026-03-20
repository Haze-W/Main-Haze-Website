/**
 * Browser-side parser for normalized chat SSE from /api/ai/chat-completions and /api/ai/chat.
 * Events: `data: {"content":"...","reasoning":"..."}` and `data: {"done":true}` or `data: {"error":"..."}`.
 */

export async function consumeNormalizedChatSSE(
  body: ReadableStream<Uint8Array> | null,
  onDelta: (d: { content: string; reasoning: string }) => void
): Promise<{ error?: string }> {
  if (!body) return { error: "No response body" };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      try {
        const j = JSON.parse(data) as {
          content?: string;
          reasoning?: string;
          done?: boolean;
          error?: string;
        };
        if (j.error) return { error: j.error };
        if (j.done) return {};
        if (j.content || j.reasoning) {
          onDelta({ content: j.content ?? "", reasoning: j.reasoning ?? "" });
        }
      } catch {
        // skip malformed lines
      }
    }
  }
  return {};
}
