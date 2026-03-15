import { ParsedPrompt } from './prompt-parser';
import { UILayout, UINode } from './schema/ui-schema';

export async function generateLayout(parsed: ParsedPrompt): Promise<UILayout> {
  // Check for OpenAI API key
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(parsed);
    } catch (error) {
      console.warn('OpenAI generation failed, using fallback', error);
    }
  }
  
  // Fallback to rule-based generation
  return generateFallbackLayout(parsed);
}

function generateFallbackLayout(parsed: ParsedPrompt): UILayout {
  const nodes: UINode[] = [];
  
  switch (parsed.layout) {
    case 'dashboard':
      nodes.push(
        // Sidebar
        {
          id: 'sidebar',
          type: 'frame',
          name: 'Sidebar',
          x: 0,
          y: 0,
          width: 240,
          height: 900,
          fills: [{ type: 'solid', color: '#1e1e2e' }],
          children: [
            // Logo
            {
              id: 'logo',
              type: 'rectangle',
              name: 'Logo',
              x: 16,
              y: 24,
              width: 120,
              height: 32,
              fills: [{ type: 'solid', color: '#3a3a4e' }],
            },
            // Navigation items
            ...['Dashboard', 'Analytics', 'Settings'].map((item, i) => ({
              id: `nav-${i}`,
              type: 'rectangle',
              name: item,
              x: 16,
              y: 80 + i * 48,
              width: 208,
              height: 40,
              cornerRadius: 6,
              fills: i === 0 ? [{ type: 'solid', color: '#4a4a6a' }] : [{ type: 'solid', color: 'transparent' }],
            })),
          ],
        },
        // Main content
        {
          id: 'main',
          type: 'frame',
          name: 'Main Content',
          x: 240,
          y: 0,
          width: 1200,
          height: 900,
          fills: [{ type: 'solid', color: '#2a2a3a' }],
          children: [
            // Header
            {
              id: 'header',
              type: 'frame',
              name: 'Header',
              x: 0,
              y: 0,
              width: 1200,
              height: 64,
              fills: [{ type: 'solid', color: '#1e1e2e' }],
            },
            // KPI Cards
            ...['Revenue', 'Users', 'Sales'].map((kpi, i) => ({
              id: `kpi-${i}`,
              type: 'rectangle',
              name: `${kpi} Card`,
              x: 24 + i * 264,
              y: 88,
              width: 240,
              height: 120,
              cornerRadius: 8,
              fills: [{ type: 'solid', color: '#1e1e2e' }],
            })),
            // Chart
            {
              id: 'chart',
              type: 'rectangle',
              name: 'Chart',
              x: 24,
              y: 232,
              width: 1152,
              height: 320,
              cornerRadius: 8,
              fills: [{ type: 'solid', color: '#1e1e2e' }],
            },
            // Table
            {
              id: 'table',
              type: 'rectangle',
              name: 'Data Table',
              x: 24,
              y: 576,
              width: 1152,
              height: 300,
              cornerRadius: 8,
              fills: [{ type: 'solid', color: '#1e1e2e' }],
            },
          ],
        }
      );
      break;
      
    // Add cases for landing, app, etc.
  }
  
  return {
    nodes,
    width: 1440,
    height: 900,
    backgroundColor: '#2a2a3a',
  };
}

async function generateWithOpenAI(parsed: ParsedPrompt): Promise<UILayout> {
  // Implement OpenAI API call here
  // Return structured layout based on AI response
}