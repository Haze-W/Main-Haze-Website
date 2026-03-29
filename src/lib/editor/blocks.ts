import { DEFAULT_CHROME_TITLE_COLOR } from "./window-chrome";

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
  trigger: "ON_CLICK" | "ON_HOVER" | "ON_HOVER_END" | "ON_CHANGE" | "ON_LOAD";
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
  // Animation
  | "ANIMATE_FADE_IN"
  | "ANIMATE_FADE_OUT"
  | "ANIMATE_SLIDE_UP"
  | "ANIMATE_SLIDE_DOWN"
  | "ANIMATE_SLIDE_LEFT"
  | "ANIMATE_SLIDE_RIGHT"
  | "ANIMATE_SCALE_UP"
  | "ANIMATE_SCALE_DOWN"
  | "ANIMATE_PULSE"
  | "ANIMATE_SHAKE"
  | "ANIMATE_BOUNCE"
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

/** Transition style for NAVIGATE_TO_FRAME */
export type TransitionStyle = "none" | "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "scale-up" | "scale-down";

/** Hover preset — applied directly to a node, no block needed */
export type HoverPreset = "none" | "lift" | "glow" | "scale" | "dim" | "brighten" | "border-glow";

/** Extra parameters stored on a block for configurable actions */
export interface BlockParams {
  targetFrameId?: string;
  targetFrameName?: string;
  transition?: TransitionStyle;
  targetNodeId?: string;
  targetNodeName?: string;
  url?: string;
  openInBrowser?: boolean;
  propKey?: string;
  propValue?: unknown;
  ipcEvent?: string;
  ipcPayload?: string;
  scriptBody?: string;
  // Animation params
  duration?: number;  // ms, default 400
  delay?: number;     // ms, default 0
  easing?: string;    // CSS easing
  distance?: number;  // px for slide animations
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
    { id: "btn-min", type: "minimize", hoverColor: "rgba(0,0,0,0.06)", activeColor: "rgba(0,0,0,0.1)", blockChain: makeChain("minimize") },
    { id: "btn-max", type: "maximize", hoverColor: "rgba(0,0,0,0.06)", activeColor: "rgba(0,0,0,0.1)", blockChain: makeChain("maximize") },
    { id: "btn-close", type: "close", hoverColor: "#e81123", activeColor: "#f1707a", blockChain: makeChain("close") },
  ];
}

export function createDefaultTopBarConfig(layout: TopBarLayout = "windows"): TopBarConfig {
  return {
    layout,
    title: "My Application",
    showIcon: true,
    backgroundColor: "#ffffff",
    textColor: DEFAULT_CHROME_TITLE_COLOR,
    fontSize: 13,
    fontWeight: "400",
    fontFamily: "Inter, system-ui, sans-serif",
    titleAlign: layout === "mac" ? "center" : "left",
    height: 36,
    paddingX: 12,
    borderBottom: true,
    borderColor: "rgba(15,23,42,0.08)",
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
  // Animation
  { value: "ANIMATE_FADE_IN", label: "Fade In", group: "Animation" },
  { value: "ANIMATE_FADE_OUT", label: "Fade Out", group: "Animation" },
  { value: "ANIMATE_SLIDE_UP", label: "Slide Up", group: "Animation" },
  { value: "ANIMATE_SLIDE_DOWN", label: "Slide Down", group: "Animation" },
  { value: "ANIMATE_SLIDE_LEFT", label: "Slide Left", group: "Animation" },
  { value: "ANIMATE_SLIDE_RIGHT", label: "Slide Right", group: "Animation" },
  { value: "ANIMATE_SCALE_UP", label: "Scale Up", group: "Animation" },
  { value: "ANIMATE_SCALE_DOWN", label: "Scale Down", group: "Animation" },
  { value: "ANIMATE_PULSE", label: "Pulse", group: "Animation" },
  { value: "ANIMATE_SHAKE", label: "Shake", group: "Animation" },
  { value: "ANIMATE_BOUNCE", label: "Bounce", group: "Animation" },
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

export const TRANSITION_OPTIONS: { value: TransitionStyle; label: string }[] = [
  { value: "none",        label: "None (instant)" },
  { value: "fade",        label: "Fade" },
  { value: "slide-left",  label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up",    label: "Slide Up" },
  { value: "slide-down",  label: "Slide Down" },
  { value: "scale-up",    label: "Scale Up" },
  { value: "scale-down",  label: "Scale Down" },
];

export const HOVER_PRESETS: { value: HoverPreset; label: string; description: string }[] = [
  { value: "none",        label: "None",         description: "" },
  { value: "lift",        label: " Lift",       description: "Rises and adds shadow on hover" },
  { value: "glow",        label: " Glow",       description: "Soft accent glow on hover" },
  { value: "scale",       label: " Scale",      description: "Slightly grows on hover" },
  { value: "dim",         label: " Dim",        description: "Fades out on hover" },
  { value: "brighten",    label: " Brighten",   description: "Gets brighter on hover" },
  { value: "border-glow", label: " Border",     description: "Accent border appears on hover" },
];

