import { SPACING_SCALE, type SceneNode } from '@/lib/ai/schema/ui-schema';

export function clampToSpacing(value: number): number {
  if (!SPACING_SCALE || SPACING_SCALE.length === 0) {
    return value;
  }
  
  let closest = SPACING_SCALE[0];
  let minDiff = Math.abs(value - closest);
  
  for (const s of SPACING_SCALE) {
    const diff = Math.abs(value - s);
    if (diff < minDiff) {
      closest = s;
      minDiff = diff;
    }
  }
  
  return closest;
}

export function validateAndFixElement(node: SceneNode): SceneNode {
  // Clamp dimensions to spacing scale
  node.x = clampToSpacing(node.x);
  node.y = clampToSpacing(node.y);
  node.width = clampToSpacing(node.width);
  node.height = clampToSpacing(node.height);
  
  // Ensure minimum sizes
  if (node.type === 'button' && node.height < 40) {
    node.height = 40;
  }
  if (node.type === 'text' && node.height < 20) {
    node.height = 20;
  }
  if (node.type === 'input' && node.height < 36) {
    node.height = 36;
  }
  
  // Recursively fix children
  if (node.children && node.children.length > 0) {
    node.children = node.children.map(child => validateAndFixElement(child));
  }
  
  return node;
}

export function validateAndFixFrame(frame: any) {
  if (frame.children && Array.isArray(frame.children)) {
    frame.children = frame.children.map((child: SceneNode) => 
      validateAndFixElement(child)
    );
  }
  return frame;
}

export function validateLayout(layout: any) {
  if (layout.nodes && Array.isArray(layout.nodes)) {
    layout.nodes = layout.nodes.map((node: SceneNode) => 
      validateAndFixElement(node)
    );
  }
  return layout;
}

export function validateAndFixLayout(nodes: SceneNode[]): SceneNode[] {
  return nodes.map(node => validateAndFixElement(node));
}