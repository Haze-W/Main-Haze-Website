"use client";

import dynamic from "next/dynamic";
import { useDraggable } from "@dnd-kit/core";
import type { CanvasNode as CanvasNodeType } from "@/lib/types";
import { useEditorStore } from "@/lib/editor-store";
import { getValidIconName } from "@/lib/icon-valid";
import styles from "./CanvasNode.module.css";

const DynamicLucideIcon = dynamic(
  () => import("lucide-react/dynamic").then((m) => m.DynamicIcon),
  { ssr: false }
);

function getComponentStyles(node: CanvasNodeType): React.CSSProperties {
  const layout = node.layout ?? { x: 0, y: 0, width: 100, height: 40 };
  return {
    position: "absolute",
    left: layout.x,
    top: layout.y,
    width: layout.width,
    height: layout.height,
  };
}

function renderComponentContent(node: CanvasNodeType) {
  const props = node.props ?? {};

  switch (node.type) {
    case "frame":
    case "container":
      return (
        <div
          className={styles.frame}
          style={{
            display: "flex",
            flexDirection: (node.layout?.flexDirection as React.CSSProperties["flexDirection"]) ?? "column",
            gap: node.layout?.gap ?? 8,
            padding: node.layout?.padding ?? 16,
            alignItems: (node.layout?.alignItems as React.CSSProperties["alignItems"]) ?? "flex-start",
            justifyContent: (node.layout?.justifyContent as React.CSSProperties["justifyContent"]) ?? "flex-start",
          }}
        >
          {node.children.map((child) => (
            <CanvasNode key={child.id} node={child} isSelected={false} />
          ))}
        </div>
      );
    case "text":
      return (
        <span className={styles.text} style={{ fontSize: (props.fontSize as number) ?? 14 }}>
          {(props.content as string) ?? "Text"}
        </span>
      );
    case "button":
      return (
        <button type="button" className={styles.button}>
          {(props.label as string) ?? "Button"}
        </button>
      );
    case "input":
      return (
        <input
          type="text"
          className={styles.input}
          placeholder={(props.placeholder as string) ?? "Placeholder..."}
          readOnly
        />
      );
    case "panel":
      return (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>{(props.title as string) ?? "Panel"}</div>
          <div className={styles.panelBody}>
            {node.children.map((child) => (
              <CanvasNode key={child.id} node={child} isSelected={false} />
            ))}
          </div>
        </div>
      );
    case "image":
      return <div className={styles.image}>🖼</div>;
    case "icon": {
      const iconName = getValidIconName((props.iconName as string) ?? "star");
      const iconSize = (props.size as number) ?? 24;
      const iconColor = (props.color as string) ?? "currentColor";
      const strokeWidth = (props.strokeWidth as number) ?? 2;
      return (
        <div className={styles.iconWrapper} style={{ color: iconColor }}>
          <DynamicLucideIcon
            name={iconName as React.ComponentProps<typeof DynamicLucideIcon>["name"]}
            size={iconSize}
            strokeWidth={strokeWidth}
            fallback={() => <span style={{ fontSize: iconSize, color: iconColor }}>◆</span>}
          />
        </div>
      );
    }
    case "list":
      return <div className={styles.list}>List</div>;
    case "checkbox":
      return <div className={styles.checkbox}>☐ Label</div>;
    case "select":
      return <div className={styles.select}>Select ▼</div>;
    default:
      return <div className={styles.placeholder}>{node.type}</div>;
  }
}

export function CanvasNode({
  node,
  isSelected,
}: {
  node: CanvasNodeType;
  isSelected: boolean;
}) {
  const { setSelectedIds } = useEditorStore();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: node.id,
    data: { node },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.node} ${isSelected ? styles.selected : ""}`}
      style={getComponentStyles(node)}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedIds([node.id]);
      }}
    >
      {renderComponentContent(node)}
    </div>
  );
}
