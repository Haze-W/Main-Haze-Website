import { NextResponse } from 'next/server';
import { parsePrompt } from '@/lib/ai/prompt-parser';
import { generateLayout } from '@/lib/ai/layout-generator';
import { validateAndFixLayout } from '@/lib/ai/rules-engine';
import { convertToSceneNodes } from '@/lib/ai/schema/adapter';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // Step 1: Parse the prompt
    const parsed = parsePrompt(prompt);
    
    // Step 2: Generate layout (with or without OpenAI)
    const layout = await generateLayout(parsed);
    
    // Step 3: Validate and fix with rules engine
    const validatedLayout = validateAndFixLayout(layout.nodes);
    
    // Step 4: Convert to editor format
    const sceneNodes = convertToSceneNodes({
      ...layout,
      nodes: validatedLayout
    });
    
    return NextResponse.json({ 
      nodes: sceneNodes,
      metadata: {
        prompt: parsed,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('AI Generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate UI' },
      { status: 500 }
    );
  }
}