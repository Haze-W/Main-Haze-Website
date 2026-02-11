"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ComponentType, CanvasNode, FrameType } from "@/lib/types";
import { useEditorStore } from "@/lib/editor-store";
import { IconPickerModal } from "./IconPickerModal";
import styles from "./LeftSidebar.module.css";

const COMPONENT_CATEGORIES: { label: string; components: { type: ComponentType; label: string; icon: string }[] }[] = [
  { label: "Containers", components: [
    { type: "container", label: "Container", icon: "▦" },
    { type: "panel", label: "Panel", icon: "▤" },
  ]},
  { label: "Basic", components: [
    { type: "icon", label: "Icon", icon: "◆" },
    { type: "text", label: "Text", icon: "T" },
    { type: "button", label: "Button", icon: "⬚" },
    { type: "image", label: "Image", icon: "🖼" },
  ]},
  { label: "Form", components: [
    { type: "input", label: "Input", icon: "▭" },
    { type: "checkbox", label: "Checkbox", icon: "☐" },
    { type: "select", label: "Select", icon: "▼" },
  ]},
  { label: "Layout", components: [
    { type: "list", label: "List", icon: "≡" },
  ]},
];

const FRAME_TYPES: { type: FrameType; label: string }[] = [
  { type: "desktop", label: "Desktop" },
  { type: "dialog", label: "Dialog" },
  { type: "sidebar", label: "Sidebar" },
  { type: "overlay", label: "Overlay" },
  { type: "custom", label: "Custom" },
];

function DraggableComponent({ type, label, icon }: { type: ComponentType; label: string; icon: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`${styles.componentItem} ${isDragging ? styles.dragging : ""}`}>
      <span className={styles.componentIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function TreeItem({ node, depth = 0 }: { node: CanvasNode; depth?: number }) {
  const { selectedIds, setSelectedIds } = useEditorStore();
  const isSelected = selectedIds.includes(node.id);
  return (
    <div className={styles.treeNode}>
      <div className={`${styles.treeItem} ${isSelected ? styles.selected : ""}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={(e) => { e.stopPropagation(); setSelectedIds([node.id]); }}>
        <span className={styles.treeIcon}>•</span>
        <span className={styles.treeLabel}>{node.type}</span>
      </div>
      {node.children.map((child) => (
        <TreeItem key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function LeftSidebar() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"frames" | "components" | "tree">("frames");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const {
    frames,
    activeFrameId,
    setActiveFrame,
    addFrame,
    updateFrame,
    duplicateFrame,
    deleteFrame,
  } = useEditorStore();

  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  const nodes = activeFrame?.children ?? [];

  const filteredCategories = COMPONENT_CATEGORIES.map((cat) => ({
    ...cat,
    components: cat.components.filter(
      (c) =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.type.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.components.length > 0);

  return (
    <div className={styles.sidebar}>
      <div className={styles.tabs}>
        {(["frames", "components", "tree"] as const).map((tab) => (
          <button key={tab} type="button"
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "frames" && (
        <div className={styles.frameList}>
          <button type="button" className={styles.addFrameBtn}
            onClick={() => addFrame()}>
            <span className={styles.addFrameIcon}>+</span>
            New Frame
          </button>
          {frames.map((frame) => (
            <div key={frame.id}
              className={`${styles.frameItem} ${activeFrameId === frame.id ? styles.frameActive : ""}`}
              onClick={() => setActiveFrame(frame.id)}>
              <div className={styles.frameItemMain}>
                <span className={styles.frameIcon}>⊞</span>
                <input
                  type="text"
                  value={frame.name}
                  onChange={(e) => updateFrame(frame.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className={styles.frameNameInput}
                />
              </div>
              <div className={styles.frameActions}>
                <button type="button" title="Duplicate"
                  onClick={(e) => { e.stopPropagation(); duplicateFrame(frame.id); }}>⎘</button>
                <button type="button" title="Delete"
                  onClick={(e) => { e.stopPropagation(); deleteFrame(frame.id); }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "components" && (
        <>
          <div className={styles.search}>
            <input type="search" placeholder="Search components..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput} />
          </div>
          {!activeFrame ? (
            <div className={styles.emptyHint}>Select or create a frame first</div>
          ) : (
            <div className={styles.componentList}>
              <button type="button" className={styles.iconLibraryBtn} onClick={() => setIconPickerOpen(true)}>
                <span className={styles.iconLibraryIcon}>◆</span>
                Browse Icon Library
              </button>
              {filteredCategories.map((cat) => (
                <div key={cat.label} className={styles.category}>
                  <div className={styles.categoryLabel}>{cat.label}</div>
                  {cat.components.map((c) => (
                    <DraggableComponent key={c.type} type={c.type} label={c.label} icon={c.icon} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconName) => {
          useEditorStore.getState().addNode({ type: "icon", props: { iconName } });
        }}
      />

      {activeTab === "tree" && (
        <div className={styles.treeView}>
          {!activeFrame ? (
            <div className={styles.emptyTree}>No frame selected</div>
          ) : nodes.length === 0 ? (
            <div className={styles.emptyTree}>No components in this frame</div>
          ) : (
            nodes.map((node) => <TreeItem key={node.id} node={node} />)
          )}
        </div>
      )}
    </div>
  );
}
