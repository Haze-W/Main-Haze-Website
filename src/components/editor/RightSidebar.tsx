"use client";

import { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { IconPickerModal } from "./IconPickerModal";
import styles from "./RightSidebar.module.css";

function findNode(nodes: import("@/lib/types").CanvasNode[], id: string): import("@/lib/types").CanvasNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

export function RightSidebar() {
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const { frames, activeFrameId, selectedIds, updateNode, updateFrame } = useEditorStore();
  const activeFrame = frames.find((f) => f.id === activeFrameId) ?? frames[0];
  const nodes = activeFrame?.children ?? [];
  const selectedId = selectedIds[0];
  const node = selectedId ? findNode(nodes, selectedId) : null;

  if (!node) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.header}>Properties</div>
        <div className={styles.content}>
          {activeFrame && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Frame</div>
              <div className={styles.row}>
                <label>Name</label>
                <input
                  type="text"
                  value={activeFrame.name}
                  onChange={(e) => updateFrame(activeFrame.id, { name: e.target.value })}
                />
              </div>
              <div className={styles.row}>
                <label>Width</label>
                <input
                  type="number"
                  value={activeFrame.width}
                  onChange={(e) => updateFrame(activeFrame.id, { width: Number(e.target.value) })}
                />
              </div>
              <div className={styles.row}>
                <label>Height</label>
                <input
                  type="number"
                  value={activeFrame.height}
                  onChange={(e) => updateFrame(activeFrame.id, { height: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
          <div className={styles.empty}>
            Select a component to edit its properties
          </div>
        </div>
      </div>
    );
  }

  const props = node.props ?? {};
  const layout = node.layout ?? { x: 0, y: 0, width: 100, height: 40 };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>Properties</div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Layout</div>
          <div className={styles.row}>
            <label>X</label>
            <input
              type="number"
              value={layout.x}
              onChange={(e) =>
                updateNode(node.id, {
                  layout: { ...layout, x: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className={styles.row}>
            <label>Y</label>
            <input
              type="number"
              value={layout.y}
              onChange={(e) =>
                updateNode(node.id, {
                  layout: { ...layout, y: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className={styles.row}>
            <label>Width</label>
            <input
              type="number"
              value={layout.width}
              onChange={(e) =>
                updateNode(node.id, {
                  layout: { ...layout, width: Number(e.target.value) },
                })
              }
            />
          </div>
          <div className={styles.row}>
            <label>Height</label>
            <input
              type="number"
              value={layout.height}
              onChange={(e) =>
                updateNode(node.id, {
                  layout: { ...layout, height: Number(e.target.value) },
                })
              }
            />
          </div>
        </div>

        {node.type === "text" && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Text</div>
            <div className={styles.row}>
              <label>Content</label>
              <input
                type="text"
                value={(props.content as string) ?? ""}
                onChange={(e) =>
                  updateNode(node.id, { props: { ...props, content: e.target.value } })
                }
              />
            </div>
            <div className={styles.row}>
              <label>Font size</label>
              <input
                type="number"
                value={(props.fontSize as number) ?? 14}
                onChange={(e) =>
                  updateNode(node.id, {
                    props: { ...props, fontSize: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        )}

        {node.type === "button" && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Button</div>
            <div className={styles.row}>
              <label>Label</label>
              <input
                type="text"
                value={(props.label as string) ?? ""}
                onChange={(e) =>
                  updateNode(node.id, { props: { ...props, label: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {node.type === "input" && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Input</div>
            <div className={styles.row}>
              <label>Placeholder</label>
              <input
                type="text"
                value={(props.placeholder as string) ?? ""}
                onChange={(e) =>
                  updateNode(node.id, {
                    props: { ...props, placeholder: e.target.value },
                  })
                }
              />
            </div>
          </div>
        )}

        {node.type === "panel" && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Panel</div>
            <div className={styles.row}>
              <label>Title</label>
              <input
                type="text"
                value={(props.title as string) ?? ""}
                onChange={(e) =>
                  updateNode(node.id, { props: { ...props, title: e.target.value } })
                }
              />
            </div>
          </div>
        )}

        {node.type === "icon" && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Icon</div>
            <div className={styles.row}>
              <label>Icon</label>
              <button
                type="button"
                className={styles.iconPickerBtn}
                onClick={() => setIconPickerOpen(true)}
              >
                Change Icon
              </button>
            </div>
            <div className={styles.row}>
              <label>Size</label>
              <input
                type="number"
                value={(props.size as number) ?? 24}
                onChange={(e) =>
                  updateNode(node.id, {
                    props: { ...props, size: Number(e.target.value) },
                    layout: { ...layout, width: Number(e.target.value), height: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className={styles.row}>
              <label>Color</label>
              <input
                type="text"
                value={(props.color as string) ?? "currentColor"}
                onChange={(e) =>
                  updateNode(node.id, { props: { ...props, color: e.target.value } })
                }
              />
            </div>
            <div className={styles.row}>
              <label>Stroke</label>
              <input
                type="number"
                min={0.5}
                max={3}
                step={0.5}
                value={(props.strokeWidth as number) ?? 2}
                onChange={(e) =>
                  updateNode(node.id, {
                    props: { ...props, strokeWidth: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        )}

        {(node.type === "frame" || node.type === "container") && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Flex</div>
            <div className={styles.row}>
              <label>Direction</label>
              <select
                value={(layout.flexDirection as string) ?? "column"}
                onChange={(e) =>
                  updateNode(node.id, {
                    layout: {
                      ...layout,
                      flexDirection: e.target.value as "row" | "column",
                    },
                  })
                }
              >
                <option value="column">Column</option>
                <option value="row">Row</option>
              </select>
            </div>
            <div className={styles.row}>
              <label>Gap</label>
              <input
                type="number"
                value={(layout.gap as number) ?? 8}
                onChange={(e) =>
                  updateNode(node.id, {
                    layout: { ...layout, gap: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className={styles.row}>
              <label>Padding</label>
              <input
                type="number"
                value={(layout.padding as number) ?? 16}
                onChange={(e) =>
                  updateNode(node.id, {
                    layout: { ...layout, padding: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {node?.type === "icon" && (
        <IconPickerModal
          isOpen={iconPickerOpen}
          onClose={() => setIconPickerOpen(false)}
          onSelect={(iconName) => {
            if (node) updateNode(node.id, { props: { ...node.props, iconName } });
            setIconPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
