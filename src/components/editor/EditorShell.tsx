"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ComponentType } from "@/lib/types";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { Canvas } from "./Canvas";
import { RightSidebar } from "./RightSidebar";
import { CodePanel } from "./CodePanel";
import { SettingsPanel } from "./SettingsPanel";
import { useEditorStore } from "@/lib/editor-store";
import styles from "./EditorShell.module.css";

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

export function EditorShell() {
  const { addNode, selectedIds, deleteNode, undo, redo, nudgeNode, frames, activeFrameId, setActiveFrame } = useEditorStore();
  const [activeType, setActiveType] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!activeFrameId && frames[0]) setActiveFrame(frames[0].id);
  }, [activeFrameId, frames, setActiveFrame]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") document.body.style.cursor = "grab";
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          selectedIds.forEach((id) => deleteNode(id));
        }
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
      }
      const step = e.shiftKey ? 10 : 5;
      if (!["INPUT", "TEXTAREA"].includes((document.activeElement as HTMLElement)?.tagName)) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIds.forEach((id) => nudgeNode(id, 0, -step));
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIds.forEach((id) => nudgeNode(id, 0, step));
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          selectedIds.forEach((id) => nudgeNode(id, -step, 0));
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          selectedIds.forEach((id) => nudgeNode(id, step, 0));
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") document.body.style.cursor = "";
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.body.style.cursor = "";
    };
  }, [selectedIds, deleteNode, undo, redo, nudgeNode]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    const type = data?.type;
    setActiveType(type === "icon" ? "icon" : (type as ComponentType) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveType(null);
    if (!event.over) return;
    const data = event.active.data.current as { type?: string; iconName?: string } | undefined;
    const type = data?.type;
    if (event.over.id === "canvas-drop" && type) {
      if (type === "icon") {
        addNode({ type: "icon" as ComponentType, props: { iconName: data.iconName ?? "star" } });
      } else {
        const paletteType = String(event.active.id).startsWith("palette-")
          ? String(event.active.id).replace("palette-", "")
          : type;
        if (paletteType && ["frame","container","panel","text","button","image","input","checkbox","select","list","icon","heading","divider","spacer","textarea","dropdown","slider","progress","table","card","titlebar","menubar","modal","toast"].includes(paletteType)) {
          addNode({ type: paletteType as ComponentType, props: {} });
        }
      }
    }
  };

  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const { mode, setMode } = useEditorStore();

  const getOverlayLabel = () => {
    if (!activeType) return "";
    const labels: Record<string, string> = {
      frame: "Frame",
      container: "Container",
      panel: "Panel",
      text: "Text",
      button: "Button",
      input: "Input",
      image: "Image",
      list: "List",
      checkbox: "Checkbox",
      select: "Select",
    };
    return labels[activeType] ?? activeType;
  };

  const getOverlayIcon = () => {
    if (!activeType) return "◆";
    const icons: Record<string, string> = {
      frame: "⊞",
      container: "▦",
      panel: "▤",
      text: "T",
      button: "⬚",
      input: "▭",
      image: "🖼",
      list: "≡",
      checkbox: "☐",
      select: "▼",
    };
    return icons[activeType] ?? "◆";
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className={styles.shell}>
      <TopBar />
      <div className={styles.content}>
        <div
          className={styles.leftPanel}
          style={{ width: leftWidth }}
        >
          <LeftSidebar />
          <div
            className={styles.resizeHandle}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = leftWidth;
              const onMove = (move: MouseEvent) => {
                const delta = move.clientX - startX;
                setLeftWidth(Math.min(400, Math.max(200, startW + delta)));
              };
              const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
              };
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
            }}
          />
        </div>
        <div className={styles.centerArea}>
          {mode === "design" && <Canvas />}
          {mode === "code" && <CodePanel />}
          {mode === "settings" && <SettingsPanel />}
        </div>
        {mode === "design" && (
          <div
            className={styles.rightPanel}
            style={{ width: rightWidth }}
          >
            <div
              className={styles.resizeHandleLeft}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = rightWidth;
                const onMove = (move: MouseEvent) => {
                  const delta = startX - move.clientX;
                  setRightWidth(Math.min(400, Math.max(240, startW + delta)));
                };
                const onUp = () => {
                  document.removeEventListener("mousemove", onMove);
                  document.removeEventListener("mouseup", onUp);
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                };
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            />
            <RightSidebar />
          </div>
        )}
      </div>
    </div>
    <DragOverlay dropAnimation={dropAnimation}>
      {activeType ? (
        <div className={styles.dragOverlay}>
          <span className={styles.dragOverlayIcon}>{getOverlayIcon()}</span>
          <span>{getOverlayLabel()}</span>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
