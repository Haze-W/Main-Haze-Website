export interface ParsedPrompt {
  layout: 'dashboard' | 'landing' | 'app' | 'ide';
  components: string[];
  style: 'modern' | 'minimal' | 'neumorphic' | 'glass';
  colorScheme?: string[];
  complexity: 'simple' | 'medium' | 'complex';
}

export function parsePrompt(prompt: string): ParsedPrompt {
  // Extract intent from natural language
  const lowerPrompt = prompt.toLowerCase();
  
  // Detect layout type
  let layout: ParsedPrompt['layout'] = 'dashboard';
  if (lowerPrompt.includes('landing') || lowerPrompt.includes('marketing')) layout = 'landing';
  else if (lowerPrompt.includes('app') || lowerPrompt.includes('application')) layout = 'app';
  else if (lowerPrompt.includes('ide') || lowerPrompt.includes('code')) layout = 'ide';
  
  // Detect components
  const componentKeywords = {
    sidebar: ['sidebar', 'navigation', 'menu'],
    cards: ['card', 'kpi', 'metric', 'stat'],
    charts: ['chart', 'graph', 'visualization'],
    table: ['table', 'grid', 'data'],
    header: ['header', 'navbar', 'topbar'],
    footer: ['footer', 'bottom'],
  };
  
  const components: string[] = [];
  Object.entries(componentKeywords).forEach(([component, keywords]) => {
    if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
      components.push(component);
    }
  });
  
  // Detect style
  let style: ParsedPrompt['style'] = 'modern';
  if (lowerPrompt.includes('minimal')) style = 'minimal';
  else if (lowerPrompt.includes('glass') || lowerPrompt.includes('frosted')) style = 'glass';
  else if (lowerPrompt.includes('neumorph')) style = 'neumorphic';
  
  return {
    layout,
    components,
    style,
    complexity: lowerPrompt.includes('complex') ? 'complex' : 
                 lowerPrompt.includes('simple') ? 'simple' : 'medium'
  };
}