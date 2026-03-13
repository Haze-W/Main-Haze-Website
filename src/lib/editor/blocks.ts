/**
 * Block-based action system for window controls and custom behaviors.
 * Each block represents a discrete action that can be triggered by a UI element.
 * Blocks can be chained to create complex behaviors.
 */

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  enabled: boolean;
  params?: BlockParams;
}

/** A single interaction rule: trigger → block actions */
export interface Interaction {
  id: string;
  trigger: "ON_CLICK" | "ON_HOVER" | "ON_CHANGE";
  blocks: Block[];
}

/** Stored on node.props._interactions */
export type InteractionList = Interaction[];

export type BlockType =
  // Window controls
  | "CLOSE_APP"
  | "MINIMIZE_WINDOW"
  | "TOGGLE_MAXIMIZE"
  // Navigation
  | "NAVIGATE_TO_FRAME"
  | "OPEN_URL"
  // Visibility
  | "SHOW_ELEMENT"
  | "HIDE_ELEMENT"
  | "TOGGLE_VISIBILITY"
  // State
  | "SET_PROP"
  | "TOGGLE_CHECKED"
  // Tauri
  | "SAVE_PROJECT"
  | "OPEN_SETTINGS"
  | "TRIGGER_EVENT"
  | "SEND_IPC"
  | "RUN_SCRIPT"
  | "CUSTOM";

/** Extra parameters stored on a block for configurable actions */
export interface BlockParams {
  targetFrameId?: string;
  targetFrameName?: string;
  targetNodeId?: string;
  targetNodeName?: string;
  url?: string;
  openInBrowser?: boolean;
  propKey?: string;
  propValue?: unknown;
  ipcEvent?: string;
  ipcPayload?: string;
  scriptBody?: string;
}

export interface BlockChain {
  id: string;
  label: string;
  blocks: Block[];
}

export type TopBarLayout = "windows" | "mac" | "custom";

export interface TopBarButtonConfig {
  id: string;
  type: "minimize" | "maximize" | "close";
  icon?: string;
  hoverColor?: string;
  activeColor?: string;
  blockChain: BlockChain;
}

export interface TopBarConfig {
  layout: TopBarLayout;
  title: string;
  showIcon: boolean;
  iconSrc?: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  titleAlign: "left" | "center" | "right";
  height: number;
  paddingX: number;
  borderBottom: boolean;
  borderColor: string;
  buttons: TopBarButtonConfig[];
  dragRegion: boolean;
  doubleClickMaximize: boolean;
}

export const DEFAULT_BLOCKS: Record<string, Block> = {
  CLOSE_APP: { id: "close", type: "CLOSE_APP", label: "Close Application", enabled: true },
  MINIMIZE_WINDOW: { id: "minimize", type: "MINIMIZE_WINDOW", label: "Minimize Window", enabled: true },
  TOGGLE_MAXIMIZE: { id: "maximize", type: "TOGGLE_MAXIMIZE", label: "Toggle Maximize", enabled: true },
  SAVE_PROJECT: { id: "save", type: "SAVE_PROJECT", label: "Save Project", enabled: true },
  OPEN_SETTINGS: { id: "settings", type: "OPEN_SETTINGS", label: "Open Settings", enabled: true },
  TRIGGER_EVENT: { id: "event", type: "TRIGGER_EVENT", label: "Trigger Custom Event", enabled: true },
  SEND_IPC: { id: "ipc", type: "SEND_IPC", label: "Send IPC Message", enabled: true },
  RUN_SCRIPT: { id: "script", type: "RUN_SCRIPT", label: "Run Script", enabled: true },
};

function makeChain(type: "minimize" | "maximize" | "close"): BlockChain {
  const map: Record<string, Block> = {
    minimize: DEFAULT_BLOCKS.MINIMIZE_WINDOW,
    maximize: DEFAULT_BLOCKS.TOGGLE_MAXIMIZE,
    close: DEFAULT_BLOCKS.CLOSE_APP,
  };
  return { id: type, label: map[type].label, blocks: [map[type]] };
}

export function createDefaultButtons(): TopBarButtonConfig[] {
  return [
    { id: "btn-min", type: "minimize", hoverColor: "rgba(255,255,255,0.1)", activeColor: "rgba(255,255,255,0.15)", blockChain: makeChain("minimize") },
    { id: "btn-max", type: "maximize", hoverColor: "rgba(255,255,255,0.1)", activeColor: "rgba(255,255,255,0.15)", blockChain: makeChain("maximize") },
    { id: "btn-close", type: "close", hoverColor: "#e81123", activeColor: "#f1707a", blockChain: makeChain("close") },
  ];
}

export function createDefaultTopBarConfig(layout: TopBarLayout = "windows"): TopBarConfig {
  return {
    layout,
    title: "My Application",
    showIcon: true,
    backgroundColor: "#1c1c1e",
    textColor: "#e0e0e0",
    fontSize: 13,
    fontWeight: "400",
    fontFamily: "Inter, system-ui, sans-serif",
    titleAlign: layout === "mac" ? "center" : "left",
    height: 36,
    paddingX: 12,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    buttons: createDefaultButtons(),
    dragRegion: true,
    doubleClickMaximize: true,
  };
}

export const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string; group: string }[] = [
  // Navigation
  { value: "NAVIGATE_TO_FRAME", label: "Navigate to Frame", group: "Navigation" },
  { value: "OPEN_URL", label: "Open URL", group: "Navigation" },
  // Visibility
  { value: "SHOW_ELEMENT", label: "Show Element", group: "Visibility" },
  { value: "HIDE_ELEMENT", label: "Hide Element", group: "Visibility" },
  { value: "TOGGLE_VISIBILITY", label: "Toggle Visibility", group: "Visibility" },
  // State
  { value: "TOGGLE_CHECKED", label: "Toggle Checked", group: "State" },
  // Window
  { value: "CLOSE_APP", label: "Close Application", group: "Window" },
  { value: "MINIMIZE_WINDOW", label: "Minimize Window", group: "Window" },
  { value: "TOGGLE_MAXIMIZE", label: "Toggle Maximize", group: "Window" },
  // Tauri
  { value: "SEND_IPC", label: "Send IPC Message", group: "Tauri" },
  { value: "TRIGGER_EVENT", label: "Trigger Custom Event", group: "Tauri" },
];

