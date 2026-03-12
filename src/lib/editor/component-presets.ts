import type { SceneNodeType } from "./types";

export interface ComponentPreset {
  type: SceneNodeType;
  name: string;
  width: number;
  height: number;
  props?: Record<string, unknown>;
}

export const COMPONENT_PRESETS: Record<string, ComponentPreset> = {
  // Layout - Frame presets
  FRAME: { type: "FRAME", name: "Frame", width: 400, height: 300 },
  FRAME_IDE: { type: "FRAME", name: "IDE", width: 1400, height: 900, props: { variant: "ide" } },
  FRAME_DESKTOP: { type: "FRAME", name: "Desktop", width: 1440, height: 900, props: { variant: "desktop" } },
  FRAME_APP: { type: "FRAME", name: "App", width: 800, height: 600, props: { variant: "app" } },
  FRAME_WIDE: { type: "FRAME", name: "Wide", width: 1200, height: 600, props: { variant: "wide" } },
  CONTAINER: { type: "CONTAINER", name: "Container", width: 200, height: 120 },
  PANEL: { type: "PANEL", name: "Panel", width: 280, height: 180, props: { title: "Panel" } },
  DIVIDER: { type: "DIVIDER", name: "Divider", width: 200, height: 2 },
  SPACER: { type: "SPACER", name: "Spacer", width: 20, height: 20 },
  GRID: { type: "CONTAINER", name: "Grid", width: 300, height: 200, props: { columns: 3 } },
  FLEX_ROW: { type: "CONTAINER", name: "Flex Row", width: 240, height: 48, props: { layoutMode: "HORIZONTAL" } },
  FLEX_COL: { type: "CONTAINER", name: "Flex Col", width: 120, height: 120, props: { layoutMode: "VERTICAL" } },
  RECTANGLE: { type: "RECTANGLE", name: "Rectangle", width: 100, height: 100 },

  // Basic
  TEXT: { type: "TEXT", name: "Text", width: 120, height: 24, props: { content: "Text", fontSize: 14 } },
  HEADING: { type: "TEXT", name: "Heading", width: 200, height: 32, props: { content: "Heading", fontSize: 24, fontWeight: "bold" } },
  PARAGRAPH: { type: "TEXT", name: "Paragraph", width: 280, height: 48, props: { content: "Lorem ipsum dolor sit amet.", fontSize: 14 } },
  BUTTON: { type: "BUTTON", name: "Button", width: 120, height: 36, props: { label: "Button", variant: "primary" } },
  BUTTON_SECONDARY: { type: "BUTTON", name: "Secondary", width: 120, height: 36, props: { label: "Secondary", variant: "secondary" } },
  BUTTON_OUTLINE: { type: "BUTTON", name: "Outline", width: 120, height: 36, props: { label: "Outline", variant: "outline" } },
  BUTTON_GHOST: { type: "BUTTON", name: "Ghost", width: 100, height: 36, props: { label: "Ghost", variant: "ghost" } },
  BUTTON_ICON: { type: "BUTTON", name: "Icon Button", width: 40, height: 40, props: { variant: "icon", iconName: "plus" } },
  IMAGE: { type: "IMAGE", name: "Image", width: 200, height: 120, props: { src: "", alt: "Image" } },
  ICON: { type: "ICON", name: "Icon", width: 24, height: 24, props: { iconName: "star", size: 24 } },
  AVATAR: { type: "IMAGE", name: "Avatar", width: 40, height: 40, props: { rounded: true } },

  // Form
  INPUT: { type: "INPUT", name: "Input", width: 200, height: 36, props: { placeholder: "Placeholder...", type: "text" } },
  INPUT_PASSWORD: { type: "INPUT", name: "Password", width: 200, height: 36, props: { placeholder: "Password", type: "password" } },
  INPUT_EMAIL: { type: "INPUT", name: "Email", width: 200, height: 36, props: { placeholder: "email@example.com", type: "email" } },
  INPUT_NUMBER: { type: "INPUT", name: "Number", width: 120, height: 36, props: { placeholder: "0", type: "number" } },
  CHECKBOX: { type: "CHECKBOX", name: "Checkbox", width: 120, height: 24, props: { label: "Checkbox", checked: false } },
  RADIO: { type: "CHECKBOX", name: "Radio", width: 120, height: 24, props: { label: "Option", radio: true } },
  SWITCH: { type: "CHECKBOX", name: "Switch", width: 48, height: 24, props: { label: "", switch: true } },
  SELECT: { type: "SELECT", name: "Select", width: 160, height: 36, props: { placeholder: "Select...", options: ["Option 1", "Option 2"] } },
  DROPDOWN: { type: "SELECT", name: "Dropdown", width: 180, height: 36 },
  TEXTAREA: { type: "INPUT", name: "Textarea", width: 200, height: 80, props: { multiline: true, placeholder: "Enter text..." } },
  LABEL: { type: "TEXT", name: "Label", width: 80, height: 20, props: { content: "Label", fontSize: 12 } },

  // Content
  LIST: { type: "LIST", name: "List", width: 200, height: 120 },
  CARD: { type: "CONTAINER", name: "Card", width: 240, height: 160, props: { variant: "card" } },
  CODE_BLOCK: { type: "CONTAINER", name: "Code Block", width: 320, height: 120, props: { language: "javascript" } },
  MARKDOWN: { type: "CONTAINER", name: "Markdown", width: 280, height: 100 },

  // Overlays & Navigation
  MODAL: { type: "CONTAINER", name: "Modal", width: 400, height: 300, props: { variant: "modal" } },
  DRAWER: { type: "CONTAINER", name: "Drawer", width: 320, height: 400, props: { variant: "drawer" } },
  TOAST: { type: "CONTAINER", name: "Toast", width: 320, height: 48, props: { variant: "toast" } },
  NAVBAR: { type: "CONTAINER", name: "Navbar", width: 400, height: 56, props: { variant: "navbar" } },
  SIDEBAR: { type: "CONTAINER", name: "Sidebar", width: 240, height: 400, props: { variant: "sidebar" } },
  FOOTER: { type: "CONTAINER", name: "Footer", width: 400, height: 80 },
  TABS: { type: "CONTAINER", name: "Tabs", width: 300, height: 120, props: { tabs: ["Tab 1", "Tab 2"] } },
  ACCORDION: { type: "CONTAINER", name: "Accordion", width: 280, height: 160 },
  BREADCRUMBS: { type: "CONTAINER", name: "Breadcrumbs", width: 200, height: 24 },

  // Feedback
  BADGE: { type: "CONTAINER", name: "Badge", width: 60, height: 24, props: { content: "New", variant: "default" } },
  TAG: { type: "CONTAINER", name: "Tag", width: 80, height: 28, props: { content: "Tag" } },
  TOOLTIP: { type: "CONTAINER", name: "Tooltip", width: 120, height: 36, props: { content: "Tooltip text" } },
  PROGRESS: { type: "CONTAINER", name: "Progress Bar", width: 200, height: 8, props: { value: 60 } },
  SLIDER: { type: "CONTAINER", name: "Slider", width: 200, height: 24 },
  SPINNER: { type: "CONTAINER", name: "Spinner", width: 32, height: 32 },
  SKELETON: { type: "CONTAINER", name: "Skeleton", width: 200, height: 24 },
  ALERT: { type: "CONTAINER", name: "Alert", width: 320, height: 48, props: { variant: "info", content: "Alert message" } },
  NOTIFICATION: { type: "CONTAINER", name: "Notification", width: 340, height: 64 },

  // Data
  TABLE: { type: "CONTAINER", name: "Table", width: 400, height: 200 },
  PAGINATION: { type: "CONTAINER", name: "Pagination", width: 280, height: 36 },
  SEARCH_BAR: { type: "INPUT", name: "Search", width: 240, height: 40, props: { placeholder: "Search...", search: true } },

  // Media
  VIDEO_PLAYER: { type: "CONTAINER", name: "Video", width: 360, height: 200 },
  AUDIO_PLAYER: { type: "CONTAINER", name: "Audio", width: 320, height: 56 },
  CAROUSEL: { type: "CONTAINER", name: "Carousel", width: 400, height: 200 },

  // Charts
  CHART_BAR: { type: "CONTAINER", name: "Bar Chart", width: 320, height: 200 },
  CHART_LINE: { type: "CONTAINER", name: "Line Chart", width: 320, height: 200 },
  CHART_PIE: { type: "CONTAINER", name: "Pie Chart", width: 200, height: 200 },

  // Pickers
  DATE_PICKER: { type: "INPUT", name: "Date Picker", width: 180, height: 36, props: { type: "date" } },
  TIME_PICKER: { type: "INPUT", name: "Time Picker", width: 140, height: 36, props: { type: "time" } },
  COLOR_PICKER: { type: "CONTAINER", name: "Color Picker", width: 200, height: 80 },
  FILE_UPLOADER: { type: "CONTAINER", name: "File Upload", width: 280, height: 120 },

  // Sections
  HERO_SECTION: { type: "CONTAINER", name: "Hero", width: 600, height: 320 },
  PRICING_CARD: { type: "CONTAINER", name: "Pricing Card", width: 280, height: 360 },
  CTA_SECTION: { type: "CONTAINER", name: "CTA", width: 400, height: 160 },
  FORM: { type: "CONTAINER", name: "Form", width: 320, height: 240 },
  LOGIN_FORM: { type: "CONTAINER", name: "Login Form", width: 320, height: 360 },

  // Widgets
  SETTINGS_PANEL: { type: "PANEL", name: "Settings", width: 280, height: 400 },
  STATS_WIDGET: { type: "CONTAINER", name: "Stats", width: 200, height: 80 },
  GAUGE: { type: "CONTAINER", name: "Gauge", width: 120, height: 120 },
  MAP_PLACEHOLDER: { type: "CONTAINER", name: "Map", width: 400, height: 300 },

  // App blocks
  TIMELINE: { type: "CONTAINER", name: "Timeline", width: 320, height: 240 },
  KANBAN_COLUMN: { type: "CONTAINER", name: "Kanban", width: 280, height: 400 },
  CHAT_BUBBLE: { type: "CONTAINER", name: "Chat Bubble", width: 200, height: 48 },
  COMMENT_THREAD: { type: "CONTAINER", name: "Comment", width: 280, height: 80 },
  USER_PROFILE: { type: "CONTAINER", name: "User Profile", width: 200, height: 80 },

  // States
  EMPTY_STATE: { type: "CONTAINER", name: "Empty State", width: 280, height: 160 },
  ERROR_STATE: { type: "CONTAINER", name: "Error State", width: 280, height: 120 },
  SUCCESS_STATE: { type: "CONTAINER", name: "Success State", width: 280, height: 120 },

  // Window Top Bar
  TOPBAR_WIN: { type: "TOPBAR", name: "Top Bar (Windows)", width: 800, height: 36, props: { _topBarLayout: "windows" } },
  TOPBAR_MAC: { type: "TOPBAR", name: "Top Bar (macOS)", width: 800, height: 36, props: { _topBarLayout: "mac" } },
  TOPBAR_CUSTOM: { type: "TOPBAR", name: "Top Bar (Custom)", width: 800, height: 36, props: { _topBarLayout: "custom" } },
};

export const COMPONENT_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: "Frames", keys: ["FRAME_IDE", "FRAME_DESKTOP", "FRAME_APP", "FRAME_WIDE"] },
  { label: "Layout", keys: ["CONTAINER", "PANEL", "GRID", "FLEX_ROW", "FLEX_COL", "DIVIDER", "SPACER", "RECTANGLE"] },
  { label: "Basic", keys: ["TEXT", "HEADING", "PARAGRAPH", "BUTTON", "BUTTON_SECONDARY", "BUTTON_OUTLINE", "BUTTON_GHOST", "BUTTON_ICON", "IMAGE", "ICON", "AVATAR"] },
  { label: "Form", keys: ["INPUT", "INPUT_PASSWORD", "INPUT_EMAIL", "INPUT_NUMBER", "CHECKBOX", "RADIO", "SWITCH", "SELECT", "DROPDOWN", "TEXTAREA", "LABEL"] },
  { label: "Content", keys: ["LIST", "CARD", "CODE_BLOCK", "MARKDOWN"] },
  { label: "Overlays", keys: ["MODAL", "DRAWER", "TOAST", "NAVBAR", "SIDEBAR", "FOOTER", "TABS", "ACCORDION", "BREADCRUMBS"] },
  { label: "Feedback", keys: ["BADGE", "TAG", "TOOLTIP", "PROGRESS", "SLIDER", "SPINNER", "SKELETON", "ALERT", "NOTIFICATION"] },
  { label: "Data", keys: ["TABLE", "PAGINATION", "SEARCH_BAR"] },
  { label: "Media", keys: ["VIDEO_PLAYER", "AUDIO_PLAYER", "CAROUSEL"] },
  { label: "Charts", keys: ["CHART_BAR", "CHART_LINE", "CHART_PIE"] },
  { label: "Pickers", keys: ["DATE_PICKER", "TIME_PICKER", "COLOR_PICKER", "FILE_UPLOADER"] },
  { label: "Sections", keys: ["HERO_SECTION", "PRICING_CARD", "CTA_SECTION", "FORM", "LOGIN_FORM"] },
  { label: "Widgets", keys: ["SETTINGS_PANEL", "STATS_WIDGET", "GAUGE", "MAP_PLACEHOLDER"] },
  { label: "App Blocks", keys: ["TIMELINE", "KANBAN_COLUMN", "CHAT_BUBBLE", "COMMENT_THREAD", "USER_PROFILE"] },
  { label: "States", keys: ["EMPTY_STATE", "ERROR_STATE", "SUCCESS_STATE"] },
  { label: "Window", keys: ["TOPBAR_WIN", "TOPBAR_MAC", "TOPBAR_CUSTOM"] },
];
