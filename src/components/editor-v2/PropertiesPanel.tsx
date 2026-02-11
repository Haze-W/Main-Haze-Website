"use client";

import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./PropertiesPanel.module.css";

function findNode(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

function updateProps(node: SceneNode, updateNode: (id: string, p: Partial<SceneNode>) => void, key: string, value: unknown) {
  updateNode(node.id, { props: { ...(node.props ?? {}), [key]: value } });
}

function ColorRow({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const hex = /^#[0-9A-Fa-f]{3,8}$/.test(value) ? value : "#888888";
  return (
    <div className={`${styles.colorRow} ${className ?? ""}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.colorInputWrap}>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorSwatch}
          title={value}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000 or currentColor"
          className={styles.colorText}
        />
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { nodes, selectedIds, updateNode } = useEditorStore();
  const selectedId = [...selectedIds][0];
  const node = selectedId ? findNode(nodes, selectedId) : null;

  if (!node) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>Properties</div>
        <div className={styles.empty}>Select an element to edit its properties</div>
      </div>
    );
  }

  const props = node.props ?? {};

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Properties</div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.label}>Name</div>
          <input
            type="text"
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.label}>Position</div>
          <div className={styles.row}>
            <input
              type="number"
              value={node.x}
              onChange={(e) => updateNode(node.id, { x: Number(e.target.value) })}
              placeholder="X"
            />
            <input
              type="number"
              value={node.y}
              onChange={(e) => updateNode(node.id, { y: Number(e.target.value) })}
              placeholder="Y"
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.label}>Size</div>
          <div className={styles.row}>
            <input
              type="number"
              value={node.width}
              onChange={(e) => updateNode(node.id, { width: Number(e.target.value) })}
              placeholder="W"
            />
            <input
              type="number"
              value={node.height}
              onChange={(e) => updateNode(node.id, { height: Number(e.target.value) })}
              placeholder="H"
            />
          </div>
        </div>

        {/* TEXT / HEADING / PARAGRAPH / LABEL */}
        {(node.type === "TEXT" || node.name === "Label") && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Content</div>
              <input
                type="text"
                value={(props.content as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "content", e.target.value)}
                placeholder="Text content"
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Typography</div>
              <div className={styles.row}>
                <input
                  type="number"
                  value={(props.fontSize as number) ?? 14}
                  onChange={(e) => updateProps(node, updateNode, "fontSize", Number(e.target.value))}
                  placeholder="Size"
                />
                <select
                  value={(props.fontWeight as string) ?? "normal"}
                  onChange={(e) => updateProps(node, updateNode, "fontWeight", e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="lighter">Light</option>
                </select>
              </div>
              <div className={styles.row} style={{ marginTop: 4 }}>
                <select
                  value={(props.textAlign as string) ?? "left"}
                  onChange={(e) => updateProps(node, updateNode, "textAlign", e.target.value)}
                  className={styles.select}
                >
                  <option value="left">Align Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <ColorRow
              label="Text color"
              value={(props.color as string) ?? "#e6edf3"}
              onChange={(v) => updateProps(node, updateNode, "color", v)}
            />
          </>
        )}

        {/* BUTTON */}
        {node.type === "BUTTON" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Button</div>
              <input
                type="text"
                value={(props.label as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "label", e.target.value)}
                placeholder="Label"
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Style</div>
              <div className={styles.row}>
                <select
                  value={(props.variant as string) ?? "primary"}
                  onChange={(e) => updateProps(node, updateNode, "variant", e.target.value)}
                  className={styles.select}
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="outline">Outline</option>
                  <option value="ghost">Ghost</option>
                  <option value="danger">Danger</option>
                  <option value="icon">Icon</option>
                </select>
                <select
                  value={(props.size as string) ?? "md"}
                  onChange={(e) => updateProps(node, updateNode, "size", e.target.value)}
                  className={styles.select}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={(props.disabled as boolean) ?? false}
                  onChange={(e) => updateProps(node, updateNode, "disabled", e.target.checked)}
                />
                Disabled
              </label>
            </div>
            <ColorRow
              label="Text color"
              value={(props.color as string) ?? "#e6edf3"}
              onChange={(v) => updateProps(node, updateNode, "color", v)}
            />
            <ColorRow
              label="Background"
              value={(props.backgroundColor as string) ?? ""}
              onChange={(v) => updateProps(node, updateNode, "backgroundColor", v || undefined)}
            />
          </>
        )}

        {/* INPUT / TEXTAREA / SEARCH */}
        {node.type === "INPUT" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Placeholder</div>
              <input
                type="text"
                value={(props.placeholder as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "placeholder", e.target.value)}
                placeholder="Placeholder text"
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Input Type</div>
              <select
                value={(props.type as string) ?? "text"}
                onChange={(e) => updateProps(node, updateNode, "type", e.target.value)}
                className={styles.select}
              >
                <option value="text">Text</option>
                <option value="password">Password</option>
                <option value="email">Email</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="time">Time</option>
              </select>
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={(props.disabled as boolean) ?? false}
                onChange={(e) => updateProps(node, updateNode, "disabled", e.target.checked)}
              />
              Disabled
            </label>
          </>
        )}

        {/* CHECKBOX / RADIO / SWITCH */}
        {node.type === "CHECKBOX" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Label</div>
              <input
                type="text"
                value={(props.label as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "label", e.target.value)}
                placeholder="Label"
              />
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={(props.checked as boolean) ?? false}
                onChange={(e) => updateProps(node, updateNode, "checked", e.target.checked)}
              />
              Checked
            </label>
          </>
        )}

        {/* SELECT */}
        {node.type === "SELECT" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Placeholder</div>
              <input
                type="text"
                value={(props.placeholder as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "placeholder", e.target.value)}
                placeholder="Select..."
              />
            </div>
          </>
        )}

        {/* ICON */}
        {node.type === "ICON" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Icon Name</div>
              <input
                type="text"
                value={(props.iconName as string) ?? "star"}
                onChange={(e) => updateProps(node, updateNode, "iconName", e.target.value)}
                placeholder="e.g. star, home"
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Size</div>
              <input
                type="number"
                value={(props.size as number) ?? 24}
                onChange={(e) => updateProps(node, updateNode, "size", Number(e.target.value))}
                placeholder="24"
              />
            </div>
            <ColorRow
              label="Icon color"
              value={(props.color as string) ?? "currentColor"}
              onChange={(v) => updateProps(node, updateNode, "color", v || "currentColor")}
            />
          </>
        )}

        {/* IMAGE */}
        {node.type === "IMAGE" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Image URL</div>
              <input
                type="text"
                value={(props.src as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "src", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Alt Text</div>
              <input
                type="text"
                value={(props.alt as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "alt", e.target.value)}
                placeholder="Description"
              />
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={(props.rounded as boolean) ?? false}
                onChange={(e) => updateProps(node, updateNode, "rounded", e.target.checked)}
              />
              Rounded (Avatar)
            </label>
          </>
        )}

        {/* RECTANGLE */}
        {node.type === "RECTANGLE" && (
          <>
            <ColorRow
              label="Fill"
              value={(props.backgroundColor as string) ?? "#30363d"}
              onChange={(v) => updateProps(node, updateNode, "backgroundColor", v)}
            />
            <ColorRow
              label="Border"
              value={(props.borderColor as string) ?? "#30363d"}
              onChange={(v) => updateProps(node, updateNode, "borderColor", v)}
            />
          </>
        )}

        {/* FRAME */}
        {node.type === "FRAME" && (
          <>
            <ColorRow
              label="Background"
              value={(props.backgroundColor as string) ?? "#181c22"}
              onChange={(v) => updateProps(node, updateNode, "backgroundColor", v)}
            />
            <div className={styles.section}>
              <div className={styles.label}>Frame</div>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={node.overflow === "HIDDEN"}
                  onChange={(e) => updateNode(node.id, { overflow: e.target.checked ? "HIDDEN" : "VISIBLE" })}
                />
                Clip content
              </label>
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Layout</div>
              <select
                value={node.layoutMode ?? "NONE"}
                onChange={(e) => updateNode(node.id, { layoutMode: e.target.value as "NONE" | "HORIZONTAL" | "VERTICAL" })}
                className={styles.select}
              >
                <option value="NONE">None</option>
                <option value="HORIZONTAL">Horizontal</option>
                <option value="VERTICAL">Vertical</option>
              </select>
            </div>
          </>
        )}

        {/* PANEL */}
        {node.type === "PANEL" && (
          <div className={styles.section}>
            <div className={styles.label}>Panel Title</div>
            <input
              type="text"
              value={(props.title as string) ?? ""}
              onChange={(e) => updateProps(node, updateNode, "title", e.target.value)}
              placeholder="Panel"
            />
          </div>
        )}

        {/* PROGRESS / BADGE / ALERT */}
        {node.type === "CONTAINER" && (
          <>
            {(props.variant === "progress" || node.name === "Progress Bar" || node.name === "Progress") && (
              <div className={styles.section}>
                <div className={styles.label}>Value (%)</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={(props.value as number) ?? 60}
                  onChange={(e) => updateProps(node, updateNode, "value", Number(e.target.value))}
                />
              </div>
            )}
            {["Badge", "Tag"].some((n) => node.name.includes(n)) && (
              <>
                <div className={styles.section}>
                  <div className={styles.label}>Content</div>
                  <input
                    type="text"
                    value={(props.content as string) ?? ""}
                    onChange={(e) => updateProps(node, updateNode, "content", e.target.value)}
                    placeholder="Badge text"
                  />
                </div>
                <ColorRow
                  label="Background"
                  value={(props.backgroundColor as string) ?? "var(--accent)"}
                  onChange={(v) => updateProps(node, updateNode, "backgroundColor", v)}
                />
                <ColorRow
                  label="Text color"
                  value={(props.color as string) ?? "#ffffff"}
                  onChange={(v) => updateProps(node, updateNode, "color", v)}
                />
              </>
            )}
            {node.name === "Alert" && (
              <>
                <div className={styles.section}>
                  <div className={styles.label}>Message</div>
                  <input
                    type="text"
                    value={(props.content as string) ?? ""}
                    onChange={(e) => updateProps(node, updateNode, "content", e.target.value)}
                    placeholder="Alert message"
                  />
                </div>
                <div className={styles.section}>
                  <div className={styles.label}>Variant</div>
                  <select
                    value={(props.variant as string) ?? "info"}
                    onChange={(e) => updateProps(node, updateNode, "variant", e.target.value)}
                    className={styles.select}
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}

        {/* Appearance (shared) */}
        <div className={styles.section}>
          <div className={styles.label}>Opacity</div>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round((node.opacity ?? 1) * 100)}
            onChange={(e) => updateNode(node.id, { opacity: Number(e.target.value) / 100 })}
            placeholder="100"
          />
        </div>
      </div>
    </div>
  );
}
