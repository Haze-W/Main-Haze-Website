/**
 * Coral 1.0 — Custom local AI engine for Render
 * No external API calls. Pattern-matching + template generation.
 */

import type { SceneNode } from "@/lib/editor/types";

export interface CoralRequest {
  prompt: string;
  mode: "ui" | "backend" | "agent" | "fix" | null;
  nodes: SceneNode[];
  projectName: string;
}

export interface CoralResponse {
  action: "GENERATE_UI" | "GENERATE_CODE" | "ANSWER" | "FIX";
  text: string;
  nodes?: SceneNode[];
  rust?: string;
  js?: string;
  deps?: string[];
  fixes?: { nodeId: string; changes: Partial<SceneNode> }[];
}

let idCounter = 0;
function uid(type: string): string {
  idCounter++;
  const rand = Math.random().toString(36).slice(2, 8);
  return `ai-${type.toLowerCase()}-${rand}${idCounter}`;
}

// ── Keyword matching ───────────────────────────────────────────

function has(text: string, ...keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// ── Shared styling tokens ──────────────────────────────────────

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)";
const CARD_RADIUS = 12;

// Simple bar chart SVG as data URL (works offline)
const CHART_SVG = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180" width="400" height="180">
  <defs><linearGradient id="g1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5e5ce6"/><stop offset="1" stop-color="#7c7aed"/></linearGradient>
  <linearGradient id="g2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#4ade80"/></linearGradient></defs>
  <rect fill="rgba(255,255,255,0.03)" width="400" height="180" rx="8"/>
  <rect x="40" y="120" width="40" height="45" fill="url(#g1)" rx="4"/>
  <rect x="100" y="95" width="40" height="70" fill="url(#g1)" rx="4"/>
  <rect x="160" y="75" width="40" height="90" fill="url(#g1)" rx="4"/>
  <rect x="220" y="55" width="40" height="110" fill="url(#g2)" rx="4"/>
  <rect x="280" y="85" width="40" height="80" fill="url(#g1)" rx="4"/>
  <rect x="340" y="105" width="40" height="60" fill="url(#g1)" rx="4"/>
  <text x="200" y="20" fill="rgba(255,255,255,0.5)" font-size="11" font-family="system-ui" text-anchor="middle">Monthly Stats</text>
</svg>`);

// ── UI Templates ───────────────────────────────────────────────

function buildLoginScreen(): SceneNode[] {
  const frameId = uid("FRAME");
  return [{
    id: frameId, type: "FRAME", name: "Login Screen", x: 40, y: 40, width: 1200, height: 800,
    children: [
      { id: uid("RECTANGLE"), type: "RECTANGLE", name: "Background", x: 0, y: 0, width: 1200, height: 800, children: [], props: { backgroundColor: "#0d0f12" } },
      { id: uid("CONTAINER"), type: "CONTAINER", name: "Login Card", x: 400, y: 160, width: 420, height: 500, children: [
        { id: uid("TEXT"), type: "TEXT", name: "Title", x: 32, y: 36, width: 356, height: 36, children: [], props: { content: "Welcome back", fontSize: 26, fontWeight: "bold", color: "#e6edf3" } },
        { id: uid("TEXT"), type: "TEXT", name: "Subtitle", x: 32, y: 80, width: 356, height: 20, children: [], props: { content: "Sign in to your account", fontSize: 14, color: "#8b949e" } },
        { id: uid("TEXT"), type: "TEXT", name: "Email Label", x: 32, y: 128, width: 356, height: 16, children: [], props: { content: "Email", fontSize: 13, fontWeight: "500", color: "#e6edf3" } },
        { id: uid("INPUT"), type: "INPUT", name: "Email Input", x: 32, y: 150, width: 356, height: 44, children: [], props: { placeholder: "you@example.com", type: "email" } },
        { id: uid("TEXT"), type: "TEXT", name: "Password Label", x: 32, y: 212, width: 356, height: 16, children: [], props: { content: "Password", fontSize: 13, fontWeight: "500", color: "#e6edf3" } },
        { id: uid("INPUT"), type: "INPUT", name: "Password Input", x: 32, y: 234, width: 356, height: 44, children: [], props: { placeholder: "Enter your password", type: "password" } },
        { id: uid("CHECKBOX"), type: "CHECKBOX", name: "Remember Me", x: 32, y: 296, width: 160, height: 20, children: [], props: { label: "Remember me", checked: false } },
        { id: uid("BUTTON"), type: "BUTTON", name: "Sign In", x: 32, y: 340, width: 356, height: 48, children: [], props: { label: "Sign In", variant: "primary", _hoverPreset: "lift" } },
        { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 32, y: 408, width: 356, height: 1, children: [] },
        { id: uid("TEXT"), type: "TEXT", name: "Signup Link", x: 32, y: 432, width: 356, height: 16, children: [], props: { content: "Don't have an account? Sign up", fontSize: 13, color: "#5e5ce6", textAlign: "center" } },
      ], props: { backgroundColor: "#1a1b23", variant: "card", borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, _hoverPreset: "glow" } },
    ],
    props: { backgroundColor: "#0d0f12" },
  }];
}

function buildSettingsPage(): SceneNode[] {
  const frameId = uid("FRAME");
  return [{
    id: frameId, type: "FRAME", name: "Settings Page", x: 40, y: 40, width: 1200, height: 800,
    children: [
      { id: uid("CONTAINER"), type: "CONTAINER", name: "Sidebar", x: 0, y: 0, width: 240, height: 800, children: [
        { id: uid("TEXT"), type: "TEXT", name: "App Name", x: 20, y: 24, width: 200, height: 24, children: [], props: { content: "Settings", fontSize: 17, fontWeight: "bold", color: "#e6edf3" } },
        { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 20, y: 60, width: 200, height: 1, children: [] },
        { id: uid("TEXT"), type: "TEXT", name: "General", x: 20, y: 80, width: 200, height: 36, children: [], props: { content: "General", fontSize: 14, color: "#5e5ce6" } },
        { id: uid("TEXT"), type: "TEXT", name: "Appearance", x: 20, y: 116, width: 200, height: 36, children: [], props: { content: "Appearance", fontSize: 14, color: "#8b949e" } },
        { id: uid("TEXT"), type: "TEXT", name: "Privacy", x: 20, y: 152, width: 200, height: 36, children: [], props: { content: "Privacy & Security", fontSize: 14, color: "#8b949e" } },
        { id: uid("TEXT"), type: "TEXT", name: "Notifications", x: 20, y: 188, width: 200, height: 36, children: [], props: { content: "Notifications", fontSize: 14, color: "#8b949e" } },
        { id: uid("TEXT"), type: "TEXT", name: "About", x: 20, y: 224, width: 200, height: 36, children: [], props: { content: "About", fontSize: 14, color: "#8b949e" } },
      ], props: { backgroundColor: "#151620", variant: "sidebar", borderRadius: 0 } },
      { id: uid("CONTAINER"), type: "CONTAINER", name: "Content", x: 240, y: 0, width: 960, height: 800, children: [
        { id: uid("TEXT"), type: "TEXT", name: "Section Title", x: 48, y: 44, width: 400, height: 28, children: [], props: { content: "General Settings", fontSize: 22, fontWeight: "bold", color: "#e6edf3" } },
        { id: uid("TEXT"), type: "TEXT", name: "Profile Label", x: 48, y: 100, width: 200, height: 16, children: [], props: { content: "Display Name", fontSize: 13, fontWeight: "500", color: "#e6edf3" } },
        { id: uid("INPUT"), type: "INPUT", name: "Name Input", x: 48, y: 122, width: 380, height: 44, children: [], props: { placeholder: "Your display name" } },
        { id: uid("TEXT"), type: "TEXT", name: "Email Label", x: 48, y: 186, width: 200, height: 16, children: [], props: { content: "Email Address", fontSize: 13, fontWeight: "500", color: "#e6edf3" } },
        { id: uid("INPUT"), type: "INPUT", name: "Email Input", x: 48, y: 208, width: 380, height: 44, children: [], props: { placeholder: "you@example.com", type: "email" } },
        { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 48, y: 280, width: 864, height: 1, children: [] },
        { id: uid("TEXT"), type: "TEXT", name: "Theme Label", x: 48, y: 308, width: 200, height: 16, children: [], props: { content: "Theme", fontSize: 13, fontWeight: "500", color: "#e6edf3" } },
        { id: uid("SELECT"), type: "SELECT", name: "Theme Select", x: 48, y: 330, width: 220, height: 44, children: [], props: { placeholder: "Dark", options: ["Dark", "Light", "System"] } },
        { id: uid("CHECKBOX"), type: "CHECKBOX", name: "Notifications Toggle", x: 48, y: 398, width: 260, height: 24, children: [], props: { label: "Enable notifications", checked: true, switch: true } },
        { id: uid("BUTTON"), type: "BUTTON", name: "Save Button", x: 48, y: 460, width: 150, height: 44, children: [], props: { label: "Save Changes", variant: "primary", _hoverPreset: "lift" } },
        { id: uid("BUTTON"), type: "BUTTON", name: "Cancel Button", x: 214, y: 460, width: 110, height: 44, children: [], props: { label: "Cancel", variant: "ghost" } },
      ], props: { backgroundColor: "#0d0f12" } },
    ],
    props: { backgroundColor: "#0d0f12" },
  }];
}

const statCardProps = { backgroundColor: "#1a1b23", variant: "card" as const, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW };

function buildDashboard(includeChart = false): SceneNode[] {
  const frameId = uid("FRAME");
  const children: SceneNode[] = [
    { id: uid("CONTAINER"), type: "CONTAINER", name: "Sidebar", x: 0, y: 0, width: 240, height: 800, children: [
      { id: uid("ICON"), type: "ICON", name: "Logo", x: 20, y: 24, width: 24, height: 24, children: [], props: { iconName: "layout-dashboard", color: "#5e5ce6", size: 24 } },
      { id: uid("TEXT"), type: "TEXT", name: "Brand", x: 52, y: 24, width: 160, height: 24, children: [], props: { content: "Dashboard", fontSize: 16, fontWeight: "bold", color: "#e6edf3" } },
      { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 16, y: 64, width: 208, height: 1, children: [] },
      { id: uid("TEXT"), type: "TEXT", name: "Overview", x: 20, y: 80, width: 200, height: 36, children: [], props: { content: "Overview", fontSize: 14, color: "#5e5ce6" } },
      { id: uid("TEXT"), type: "TEXT", name: "Analytics", x: 20, y: 116, width: 200, height: 36, children: [], props: { content: "Analytics", fontSize: 14, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Projects", x: 20, y: 152, width: 200, height: 36, children: [], props: { content: "Projects", fontSize: 14, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Settings", x: 20, y: 188, width: 200, height: 36, children: [], props: { content: "Settings", fontSize: 14, color: "#8b949e" } },
    ], props: { backgroundColor: "#151620", variant: "sidebar" } },
    { id: uid("CONTAINER"), type: "CONTAINER", name: "Topbar", x: 240, y: 0, width: 960, height: 56, children: [
      { id: uid("INPUT"), type: "INPUT", name: "Search", x: 24, y: 10, width: 320, height: 36, children: [], props: { placeholder: "Search...", search: true } },
      { id: uid("ICON"), type: "ICON", name: "Bell", x: 880, y: 16, width: 24, height: 24, children: [], props: { iconName: "bell", color: "#8b949e", size: 20 } },
      { id: uid("ICON"), type: "ICON", name: "User", x: 916, y: 16, width: 24, height: 24, children: [], props: { iconName: "user", color: "#8b949e", size: 20 } },
    ], props: { backgroundColor: "#0d0f12", variant: "navbar" } },
    { id: uid("CONTAINER"), type: "CONTAINER", name: "Stat 1", x: 272, y: 80, width: 210, height: 100, children: [
      { id: uid("TEXT"), type: "TEXT", name: "Stat Label", x: 20, y: 16, width: 170, height: 16, children: [], props: { content: "Total Users", fontSize: 13, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Stat Value", x: 20, y: 42, width: 170, height: 32, children: [], props: { content: "12,847", fontSize: 28, fontWeight: "bold", color: "#e6edf3" } },
    ], props: { ...statCardProps, _hoverPreset: "lift" } },
    { id: uid("CONTAINER"), type: "CONTAINER", name: "Stat 2", x: 502, y: 80, width: 210, height: 100, children: [
      { id: uid("TEXT"), type: "TEXT", name: "Stat Label", x: 20, y: 16, width: 170, height: 16, children: [], props: { content: "Revenue", fontSize: 13, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Stat Value", x: 20, y: 42, width: 170, height: 32, children: [], props: { content: "$48,290", fontSize: 28, fontWeight: "bold", color: "#e6edf3" } },
    ], props: { ...statCardProps, _hoverPreset: "lift" } },
    { id: uid("CONTAINER"), type: "CONTAINER", name: "Stat 3", x: 732, y: 80, width: 210, height: 100, children: [
      { id: uid("TEXT"), type: "TEXT", name: "Stat Label", x: 20, y: 16, width: 170, height: 16, children: [], props: { content: "Active Now", fontSize: 13, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Stat Value", x: 20, y: 42, width: 170, height: 32, children: [], props: { content: "1,024", fontSize: 28, fontWeight: "bold", color: "#e6edf3" } },
    ], props: statCardProps },
    { id: uid("CONTAINER"), type: "CONTAINER", name: "Stat 4", x: 962, y: 80, width: 210, height: 100, children: [
      { id: uid("TEXT"), type: "TEXT", name: "Stat Label", x: 20, y: 16, width: 170, height: 16, children: [], props: { content: "Growth", fontSize: 13, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Stat Value", x: 20, y: 42, width: 170, height: 32, children: [], props: { content: "+24.5%", fontSize: 28, fontWeight: "bold", color: "#22c55e" } },
    ], props: { ...statCardProps, _hoverPreset: "lift" } },
  ];

  if (includeChart) {
    children.push(
      { id: uid("CONTAINER"), type: "CONTAINER", name: "Chart Card", x: 272, y: 208, width: 560, height: 260, children: [
        { id: uid("TEXT"), type: "TEXT", name: "Chart Title", x: 24, y: 20, width: 512, height: 24, children: [], props: { content: "Monthly Statistics", fontSize: 18, fontWeight: "600", color: "#e6edf3" } },
        { id: uid("IMAGE"), type: "IMAGE", name: "Chart", x: 24, y: 52, width: 512, height: 180, children: [], props: { src: CHART_SVG, alt: "Bar chart" } },
      ], props: { backgroundColor: "#1a1b23", variant: "card", borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW } },
      { id: uid("CONTAINER"), type: "CONTAINER", name: "Activity Card", x: 856, y: 208, width: 316, height: 260, children: [
        { id: uid("TEXT"), type: "TEXT", name: "Activity Title", x: 24, y: 20, width: 268, height: 24, children: [], props: { content: "Recent Activity", fontSize: 18, fontWeight: "600", color: "#e6edf3" } },
        { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 24, y: 56, width: 268, height: 1, children: [] },
        { id: uid("TEXT"), type: "TEXT", name: "Activity 1", x: 24, y: 72, width: 268, height: 20, children: [], props: { content: "New user signup", fontSize: 13, color: "#e6edf3" } },
        { id: uid("TEXT"), type: "TEXT", name: "Activity 1 time", x: 24, y: 92, width: 268, height: 16, children: [], props: { content: "2 minutes ago", fontSize: 11, color: "#8b949e" } },
        { id: uid("TEXT"), type: "TEXT", name: "Activity 2", x: 24, y: 120, width: 268, height: 20, children: [], props: { content: "Payment received", fontSize: 13, color: "#e6edf3" } },
        { id: uid("TEXT"), type: "TEXT", name: "Activity 2 time", x: 24, y: 140, width: 268, height: 16, children: [], props: { content: "15 minutes ago", fontSize: 11, color: "#8b949e" } },
        { id: uid("TEXT"), type: "TEXT", name: "Activity 3", x: 24, y: 168, width: 268, height: 20, children: [], props: { content: "New project created", fontSize: 13, color: "#e6edf3" } },
        { id: uid("TEXT"), type: "TEXT", name: "Activity 3 time", x: 24, y: 188, width: 268, height: 16, children: [], props: { content: "1 hour ago", fontSize: 11, color: "#8b949e" } },
      ], props: { backgroundColor: "#1a1b23", variant: "card", borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW } }
    );
  }

  return [{
    id: frameId, type: "FRAME", name: "Dashboard", x: 40, y: 40, width: 1200, height: 800,
    children,
    props: { backgroundColor: "#0d0f12" },
  }];
}

function buildSidebar(): SceneNode[] {
  return [{
    id: uid("CONTAINER"), type: "CONTAINER", name: "Sidebar", x: 40, y: 40, width: 240, height: 600,
    children: [
      { id: uid("TEXT"), type: "TEXT", name: "Brand", x: 20, y: 24, width: 200, height: 24, children: [], props: { content: "File Browser", fontSize: 16, fontWeight: "bold", color: "#e6edf3" } },
      { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 16, y: 60, width: 208, height: 1, children: [] },
      { id: uid("ICON"), type: "ICON", name: "Home Icon", x: 20, y: 80, width: 20, height: 20, children: [], props: { iconName: "home", color: "#5e5ce6", size: 18 } },
      { id: uid("TEXT"), type: "TEXT", name: "Home", x: 48, y: 80, width: 160, height: 20, children: [], props: { content: "Home", fontSize: 14, color: "#5e5ce6" } },
      { id: uid("ICON"), type: "ICON", name: "Doc Icon", x: 20, y: 116, width: 20, height: 20, children: [], props: { iconName: "file-text", color: "#8b949e", size: 18 } },
      { id: uid("TEXT"), type: "TEXT", name: "Documents", x: 48, y: 116, width: 160, height: 20, children: [], props: { content: "Documents", fontSize: 14, color: "#8b949e" } },
      { id: uid("ICON"), type: "ICON", name: "Img Icon", x: 20, y: 152, width: 20, height: 20, children: [], props: { iconName: "image", color: "#8b949e", size: 18 } },
      { id: uid("TEXT"), type: "TEXT", name: "Images", x: 48, y: 152, width: 160, height: 20, children: [], props: { content: "Images", fontSize: 14, color: "#8b949e" } },
      { id: uid("ICON"), type: "ICON", name: "DL Icon", x: 20, y: 188, width: 20, height: 20, children: [], props: { iconName: "download", color: "#8b949e", size: 18 } },
      { id: uid("TEXT"), type: "TEXT", name: "Downloads", x: 48, y: 188, width: 160, height: 20, children: [], props: { content: "Downloads", fontSize: 14, color: "#8b949e" } },
      { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 16, y: 232, width: 208, height: 1, children: [] },
      { id: uid("ICON"), type: "ICON", name: "Trash Icon", x: 20, y: 248, width: 20, height: 20, children: [], props: { iconName: "trash-2", color: "#8b949e", size: 18 } },
      { id: uid("TEXT"), type: "TEXT", name: "Trash", x: 48, y: 248, width: 160, height: 20, children: [], props: { content: "Trash", fontSize: 14, color: "#8b949e" } },
    ],
    props: { backgroundColor: "#151620", variant: "sidebar", boxShadow: "2px 0 12px rgba(0,0,0,0.3)" },
  }];
}

function buildNavbar(): SceneNode[] {
  return [{
    id: uid("CONTAINER"), type: "CONTAINER", name: "Navbar", x: 40, y: 40, width: 1200, height: 56,
    children: [
      { id: uid("TEXT"), type: "TEXT", name: "Logo", x: 24, y: 16, width: 120, height: 24, children: [], props: { content: "MyApp", fontSize: 18, fontWeight: "bold", color: "#e6edf3" } },
      { id: uid("TEXT"), type: "TEXT", name: "Nav Home", x: 500, y: 18, width: 60, height: 20, children: [], props: { content: "Home", fontSize: 14, color: "#e6edf3" } },
      { id: uid("TEXT"), type: "TEXT", name: "Nav About", x: 576, y: 18, width: 60, height: 20, children: [], props: { content: "About", fontSize: 14, color: "#8b949e" } },
      { id: uid("TEXT"), type: "TEXT", name: "Nav Pricing", x: 652, y: 18, width: 60, height: 20, children: [], props: { content: "Pricing", fontSize: 14, color: "#8b949e" } },
      { id: uid("BUTTON"), type: "BUTTON", name: "CTA", x: 1060, y: 10, width: 120, height: 36, children: [], props: { label: "Get Started", variant: "primary", _hoverPreset: "lift" } },
    ],
    props: { backgroundColor: "#1a1b23", variant: "navbar", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" },
  }];
}

function buildGenericCard(title: string): SceneNode[] {
  return [{
    id: uid("CONTAINER"), type: "CONTAINER", name: title, x: 40, y: 40, width: 360, height: 220,
    children: [
      { id: uid("TEXT"), type: "TEXT", name: "Title", x: 24, y: 24, width: 312, height: 26, children: [], props: { content: title, fontSize: 18, fontWeight: "bold", color: "#e6edf3" } },
      { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 24, y: 62, width: 312, height: 1, children: [] },
      { id: uid("TEXT"), type: "TEXT", name: "Description", x: 24, y: 80, width: 312, height: 44, children: [], props: { content: "This is a card component. Customize it in the properties panel.", fontSize: 13, color: "#8b949e", lineHeight: 1.5 } },
      { id: uid("BUTTON"), type: "BUTTON", name: "Action", x: 24, y: 156, width: 130, height: 40, children: [], props: { label: "Learn More", variant: "primary", _hoverPreset: "lift" } },
    ],
    props: { backgroundColor: "#1a1b23", variant: "card", borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW },
  }];
}

function buildChatbotApp(includeSettings = true): SceneNode[] {
  const mainFrameId = uid("FRAME");
  const settingsNodes = includeSettings ? buildSettingsPage() : [];
  const settingsFrame = settingsNodes[0];
  const settingsFrameId = settingsFrame?.type === "FRAME" ? settingsFrame.id : null;

  const settingsBtnProps: Record<string, unknown> = {
    label: "Settings",
    variant: "ghost" as const,
    _hoverPreset: "lift" as const,
  };
  if (settingsFrameId) {
    settingsBtnProps._interactions = [
      { id: uid("ia"), trigger: "ON_CLICK" as const, blocks: [{ id: uid("b"), type: "NAVIGATE_TO_FRAME" as const, label: "Go to Settings", enabled: true, params: { targetFrameId: settingsFrameId, transition: "slide-left" as const } }] },
    ];
  }

  const mainFrame: SceneNode = {
    id: mainFrameId,
    type: "FRAME",
    name: "Chat App",
    x: 40,
    y: 40,
    width: 1200,
    height: 800,
    props: { backgroundColor: "#0d0f12" },
    children: [
      // Sidebar — chat list
      {
        id: uid("CONTAINER"),
        type: "CONTAINER",
        name: "Chat Sidebar",
        x: 0,
        y: 0,
        width: 280,
        height: 800,
        props: { backgroundColor: "#151620", variant: "sidebar", borderRadius: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.3)" },
        children: [
          { id: uid("TEXT"), type: "TEXT", name: "App Title", x: 20, y: 24, width: 240, height: 26, children: [], props: { content: "AI Chat", fontSize: 18, fontWeight: "bold", color: "#e6edf3" } },
          { id: uid("BUTTON"), type: "BUTTON", name: "New Chat", x: 20, y: 60, width: 240, height: 40, children: [], props: { label: "+ New Chat", variant: "primary", _hoverPreset: "lift" } },
          { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider", x: 20, y: 116, width: 240, height: 1, children: [] },
          { id: uid("TEXT"), type: "TEXT", name: "Chat 1", x: 20, y: 132, width: 240, height: 36, children: [], props: { content: "Product ideas", fontSize: 14, color: "#5e5ce6" } },
          { id: uid("TEXT"), type: "TEXT", name: "Chat 2", x: 20, y: 172, width: 240, height: 36, children: [], props: { content: "Code review help", fontSize: 14, color: "#8b949e" } },
          { id: uid("TEXT"), type: "TEXT", name: "Chat 3", x: 20, y: 212, width: 240, height: 36, children: [], props: { content: "Design feedback", fontSize: 14, color: "#8b949e" } },
          { id: uid("TEXT"), type: "TEXT", name: "Chat 4", x: 20, y: 252, width: 240, height: 36, children: [], props: { content: "Writing assistant", fontSize: 14, color: "#8b949e" } },
          { id: uid("DIVIDER"), type: "DIVIDER", name: "Divider 2", x: 20, y: 304, width: 240, height: 1, children: [] },
          { id: uid("BUTTON"), type: "BUTTON", name: "Settings Btn", x: 16, y: 320, width: 248, height: 36, children: [], props: { ...settingsBtnProps } },
        ],
      },
      // Main chat area
      {
        id: uid("CONTAINER"),
        type: "CONTAINER",
        name: "Chat Content",
        x: 280,
        y: 0,
        width: 920,
        height: 800,
        props: { backgroundColor: "#0d0f12" },
        children: [
          // Header
          { id: uid("TEXT"), type: "TEXT", name: "Chat Header", x: 32, y: 24, width: 400, height: 24, children: [], props: { content: "Product ideas", fontSize: 16, fontWeight: "600", color: "#e6edf3" } },
          { id: uid("DIVIDER"), type: "DIVIDER", name: "Header Divider", x: 32, y: 60, width: 856, height: 1, children: [] },
          // Messages area
          {
            id: uid("CONTAINER"),
            type: "CONTAINER",
            name: "Messages",
            x: 32,
            y: 80,
            width: 856,
            height: 560,
            props: { backgroundColor: "rgba(26,27,35,0.5)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", _previewBehavior: "chat-messages" },
            children: [
              { id: uid("TEXT"), type: "TEXT", name: "User Msg", x: 24, y: 24, width: 400, height: 20, children: [], props: { content: "Can you help me brainstorm product ideas?", fontSize: 14, color: "#e6edf3" } },
              { id: uid("TEXT"), type: "TEXT", name: "AI Msg", x: 24, y: 56, width: 700, height: 40, children: [], props: { content: "Of course! Here are a few directions we could explore...", fontSize: 14, color: "#8b949e", lineHeight: 1.5 } },
              { id: uid("TEXT"), type: "TEXT", name: "User Msg 2", x: 24, y: 112, width: 350, height: 20, children: [], props: { content: "What about a focus on mobile-first?", fontSize: 14, color: "#e6edf3" } },
              { id: uid("TEXT"), type: "TEXT", name: "AI Msg 2", x: 24, y: 144, width: 650, height: 48, children: [], props: { content: "Mobile-first is a strong approach. We could prioritize touch interactions, offline support, and push notifications for engagement.", fontSize: 14, color: "#8b949e", lineHeight: 1.5 } },
            ],
          },
          // Input area — _previewBehavior enables interactive chat in preview
          { id: uid("INPUT"), type: "INPUT", name: "Chat Input", x: 32, y: 668, width: 780, height: 48, children: [], props: { placeholder: "Message your AI agent...", type: "text", _previewBehavior: "chat-input" } },
          { id: uid("BUTTON"), type: "BUTTON", name: "Send", x: 828, y: 668, width: 60, height: 48, children: [], props: { label: "Send", variant: "primary", _hoverPreset: "lift", _previewBehavior: "chat-send" } },
        ],
      },
    ],
  };

  const frames: SceneNode[] = [mainFrame];
  if (includeSettings && settingsFrame) {
    // Add Back button to Settings content to navigate to Chat App
    const content = settingsFrame.children?.find((c) => c.name === "Content");
    if (content && content.children) {
      const backBtn: SceneNode = {
        id: uid("BUTTON"),
        type: "BUTTON",
        name: "Back",
        x: 48,
        y: 44,
        width: 100,
        height: 36,
        children: [],
        props: {
          label: "← Back",
          variant: "ghost",
          _hoverPreset: "lift",
          _interactions: [
            { id: uid("ia"), trigger: "ON_CLICK", blocks: [{ id: uid("b"), type: "NAVIGATE_TO_FRAME", label: "Back to Chat", enabled: true, params: { targetFrameId: mainFrameId, transition: "slide-right" } }] },
          ],
        },
      };
      // Shift Section Title down to make room
      content.children.forEach((c) => {
        if (c.name === "Section Title") c.y = 92;
        else if (c.y >= 44 && c.name !== "Back") c.y = (c.y as number) + 48;
      });
      content.children.unshift(backBtn);
    }
    frames.push({ ...settingsFrame, x: 1280, y: 40 } as SceneNode);
  }
  return frames;
}

// ── UI mode handler ────────────────────────────────────────────

function handleUIMode(prompt: string): CoralResponse {
  const lower = prompt.toLowerCase();

  // Chatbot app — check FIRST so "chatbot with settings" returns full app, not just settings
  if (has(lower, "chatbot", "chat app", "ai chat", "chat with ai", "ai agent", "conversation", "chats", "talk with")) {
    const includeSettings = has(lower, "settings", "user settings", "preferences", "config", "all frames", "frames");
    return {
      action: "GENERATE_UI",
      text: includeSettings
        ? "Generated a chatbot app with sidebar (chat list), main chat area, and a user settings page. Both frames added to canvas."
        : "Generated a chatbot app with sidebar showing all chats and main chat area to talk with your AI agent.",
      nodes: buildChatbotApp(includeSettings),
    };
  }

  if (has(lower, "login", "sign in", "signin", "auth")) {
    return { action: "GENERATE_UI", text: "Generated a login screen with email/password inputs, remember me checkbox, and sign in button.", nodes: buildLoginScreen() };
  }
  if (has(lower, "settings", "preferences", "config")) {
    return { action: "GENERATE_UI", text: "Generated a settings page with sidebar navigation, form inputs, and save/cancel actions.", nodes: buildSettingsPage() };
  }
  if (has(lower, "dashboard", "overview", "analytics", "stats")) {
    const withChart = has(lower, "chart", "statistics", "graph", "data viz");
    return {
      action: "GENERATE_UI",
      text: withChart
        ? "Generated a dashboard with stat cards, bar chart, and activity feed."
        : "Generated a dashboard with sidebar navigation, search bar, and 4 stat cards.",
      nodes: buildDashboard(withChart),
    };
  }
  if (has(lower, "sidebar", "file browser", "file manager", "navigation")) {
    return { action: "GENERATE_UI", text: "Generated a file browser sidebar with icon navigation items.", nodes: buildSidebar() };
  }
  if (has(lower, "navbar", "nav bar", "header", "top bar", "topbar")) {
    return { action: "GENERATE_UI", text: "Generated a navigation bar with logo, nav links, and CTA button.", nodes: buildNavbar() };
  }

  const title = prompt.length > 40 ? prompt.slice(0, 40) + "..." : prompt;
  return { action: "GENERATE_UI", text: `Generated a card component for "${title}".`, nodes: buildGenericCard(title) };
}

// ── Backend mode handler ───────────────────────────────────────

function handleBackendMode(prompt: string): CoralResponse {
  const lower = prompt.toLowerCase();

  // Chat / AI integration — wire frontend to send messages
  if (has(lower, "chat", "textbox", "text box", "input", "send message", "ai chatbot")) {
    return {
      action: "GENERATE_CODE",
      text: "Generated frontend code to wire the chat input and Send button. Use /fix to add _previewBehavior to your nodes for interactive preview, or integrate with your AI API below.",
      js: `// Wire chat input + Send button to your AI
const input = document.querySelector('[data-chat-role="chat-input"] input');
const sendBtn = document.querySelector('[data-chat-role="chat-send"]');
const messagesEl = document.querySelector('[data-chat-role="chat-messages"]');

if (input && sendBtn && messagesEl) {
  async function send() {
    const text = (input.value || '').trim();
    if (!text) return;
    // Add user message to UI
    const userDiv = document.createElement('div');
    userDiv.style.cssText = 'padding:12px 24px;font-size:14px;color:#e6edf3;';
    userDiv.textContent = text;
    messagesEl.appendChild(userDiv);
    input.value = '';
    // Call your AI API (e.g. /api/ai/chat)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }], mode: 'ui' }),
      });
      const data = await res.json();
      const aiDiv = document.createElement('div');
      aiDiv.style.cssText = 'padding:12px 24px;font-size:14px;color:#8b949e;line-height:1.5;';
      aiDiv.textContent = data.text || 'No response';
      messagesEl.appendChild(aiDiv);
    } catch (e) {
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'padding:12px 24px;font-size:14px;color:#f87171;';
      errDiv.textContent = 'Error: ' + (e instanceof Error ? e.message : 'Failed to send');
      messagesEl.appendChild(errDiv);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
}`,
      deps: [],
    };
  }

  if (has(lower, "system info", "sysinfo", "cpu", "memory", "system")) {
    return {
      action: "GENERATE_CODE",
      text: "Generated a Tauri 2 system info command that returns CPU, memory, and OS details.",
      rust: `use serde::Serialize;

#[derive(Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub hostname: String,
}

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    Ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        hostname: hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string()),
    })
}`,
      js: `import { invoke } from "@tauri-apps/api/core";

interface SystemInfo {
  os: string;
  arch: string;
  hostname: string;
}

async function getSystemInfo(): Promise<SystemInfo> {
  return await invoke<SystemInfo>("get_system_info");
}

// Usage
const info = await getSystemInfo();
console.log(\`Running on \${info.os} (\${info.arch})\`);`,
      deps: ['hostname = "0.4"'],
    };
  }

  if (has(lower, "file", "read", "write", "fs", "filesystem")) {
    return {
      action: "GENERATE_CODE",
      text: "Generated Tauri 2 file read/write commands with proper error handling.",
      rust: `use std::fs;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path).map_err(|e| format!("Failed to read dir: {}", e))?;
    let mut names = Vec::new();
    for entry in entries {
        if let Ok(e) = entry {
            names.push(e.file_name().to_string_lossy().to_string());
        }
    }
    Ok(names)
}`,
      js: `import { invoke } from "@tauri-apps/api/core";

async function readFile(path: string): Promise<string> {
  return await invoke<string>("read_file", { path });
}

async function writeFile(path: string, content: string): Promise<void> {
  await invoke("write_file", { path, content });
}

async function listDir(path: string): Promise<string[]> {
  return await invoke<string[]>("list_dir", { path });
}

// Usage
const content = await readFile("/tmp/example.txt");
await writeFile("/tmp/output.txt", "Hello from Tauri!");
const files = await listDir("/tmp");`,
      deps: [],
    };
  }

  if (has(lower, "window", "event", "listen")) {
    return {
      action: "GENERATE_CODE",
      text: "Generated window event listeners for Tauri 2.",
      rust: `#[tauri::command]
pub fn set_window_title(window: tauri::Window, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_fullscreen(window: tauri::Window) -> Result<(), String> {
    let is_full = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_full).map_err(|e| e.to_string())
}`,
      js: `import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

await invoke("set_window_title", { title: "My App" });
await invoke("toggle_fullscreen");

// Listen for window events
const unlisten = await listen("tauri://close-requested", (event) => {
  console.log("Window close requested", event);
});`,
      deps: [],
    };
  }

  return {
    action: "GENERATE_CODE",
    text: "Generated a basic Tauri 2 command template. Customize it for your needs.",
    rust: `use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Response {
    pub message: String,
    pub success: bool,
}

#[tauri::command]
pub fn my_command(input: String) -> Result<Response, String> {
    Ok(Response {
        message: format!("Received: {}", input),
        success: true,
    })
}

// Register in main.rs:
// tauri::Builder::default()
//     .invoke_handler(tauri::generate_handler![my_command])`,
    js: `import { invoke } from "@tauri-apps/api/core";

interface Response {
  message: string;
  success: boolean;
}

const result = await invoke<Response>("my_command", { input: "Hello" });
console.log(result.message);`,
    deps: [],
  };
}

// ── Agent mode handler ─────────────────────────────────────────

const KNOWLEDGE_BASE: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["window", "event", "close", "minimize", "maximize"],
    answer: "**Window events in Tauri 2:**\n\nUse `@tauri-apps/api/event` to listen for window events:\n\n- `tauri://close-requested` — fired when the user clicks the close button\n- `tauri://window-created` — fired when a new window is created\n- `tauri://focus` / `tauri://blur` — track window focus\n\nYou can prevent default close behavior and show a confirmation dialog by calling `event.preventDefault()` in the close handler.\n\nIn Rust, use `on_window_event` in your Builder to handle events server-side.",
  },
  {
    keywords: ["permission", "capabilities", "security", "allow"],
    answer: "**Tauri 2 Permissions System:**\n\nTauri 2 uses a capabilities-based security model defined in `src-tauri/capabilities/`.\n\nEach capability grants specific permissions to windows:\n- `core:default` — basic window operations\n- `fs:read` / `fs:write` — filesystem access\n- `shell:open` — opening URLs/files with system apps\n- `dialog:open` / `dialog:save` — file dialogs\n\nDefine capabilities in JSON files and reference them in `tauri.conf.json`. Each window can have different capability sets.\n\nAlways follow the principle of least privilege — only grant permissions that your app actually needs.",
  },
  {
    keywords: ["state", "store", "persist", "storage", "data"],
    answer: "**State Management in Tauri 2:**\n\nFor frontend state: Use Zustand (like Render does), Redux, or any React state library.\n\nFor persistent storage:\n- `@tauri-apps/plugin-store` — key-value store that persists to disk\n- `tauri::State` in Rust — managed state shared across commands\n- SQLite via `@tauri-apps/plugin-sql` — for structured data\n\nFor Rust managed state, use `app.manage(MyState::default())` in setup and access via `state: tauri::State<MyState>` in commands.",
  },
  {
    keywords: ["build", "compile", "bundle", "release", "deploy"],
    answer: "**Building a Tauri 2 app:**\n\n- `npm run tauri dev` — development mode with hot reload\n- `npm run tauri build` — production build\n\nThe build output is in `src-tauri/target/release/bundle/`.\n\nPlatform-specific outputs:\n- **Windows:** `.msi` and `.exe` installers\n- **macOS:** `.dmg` and `.app` bundles\n- **Linux:** `.deb`, `.rpm`, and `.AppImage`\n\nConfigure build settings in `src-tauri/tauri.conf.json` under the `bundle` key.\n\nFor CI/CD, use `tauri-action` GitHub Action for cross-platform builds.",
  },
  {
    keywords: ["rust", "learn", "start", "beginner", "basic"],
    answer: "**Rust basics for Tauri development:**\n\nKey concepts:\n- `String` vs `&str` — owned vs borrowed strings\n- `Result<T, E>` — error handling (use `?` operator)\n- `Option<T>` — nullable values (`Some(val)` or `None`)\n- `serde` — serialization/deserialization for Tauri commands\n\nFor Tauri commands, you mainly need:\n- `#[tauri::command]` attribute on functions\n- `Result<T, String>` return types\n- `serde::Serialize` / `Deserialize` on structs\n\nStart with the Rust Book (doc.rust-lang.org/book/) and Tauri docs.",
  },
];

function handleAgentMode(prompt: string): CoralResponse {
  const lower = prompt.toLowerCase();

  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some((k) => lower.includes(k))) {
      return { action: "ANSWER", text: entry.answer };
    }
  }

  return {
    action: "ANSWER",
    text: `That's a great question! While I'm still learning (Coral 1.0), here's what I can help with:\n\n- **/ui** — Generate UI layouts (login screens, dashboards, settings pages, etc.)\n- **/backend** — Write Tauri 2 Rust commands and TypeScript integration code\n- **/agent** — Answer questions about Tauri, Rust, UI/UX, and app architecture\n- **/fix** — Analyze and fix issues in your canvas or code\n\nTry being more specific, like "How do I handle window close events?" or "Explain Tauri permissions".`,
  };
}

// ── Fix mode handler ───────────────────────────────────────────

function findNodeByName(nodes: SceneNode[], names: string[]): SceneNode | null {
  const lowerNames = names.map((n) => n.toLowerCase());
  function search(ns: SceneNode[]): SceneNode | null {
    for (const n of ns) {
      if (lowerNames.some((ln) => (n.name ?? "").toLowerCase().includes(ln))) return n;
      if (n.children?.length) {
        const found = search(n.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(nodes);
}

function handleFixMode(prompt: string, nodes: SceneNode[]): CoralResponse {
  const fixes: { nodeId: string; changes: Partial<SceneNode> }[] = [];
  const issues: string[] = [];

  if (nodes.length === 0) {
    return {
      action: "FIX",
      text: "No nodes on the canvas to analyze. Add some components first, then ask me to fix issues.",
    };
  }

  for (const node of nodes) {
    if (node.width <= 0 || node.height <= 0) {
      fixes.push({ nodeId: node.id, changes: { width: Math.max(node.width, 40), height: Math.max(node.height, 40) } });
      issues.push(`Fixed **${node.name}** — had zero/negative dimensions`);
    }
    if (node.x < -5000 || node.y < -5000 || node.x > 10000 || node.y > 10000) {
      fixes.push({ nodeId: node.id, changes: { x: 40, y: 40 } });
      issues.push(`Fixed **${node.name}** — was positioned off-canvas, moved to (40, 40)`);
    }

    if (node.children) {
      for (const child of node.children) {
        if (child.width <= 0 || child.height <= 0) {
          fixes.push({ nodeId: child.id, changes: { width: Math.max(child.width, 20), height: Math.max(child.height, 20) } });
          issues.push(`Fixed **${child.name}** inside ${node.name} — had zero/negative dimensions`);
        }
      }
    }
  }

  const lower = prompt.toLowerCase();

  // Make chat input / textbox work in preview
  if (has(lower, "textbox", "text box", "input", "chat input", "make.*work", "typing", "type in", "send message")) {
    const chatInput = findNodeByName(nodes, ["Chat Input", "chat input", "Message input", "Input"]);
    const sendBtn = findNodeByName(nodes, ["Send", "send"]);
    const messages = findNodeByName(nodes, ["Messages", "messages", "Chat Content"]);
    if (chatInput) {
      fixes.push({ nodeId: chatInput.id, changes: { props: { ...(chatInput.props ?? {}), _previewBehavior: "chat-input" } } });
      issues.push("Added **interactive chat input** — you can now type in the preview");
    }
    if (sendBtn) {
      fixes.push({ nodeId: sendBtn.id, changes: { props: { ...(sendBtn.props ?? {}), _previewBehavior: "chat-send" } } });
      issues.push("Wired **Send button** to chat — click to send messages in preview");
    }
    if (messages) {
      fixes.push({ nodeId: messages.id, changes: { props: { ...(messages.props ?? {}), _previewBehavior: "chat-messages" } } });
      issues.push("Enabled **messages area** — new messages will appear when you send");
    }
  }

  if (has(lower, "layout", "align", "spacing", "overlap")) {
    let yOffset = 40;
    for (const node of nodes) {
      if (node.type === "FRAME") continue;
      fixes.push({ nodeId: node.id, changes: { x: 40, y: yOffset } });
      issues.push(`Re-positioned **${node.name}** to (40, ${yOffset})`);
      yOffset += node.height + 16;
    }
  }

  if (fixes.length === 0) {
    return {
      action: "FIX",
      text: `Analyzed ${nodes.length} node(s) on your canvas — no obvious issues found. Everything looks good!\n\nIf you're experiencing a specific problem, describe it in more detail and I'll try to help.`,
    };
  }

  return {
    action: "FIX",
    text: `Found and fixed ${fixes.length} issue(s):\n\n${issues.map((i) => `- ${i}`).join("\n")}`,
    fixes,
  };
}

// ── Main engine ────────────────────────────────────────────────

export function coralGenerate(request: CoralRequest): CoralResponse {
  const { prompt, mode, nodes } = request;

  switch (mode) {
    case "ui":
      return handleUIMode(prompt);
    case "backend":
      return handleBackendMode(prompt);
    case "agent":
      return handleAgentMode(prompt);
    case "fix":
      return handleFixMode(prompt, nodes);
    default: {
      const lower = prompt.toLowerCase();
      if (has(lower, "build", "create", "make", "design", "add", "generate") && has(lower, "page", "screen", "layout", "sidebar", "navbar", "card", "login", "dashboard", "settings")) {
        return handleUIMode(prompt);
      }
      if (has(lower, "rust", "command", "backend", "invoke", "tauri")) {
        return handleBackendMode(prompt);
      }
      if (has(lower, "fix", "broken", "bug", "error", "wrong", "debug")) {
        return handleFixMode(prompt, nodes);
      }
      return handleAgentMode(prompt);
    }
  }
}
