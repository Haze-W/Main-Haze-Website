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
}

export type BlockType =
  | "CLOSE_APP"
  | "MINIMIZE_WINDOW"
  | "TOGGLE_MAXIMIZE"
  | "SAVE_PROJECT"
  | "OPEN_SETTINGS"
  | "TRIGGER_EVENT"
  | "SEND_IPC"
  | "RUN_SCRIPT"
  | "CUSTOM";

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

export const BLOCK_TYPE_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "CLOSE_APP", label: "Close Application" },
  { value: "MINIMIZE_WINDOW", label: "Minimize Window" },
  { value: "TOGGLE_MAXIMIZE", label: "Toggle Maximize" },
  { value: "SAVE_PROJECT", label: "Save Project" },
  { value: "OPEN_SETTINGS", label: "Open Settings" },
  { value: "TRIGGER_EVENT", label: "Trigger Custom Event" },
  { value: "SEND_IPC", label: "Send IPC Message" },
  { value: "RUN_SCRIPT", label: "Run Script" },
  { value: "CUSTOM", label: "Custom" },
];
