export type UINodeType = 
  | 'frame' | 'group' | 'rectangle' | 'text' 
  | 'component' | 'instance' | 'line';

export interface UINode {
  id: string;
  type: UINodeType;
  name: string;
  visible: boolean;
  locked?: boolean;
  
  // Layout
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Styling
  fills?: Array<{
    type: 'solid' | 'gradient' | 'image';
    color?: string;
    opacity?: number;
  }>;
  strokes?: Array<{
    color: string;
    weight: number;
  }>;
  cornerRadius?: number;
  
  // Text specific
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  
  // Children
  children?: UINode[];
  
  // Constraints
  constraints?: {
    horizontal: 'left' | 'right' | 'center' | 'stretch';
    vertical: 'top' | 'bottom' | 'center' | 'stretch';
  };
}

export interface UILayout {
  nodes: UINode[];
  width: number;
  height: number;
  backgroundColor?: string;
}