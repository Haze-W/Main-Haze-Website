/**
 * Screenshot Layout Extractor - Extracts UI layout from screenshots using GPT-4 Vision
 * Produces structured JSON matching our UI schema for seamless editor integration
 */

import type { AIUILayout, AIUIElement, AIUIFrame } from "../schema/ui-schema";
import { validateAndFixFrame } from "./rules-engine";
import { DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH } from "../schema/ui-schema";

const SCREENSHOT_SYSTEM_PROMPT = `You are an expert UI/UX analyst. Analyze the screenshot and extract its layout as structured JSON.

TASK: Identify every visible UI component, its position, size, text, colors, and hierarchy. Output coordinates scaled to a 1440x900 canvas.

COMPONENT TYPES: navbar, sidebar, topbar, hero, card, table, form, button, text, input, image, icon, frame, container

OUTPUT - Return ONLY valid JSON (no markdown, no \`\`\`json):
{
  "frame": {
    "width": 1440,
    "height": 900,
    "background": "#f8fafc",
    "children": [
      {
        "id": "unique_id",
        "type": "sidebar|topbar|navbar|hero|card|text|button|input|icon|image|frame|container",
        "x": 0,
        "y": 0,
        "width": 260,
        "height": 900,
        "text": "exact visible text",
        "color": "#000000",
        "backgroundColor": "#ffffff",
        "children": []
      }
    ]
  },
  "imageWidth": 1920,
  "imageHeight": 1080
}

RULES:
- Output ONLY valid JSON. No explanation.
- Every element: id (unique), type, x, y, width, height.
- Scale all coordinates to 1440x900. If image is 1920x1080, multiply x by 1440/1920, y by 900/1080.
- imageWidth/imageHeight: the screenshot's pixel dimensions (estimate from aspect ratio if needed).
- Sidebar: x=0, full height, 200-280px wide, dark bg. Nest nav items as children.
- Topbar/navbar: full width minus sidebar, 56-72px tall.
- Cards: contain text children. Use styles: { "padding": 24, "borderRadius": 12 }.
- Icons: type "icon", props: { "iconName": "lucide-name" }. Map: menu→menu, home→home, chart→bar-chart-2, settings→settings, user→user, search→search, dashboard→layout-dashboard.
- Preserve hierarchy: nest children inside parents.
- Extract ALL visible text exactly.
- Hex colors only.`;

function ensureIds(el: AIUIElement, prefix: string, idx: number): AIUIElement {
  const id = el.id || `${prefix}_${idx}`;
  const children = el.children?.map((c, i) => ensureIds(c, `${id}_child`, i)) ?? [];
  return { ...el, id, children };
}

function parseExtractionResponse(content: string): { layout: AIUILayout; imgW: number; imgH: number } | null {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as {
      frame?: AIUIFrame;
      imageWidth?: number;
      imageHeight?: number;
    };
    if (!parsed?.frame?.children) return null;
    const frame = parsed.frame;
    const imgW = parsed.imageWidth ?? 1920;
    const imgH = parsed.imageHeight ?? 1080;
    frame.children = frame.children.map((c, i) => ensureIds(c, "el", i));
    return {
      layout: {
        frame,
        metadata: { generatedAt: new Date().toISOString(), version: "1.0", source: "screenshot" },
      },
      imgW,
      imgH,
    };
  } catch {
    return null;
  }
}

function scaleLayoutToTarget(
  frame: AIUIFrame,
  sourceW: number,
  sourceH: number,
  targetW: number = DEFAULT_WIDTH,
  targetH: number = 900
): AIUIFrame {
  const scaleX = targetW / sourceW;
  const scaleY = targetH / sourceH;

  function scaleElement(el: AIUIElement): AIUIElement {
    return {
      ...el,
      x: Math.round(el.x * scaleX),
      y: Math.round(el.y * scaleY),
      width: Math.max(20, Math.round(el.width * scaleX)),
      height: Math.max(16, Math.round(el.height * scaleY)),
      children: el.children?.map(scaleElement),
      styles: el.styles
        ? {
            ...el.styles,
            padding: el.styles.padding ? Math.round(el.styles.padding * Math.min(scaleX, scaleY)) : undefined,
            borderRadius: el.styles.borderRadius ? Math.round(el.styles.borderRadius * Math.min(scaleX, scaleY)) : undefined,
            fontSize: el.styles.fontSize ? Math.round(el.styles.fontSize * Math.min(scaleX, scaleY)) : undefined,
          }
        : undefined,
    };
  }

  return {
    ...frame,
    width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(frame.width * scaleX))),
    height: Math.max(600, Math.min(2000, Math.round(frame.height * scaleY))),
    children: frame.children.map(scaleElement),
  };
}

export async function extractLayoutFromScreenshot(
  imageBase64: string,
  options?: { apiKey?: string; model?: string }
): Promise<AIUILayout> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  const model = options?.model ?? "gpt-4o";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for screenshot extraction");
  }

  const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SCREENSHOT_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this UI screenshot and extract the complete layout structure. Return ONLY the JSON object.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" as const,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("OpenAI Vision API error:", err);
    throw new Error(`Screenshot extraction failed: ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("No response from AI");

  const result = parseExtractionResponse(content);
  if (!result) throw new Error("Failed to parse layout from screenshot");

  let frame = result.layout.frame;
  if (frame.width !== 1440 || frame.height !== 900) {
    frame = scaleLayoutToTarget(frame, frame.width, frame.height, 1440, 900);
  }
  frame = validateAndFixFrame(frame);
  result.layout.frame = frame;
  result.layout.metadata = { ...result.layout.metadata, source: "screenshot" };
  return result.layout;
}
