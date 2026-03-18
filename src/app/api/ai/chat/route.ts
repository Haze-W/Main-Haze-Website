import { NextResponse } from "next/server";
import { coralGenerate } from "@/lib/ai/coral-engine";
import { generateLayoutFromPrompt } from "@/lib/ai/agent/layout-generator";
import { aiLayoutToSceneNodes } from "@/lib/ai/schema/adapter";
import { chatFromOllama } from "@/lib/ai/ollama";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, nodes, projectName, mode, images, style } = body as {
      messages: { role: string; content: string }[];
      nodes: unknown[];
      projectName: string;
      mode: "ui" | "backend" | "agent" | "fix" | "plan" | "ask" | null;
      images?: { dataUrl: string }[];
      style?: "light" | "dark";
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }

    const prompt = lastUserMessage.content?.trim() || "";

    // Ask mode — Coral 1.0 (Ollama) Q&A
    if (mode === "ask" && prompt) {
      try {
        const content = await chatFromOllama(
          [
            {
              role: "system",
              content: "You are a helpful assistant for the Haze design tool (Figma-style editor for building desktop apps with Tauri). Answer questions about UI/UX, layouts, Tauri, React, and app design. Be concise and practical.",
            },
            { role: "user", content: prompt },
          ],
          { temperature: 0.6 }
        );
        if (content) {
          return NextResponse.json({ action: "ANSWER", text: content });
        }
      } catch (err) {
        console.error("Ask mode error:", err);
      }
    }

    // Plan mode — Coral 1.0 (Ollama) step-by-step plans
    if (mode === "plan" && prompt) {
      try {
        const content = await chatFromOllama(
          [
            {
              role: "system",
              content: "You are a UI/UX planning assistant. Create clear, numbered step-by-step plans. Format with **bold** for step titles. Keep plans concise (5-10 steps). End with a brief 'Ready to generate?' if the plan is for UI.",
            },
            { role: "user", content: `Create a step-by-step plan for: ${prompt}` },
          ],
          { temperature: 0.5 }
        );
        if (content) {
          return NextResponse.json({ action: "ANSWER", text: content });
        }
      } catch (err) {
        console.error("Plan mode error:", err);
      }
    }

    // UI mode — Coral 1.0 (Ollama) layout generator
    if (mode === "ui" && (prompt || (images && images.length > 0))) {
      const imageUrls = images?.map((i) => i.dataUrl).filter(Boolean) ?? [];
      try {
        const layout = await generateLayoutFromPrompt(prompt || "Create a layout using the attached image(s).", {
          model: "llama3",
          style: style ?? "dark",
          images: imageUrls.length > 0 ? imageUrls : undefined,
        });
        const sceneNodes = aiLayoutToSceneNodes(layout);
        return NextResponse.json({
          action: "GENERATE_UI",
          text: "Generated UI based on your request. Review and adjust as needed.",
          nodes: sceneNodes,
        });
      } catch (err) {
        console.error("Layout generation error:", err);
        // Fall through to Coral on error
      }
    }

    const result = coralGenerate({
      prompt: prompt || "(describe what you want)",
      mode,
      nodes: (nodes ?? []) as Parameters<typeof coralGenerate>[0]["nodes"],
      projectName: projectName ?? "Untitled",
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

