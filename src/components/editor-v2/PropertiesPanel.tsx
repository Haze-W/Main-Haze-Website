"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import { Image, Palette } from "lucide-react";
import { ColorPickerPopover } from "@/components/editor/ColorPickerPopover";
import { TopBarConfigPanel } from "./TopBarConfigPanel";
import type { Paint } from "@/lib/figma/types";
import styles from "./PropertiesPanel.module.css";

function findNode(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

function updateProps(
  node: SceneNode,
  updateNode: (id: string, p: Partial<SceneNode>) => void,
  key: string,
  value: unknown
) {
  updateNode(node.id, { props: { ...(node.props ?? {}), [key]: value } });
}

type FillMode = "solid" | "gradient" | "image";

function PageColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<FillMode>(() => {
    if (value.startsWith("url(")) return "image";
    if (value.includes("gradient")) return "gradient";
    return "solid";
  });
  const [gradientAngle, setGradientAngle] = useState(90);
  const [gradientFrom, setGradientFrom] = useState("#5e5ce6");
  const [gradientTo, setGradientTo] = useState("#ff6b6b");
  const [imageUrl, setImageUrl] = useState(value.startsWith("url(") ? value.replace(/^url\(["']?|["']?\)$/g, "") : "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSolidChange = (v: string) => {
    onChange(v);
    setMode("solid");
  };

  const handleGradientApply = () => {
    const g = `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;
    onChange(g);
    setMode("gradient");
  };

  const handleImageUrl = (url: string) => {
    setImageUrl(url);
    onChange(url ? `url("${url}")` : "#1e1e1e");
    setMode("image");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    handleImageUrl(url);
    e.target.value = "";
  };

  return (
    <div className={styles.colorRow}>
      <div className={styles.label}>{label}</div>
      <div className={styles.colorPickerModern}>
        <div className={styles.colorPickerTabs}>
          {(["solid", "gradient", "image"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.colorTab} ${mode === m ? styles.colorTabActive : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "solid" && <Palette size={12} />}
              {m === "gradient" && "G"}
              {m === "image" && <Image size={12} aria-hidden />}
            </button>
          ))}
        </div>

        {mode === "solid" && (
          <ColorPickerInline value={value} onChange={handleSolidChange} />
        )}

        {mode === "gradient" && (
          <div className={styles.colorGradientRow}>
            <div className={styles.gradientInputs}>
              <div className={styles.gradientAngle}>
                <span>Angle</span>
                <input
                  type="number"
                  min={0}
                  max={360}
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                  className={styles.gradientAngleInput}
                />
              </div>
              <div className={styles.gradientStops}>
                <GradientStopPicker
                  label="From"
                  value={gradientFrom}
                  onChange={setGradientFrom}
                />
                <GradientStopPicker
                  label="To"
                  value={gradientTo}
                  onChange={setGradientTo}
                />
              </div>
            </div>
            <button type="button" className={styles.gradientApplyBtn} onClick={handleGradientApply}>
              Apply
            </button>
          </div>
        )}

        {mode === "image" && (
          <div className={styles.colorImageRow}>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => handleImageUrl(e.target.value)}
              placeholder="Image URL"
              className={styles.colorImageUrl}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className={styles.colorFileInput}
            />
            <button
              type="button"
              className={styles.colorUploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GradientStopPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hex = /^#[0-9A-Fa-f]{3,8}$/.test(value) ? value : "#888888";
  return (
    <div className={styles.gradientStop}>
      <span className={styles.gradientStopLabel}>{label}</span>
      <button
        type="button"
        className={styles.gradientStopSwatch}
        style={{ background: hex }}
        onClick={(e) => setAnchor((a) => (a ? null : e.currentTarget))}
      />
      {anchor && (
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          anchor={anchor}
          onClose={() => setAnchor(null)}
        />
      )}
    </div>
  );
}

function ColorPickerInline({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hex = /^#[0-9A-Fa-f]{3,8}$/.test(value) ? value : "#888888";
  return (
    <div className={styles.colorSolidRow}>
      <button
        type="button"
        className={styles.colorSwatchBtn}
        style={{ background: hex }}
        onClick={(e) => setAnchor((a) => (a ? null : e.currentTarget))}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className={styles.colorHexInput}
      />
      {anchor && (
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          anchor={anchor}
          onClose={() => setAnchor(null)}
        />
      )}
    </div>
  );
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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hex = /^#[0-9A-Fa-f]{3,8}$/.test(value) ? value : "#888888";
  return (
    <div className={`${styles.colorRow} ${className ?? ""}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.colorInputWrap}>
        <button
          type="button"
          className={styles.colorSwatchBtn}
          style={{ background: hex }}
          onClick={(e) => setAnchor((a) => (a ? null : e.currentTarget))}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className={styles.colorText}
        />
      </div>
      {anchor && (
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          anchor={anchor}
          onClose={() => setAnchor(null)}
        />
      )}
    </div>
  );
}

function FigmaProperties({
  node,
  updateNode,
}: {
  node: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  const figma = node.props?._figma as {
    fills: Paint[];
    strokes: Paint[];
    strokeWeight: number;
    originalType: string;
    [k: string]: unknown;
  } | undefined;

  if (!figma) return null;

  const props = node.props ?? {};
  const isText = figma.originalType === "TEXT";
  const isFrame =
    figma.originalType === "FRAME" ||
    figma.originalType === "GROUP" ||
    figma.originalType === "COMPONENT" ||
    figma.originalType === "INSTANCE";

  const updateFigmaProp = (key: string, val: unknown) => {
    const current = (node.props?._figma ?? {}) as Record<string, unknown>;
    updateNode(node.id, { props: { ...(node.props ?? {}), _figma: { ...current, [key]: val } } });
  };

  const fillHex = figma.fills?.[0]?.hex ?? "#000000";
  const fillAlpha = figma.fills?.[0]?.alpha ?? 1;
  const strokeHex = figma.strokes?.[0]?.hex ?? "#000000";
  const strokeAlpha = figma.strokes?.[0]?.alpha ?? 1;

  return (
    <>
      <ColorRow
        label="Fill"
        value={fillHex}
        onChange={(v) => {
          const newFills: Paint[] = [{ hex: v, alpha: fillAlpha }];
          updateFigmaProp("fills", newFills);
        }}
      />

      <div className={styles.section}>
        <div className={styles.label}>Fill opacity</div>
        <div className={styles.inputGroup}>
          <span className={styles.inputPrefix}>%</span>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(fillAlpha * 100)}
            onChange={(e) => {
              const a = Number(e.target.value) / 100;
              const newFills: Paint[] = [{ hex: fillHex, alpha: a }];
              updateFigmaProp("fills", newFills);
            }}
          />
        </div>
      </div>

      {figma.strokes && figma.strokes.length > 0 && (
        <>
          <ColorRow
            label="Stroke"
            value={strokeHex}
            onChange={(v) => {
              const newStrokes: Paint[] = [{ hex: v, alpha: strokeAlpha }];
              updateFigmaProp("strokes", newStrokes);
            }}
          />
          <div className={styles.section}>
            <div className={styles.label}>Stroke weight</div>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>px</span>
              <input
                type="number"
                min={0}
                value={figma.strokeWeight ?? 0}
                onChange={(e) => updateFigmaProp("strokeWeight", Number(e.target.value))}
              />
            </div>
          </div>
        </>
      )}

      {isText && (
        <>
          <div className={styles.section}>
            <div className={styles.label}>Content</div>
            <input
              type="text"
              className={styles.standaloneInput}
              value={(props.content as string) ?? ""}
              onChange={(e) => updateNode(node.id, { props: { ...props, content: e.target.value } })}
              placeholder="Text content"
            />
          </div>
          <div className={styles.section}>
            <div className={styles.label}>Typography</div>
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <span className={styles.inputPrefix}>Size</span>
                <input
                  type="number"
                  value={(props.fontSize as number) ?? 16}
                  onChange={(e) => updateNode(node.id, { props: { ...props, fontSize: Number(e.target.value) } })}
                />
              </div>
              <select
                value={(props.fontWeight as string) ?? "400"}
                onChange={(e) => updateNode(node.id, { props: { ...props, fontWeight: e.target.value } })}
                className={styles.select}
              >
                <option value="100">Thin</option>
                <option value="200">Extra Light</option>
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semi Bold</option>
                <option value="700">Bold</option>
                <option value="800">Extra Bold</option>
                <option value="900">Black</option>
              </select>
            </div>
            <div className={styles.row} style={{ marginTop: 4 }}>
              <select
                value={(props.textAlign as string) ?? "left"}
                onChange={(e) => updateNode(node.id, { props: { ...props, textAlign: e.target.value } })}
                className={styles.select}
              >
                <option value="left">Align Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className={styles.row} style={{ marginTop: 4 }}>
              <div className={styles.inputGroup}>
                <span className={styles.inputPrefix}>Spacing</span>
                <input
                  type="number"
                  value={(props.letterSpacing as number) ?? 0}
                  onChange={(e) => updateNode(node.id, { props: { ...props, letterSpacing: Number(e.target.value) } })}
                />
              </div>
              <div className={styles.inputGroup}>
                <span className={styles.inputPrefix}>Line H</span>
                <input
                  type="text"
                  value={String((props.lineHeight as string | number) ?? "auto")}
                  onChange={(e) => updateNode(node.id, { props: { ...props, lineHeight: e.target.value } })}
                />
              </div>
            </div>
          </div>
          {props._textFills && (props._textFills as Paint[]).length > 0 && (
            <ColorRow
              label="Text color"
              value={(props._textFills as Paint[])[0].hex ?? "#000000"}
              onChange={(v) => {
                const f = (props._textFills as Paint[])[0];
                const alpha = f.alpha ?? f.opacity ?? 1;
                updateNode(node.id, { props: { ...props, _textFills: [{ hex: v, alpha }] } });
              }}
            />
          )}
        </>
      )}

      {isFrame && (
        <div className={styles.section}>
          <div className={styles.label}>Layout</div>
          <select
            value={node.layoutMode ?? "NONE"}
            onChange={(e) => updateNode(node.id, { layoutMode: e.target.value as "NONE" | "HORIZONTAL" | "VERTICAL" })}
            className={styles.select}
          >
            <option value="NONE">Absolute</option>
            <option value="HORIZONTAL">Horizontal</option>
            <option value="VERTICAL">Vertical</option>
          </select>
          {node.layoutMode && node.layoutMode !== "NONE" && (
            <>
              <div className={styles.row} style={{ marginTop: 4 }}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>Gap</span>
                  <input
                    type="number"
                    value={node.itemSpacing ?? 0}
                    onChange={(e) => updateNode(node.id, { itemSpacing: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className={styles.row} style={{ marginTop: 4 }}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>T</span>
                  <input type="number" value={node.paddingTop ?? 0} onChange={(e) => updateNode(node.id, { paddingTop: Number(e.target.value) })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>R</span>
                  <input type="number" value={node.paddingRight ?? 0} onChange={(e) => updateNode(node.id, { paddingRight: Number(e.target.value) })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>B</span>
                  <input type="number" value={node.paddingBottom ?? 0} onChange={(e) => updateNode(node.id, { paddingBottom: Number(e.target.value) })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>L</span>
                  <input type="number" value={node.paddingLeft ?? 0} onChange={(e) => updateNode(node.id, { paddingLeft: Number(e.target.value) })} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.label}>Rotation</div>
        <div className={styles.inputGroup}>
          <span className={styles.inputPrefix}>deg</span>
          <input
            type="number"
            value={node.rotation ?? 0}
            onChange={(e) => updateNode(node.id, { rotation: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className={styles.section}>
        <label className={styles.checkboxModern}>
          <div className={styles.checkboxTrack}>
            <input
              type="checkbox"
              checked={node.visible !== false}
              onChange={(e) => updateNode(node.id, { visible: e.target.checked })}
              className={styles.checkboxInput}
            />
            <span className={styles.checkboxThumb} />
          </div>
          <span>Visible</span>
        </label>
      </div>
    </>
  );
}

function CanvasProperties() {
  const canvasBg = useEditorStore((s) => s.canvasBg);
  const setCanvasBg = useEditorStore((s) => s.setCanvasBg);
  const showGrid = useEditorStore((s) => s.showGrid);
  const setShowGrid = useEditorStore((s) => s.setShowGrid);
  const gridType = useEditorStore((s) => s.gridType);
  const setGridType = useEditorStore((s) => s.setGridType);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Page</div>
      <div className={styles.content}>
        <PageColorPicker label="Background" value={canvasBg} onChange={setCanvasBg} />

        <div className={styles.section}>
          <label className={styles.checkboxModern}>
            <div className={styles.checkboxTrack}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxThumb} />
            </div>
            <span>Show grid</span>
          </label>
        </div>

        {showGrid && (
          <div className={styles.section}>
            <div className={styles.label}>Grid style</div>
            <div className={styles.gridTypeGrid}>
              {(["dots", "lines", "cross", "none"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.gridTypeBtn} ${gridType === t ? styles.gridTypeBtnActive : ""}`}
                  onClick={() => setGridType(t)}
                >
                  {t === "dots" && <span className={styles.gridPreviewDots} />}
                  {t === "lines" && <span className={styles.gridPreviewLines} />}
                  {t === "cross" && <span className={styles.gridPreviewCross} />}
                  {t === "none" && "None"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { nodes, selectedIds, updateNode } = useEditorStore();
  const selectedId = [...selectedIds][0];
  const node = selectedId ? findNode(nodes, selectedId) : null;

  if (!node) {
    return <CanvasProperties />;
  }

  if (node.type === "TOPBAR") {
    return <TopBarConfigPanel nodeId={node.id} />;
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
            className={styles.standaloneInput}
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.label}>Position</div>
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>X</span>
              <input
                type="number"
                value={Math.round(node.x)}
                onChange={(e) => updateNode(node.id, { x: Number(e.target.value) })}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>Y</span>
              <input
                type="number"
                value={Math.round(node.y)}
                onChange={(e) => updateNode(node.id, { y: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.label}>Size</div>
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>W</span>
              <input
                type="number"
                value={Math.round(node.width)}
                onChange={(e) => updateNode(node.id, { width: Number(e.target.value) })}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>H</span>
              <input
                type="number"
                value={Math.round(node.height)}
                onChange={(e) => updateNode(node.id, { height: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {(node.type === "TEXT" || node.name === "Label") && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Content</div>
              <input
                type="text"
                className={styles.standaloneInput}
                value={(props.content as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "content", e.target.value)}
                placeholder="Text content"
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Typography</div>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>Size</span>
                  <input
                    type="number"
                    value={(props.fontSize as number) ?? 14}
                    onChange={(e) => updateProps(node, updateNode, "fontSize", Number(e.target.value))}
                  />
                </div>
                <select
                  value={(props.fontWeight as string) ?? "normal"}
                  onChange={(e) => updateProps(node, updateNode, "fontWeight", e.target.value)}
                  className={styles.select}
                >
                  <option value="normal">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="bold">Bold</option>
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
              value={(props.color as string) ?? "#ffffff"}
              onChange={(v) => updateProps(node, updateNode, "color", v)}
            />
          </>
        )}

        {node.type === "BUTTON" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Label</div>
              <input
                type="text"
                className={styles.standaloneInput}
                value={(props.label as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "label", e.target.value)}
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Variant & Size</div>
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
            </div>
            <ColorRow
              label="Text color"
              value={(props.color as string) ?? "#ffffff"}
              onChange={(v) => updateProps(node, updateNode, "color", v)}
            />
            <ColorRow
              label="Background"
              value={(props.backgroundColor as string) ?? ""}
              onChange={(v) => updateProps(node, updateNode, "backgroundColor", v || undefined)}
            />
          </>
        )}

        {node.type === "INPUT" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Placeholder</div>
              <input
                type="text"
                className={styles.standaloneInput}
                value={(props.placeholder as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "placeholder", e.target.value)}
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Type</div>
              <select
                value={(props.type as string) ?? "text"}
                onChange={(e) => updateProps(node, updateNode, "type", e.target.value)}
                className={styles.select}
              >
                <option value="text">Text</option>
                <option value="password">Password</option>
                <option value="email">Email</option>
                <option value="number">Number</option>
              </select>
            </div>
          </>
        )}

        {(node.type === "RECTANGLE" || node.type === "FRAME") && (
          <>
            <ColorRow
              label="Fill"
              value={(props.backgroundColor as string) ?? (node.type === "FRAME" ? "#000000" : "#1c1c1e")}
              onChange={(v) => updateProps(node, updateNode, "backgroundColor", v)}
            />
            <ColorRow
              label="Border"
              value={(props.borderColor as string) ?? "#30363d"}
              onChange={(v) => updateProps(node, updateNode, "borderColor", v)}
            />
            {node.type === "FRAME" && (
              <div className={styles.section}>
                <div className={styles.label}>Layout</div>
                <select
                  value={node.layoutMode ?? "NONE"}
                  onChange={(e) => updateNode(node.id, { layoutMode: e.target.value as "NONE" | "HORIZONTAL" | "VERTICAL" })}
                  className={styles.select}
                >
                  <option value="NONE">Absolute</option>
                  <option value="HORIZONTAL">Horizontal</option>
                  <option value="VERTICAL">Vertical</option>
                </select>
              </div>
            )}
          </>
        )}

        {node.type === "ICON" && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Icon Name</div>
              <input
                type="text"
                className={styles.standaloneInput}
                value={(props.iconName as string) ?? "star"}
                onChange={(e) => updateProps(node, updateNode, "iconName", e.target.value)}
              />
            </div>
            <ColorRow
              label="Color"
              value={(props.color as string) ?? "currentColor"}
              onChange={(v) => updateProps(node, updateNode, "color", v)}
            />
          </>
        )}

        {!!props._figma && (
          <FigmaProperties node={node} updateNode={updateNode} />
        )}

        <div className={styles.section}>
          <div className={styles.label}>Opacity</div>
          <div className={styles.inputGroup}>
            <span className={styles.inputPrefix}>%</span>
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round((node.opacity ?? 1) * 100)}
              onChange={(e) => updateNode(node.id, { opacity: Number(e.target.value) / 100 })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
