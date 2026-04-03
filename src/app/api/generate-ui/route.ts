import { NextRequest, NextResponse } from "next/server";
import { analyzeIntent } from "@/ai/intent";
import { generateLayout } from "@/ai/layout";
import { generateComponents } from "@/ai/components";
import { applyStyle } from "@/ai/style";
import { validateUI, type PipelineStyledData } from "@/ai/schema";
import { mapPipelineToSceneNodes } from "@/ai/map-to-scene";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const intent = await analyzeIntent(prompt);
    if (process.env.NODE_ENV === "development") {
      console.log("Intent:", intent);
    }

    const layout = await generateLayout(intent);
    if (process.env.NODE_ENV === "development") {
      console.log("Layout:", layout);
    }

    const componentData = await generateComponents(layout, intent);
    if (process.env.NODE_ENV === "development") {
      console.log("Components:", componentData);
    }

    const styled = await applyStyle(componentData);
    if (process.env.NODE_ENV === "development") {
      console.log("Styled:", styled);
    }

    validateUI(styled);

    const data = styled as PipelineStyledData;
    const nodes = mapPipelineToSceneNodes(data);

    return NextResponse.json({
      success: true,
      data,
      nodes,
    });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
