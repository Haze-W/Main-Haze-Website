import { UINode } from './schema/ui-schema';

export function validateAndFixLayout(nodes: UINode[]): UINode[] {
  // Apply grid constraints
  const gridSize = 4; // 4px grid
  const columnWidth = 120; // 12-column grid at 1440px
  
  return nodes.map(node => {
    // Snap to grid
    node.x = Math.round(node.x / gridSize) * gridSize;
    node.y = Math.round(node.y / gridSize) * gridSize;
    node.width = Math.round(node.width / gridSize) * gridSize;
    node.height = Math.round(node.height / gridSize) * gridSize;
    
    // Ensure minimum dimensions
    node.width = Math.max(node.width, 20);
    node.height = Math.max(node.height, 20);
    
    // Fix positioning based on constraints
    if (node.constraints) {
      // Apply constraint logic
    }
    
    return node;
  });
}

export function applySpacing(parent: UINode, spacing: 4 | 8 | 16 | 24 | 32 = 16) {
  if (!parent.children) return parent;
  
  // Auto-layout logic
  parent.children = parent.children.map((child, index) => {
    if (index > 0) {
      child.y = parent.children![index - 1].y + parent.children![index - 1].height + spacing;
    }
    return child;
  });
  
  return parent;
}