import type { AIUILayout, AIUIElement, SceneNode } from "./ui-schema";

export interface EditorNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: {
    content?: string;
    style?: any;
    [key: string]: any;
  };
  children?: EditorNode[];
}

export function aiLayoutToSceneNodes(layout: AIUILayout): SceneNode[] {
  const nodes = layout?.frame?.children ?? [];
  return nodes as SceneNode[];
}

export function adaptToEditorNodes(aiNodes: AIUIElement[]): EditorNode[] {
  return aiNodes.map(node => ({
    id: node.id,
    type: mapNodeType(node.type),
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    props: {
      content: node.text || node.props?.iconName,
      style: {
        backgroundColor: node.backgroundColor,
        color: node.color,
        ...node.styles,
      },
    },
    children: node.children ? adaptToEditorNodes(node.children) : [],
  }));
}

function mapNodeType(aiType: string): string {
  const typeMap: Record<string, string> = {
    'sidebar': 'frame',
    'topbar': 'frame',
    'card': 'container',
    'hero': 'container',
    'text': 'text',
    'icon': 'icon',
    'button': 'button',
    'input': 'input',
  };
  return typeMap[aiType] || 'frame';
}