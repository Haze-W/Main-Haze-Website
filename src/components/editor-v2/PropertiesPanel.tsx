"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import { Image, Palette, Plus, Trash2, ChevronDown, Zap } from "lucide-react";
import { ColorPickerPopover } from "@/components/editor/ColorPickerPopover";
import { TopBarConfigPanel } from "./TopBarConfigPanel";
import type { Paint } from "@/lib/figma/types";
import { GOOGLE_FONTS, loadGoogleFont } from "@/lib/editor/fonts";
import { BLOCK_TYPE_OPTIONS, TRANSITION_OPTIONS, HOVER_PRESETS } from "@/lib/editor/blocks";
import type { Interaction, Block, BlockType, BlockParams, InteractionList, HoverPreset } from "@/lib/editor/blocks";
import styles from "./PropertiesPanel.module.css";

/** Number input that shows empty when value is 0, so typing "245" doesn't become "0245" */
function NumberInput({
  value,
  onChange,
  min,
  max,
  className,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [pending, setPending] = useState<string | null>(null);
  const displayValue = pending !== null ? pending : (value === 0 ? "" : String(value));

  // Reset pending when value changes from parent (e.g. different node selected)
  useEffect(() => {
    setPending(null);
  }, [value]);

  const commit = (v: string) => {
    if (v === "" || v === "-") {
      onChange(0);
    } else {
      const n = Number(v);
      if (!Number.isNaN(n)) {
        let out = n;
        if (min != null && out < min) out = min;
        if (max != null && out > max) out = max;
        onChange(out);
      }
    }
    setPending(null);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={displayValue}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "" || v === "-" || v.endsWith(".")) {
          setPending(v);
          if (v === "") onChange(0);
          return;
        }
        const n = Number(v);
        if (!Number.isNaN(n)) {
          let out = n;
          if (min != null && out < min) out = min;
          if (max != null && out > max) out = max;
          onChange(out);
          setPending(null);
        } else {
          setPending(v);
        }
      }}
      onBlur={(e) => {
        if (pending !== null) commit(e.target.value);
      }}
      {...rest}
    />
  );
}

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

function FontSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return GOOGLE_FONTS;
    const q = search.toLowerCase();
    return GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q));
  }, [search]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className={styles.fontSelectorBtn}
        onClick={() => setOpen(!open)}
        style={{ fontFamily: `"${value}", sans-serif` }}
      >
        <span className={styles.fontSelectorLabel}>{value}</span>
        <span className={styles.fontSelectorArrow}>&#9662;</span>
      </button>
      {open && (
        <div className={styles.fontDropdown}>
          <input
            type="text"
            className={styles.fontSearchInput}
            placeholder="Search fonts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className={styles.fontList}>
            {filtered.map((font) => (
              <button
                key={font}
                type="button"
                className={`${styles.fontItem} ${font === value ? styles.fontItemActive : ""}`}
                onClick={() => {
                  onChange(font);
                  setOpen(false);
                  setSearch("");
                }}
                onMouseEnter={() => loadGoogleFont(font)}
                style={{ fontFamily: `"${font}", sans-serif` }}
              >
                {font}
              </button>
            ))}
            {filtered.length === 0 && <div className={styles.fontEmpty}>No fonts found</div>}
          </div>
        </div>
      )}
    </div>
  );
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
                <NumberInput
                  min={0}
                  max={360}
                  value={gradientAngle}
                  onChange={setGradientAngle}
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
          <NumberInput
            min={0}
            max={100}
            value={Math.round(fillAlpha * 100)}
            onChange={(v) => {
              const a = v / 100;
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
            <textarea
              className={styles.contentTextarea}
              value={(props.content as string) ?? ""}
              onChange={(e) => updateNode(node.id, { props: { ...props, content: e.target.value } })}
              placeholder="Text content"
              rows={3}
            />
          </div>
          <div className={styles.section}>
            <div className={styles.label}>Typography</div>
            <FontSelector
              value={(props.fontFamily as string) ?? "Inter"}
              onChange={(v) => {
                loadGoogleFont(v);
                updateNode(node.id, { props: { ...props, fontFamily: v } });
              }}
            />
            <div className={styles.row} style={{ marginTop: 4 }}>
              <div className={styles.inputGroup}>
                <span className={styles.inputPrefix}>Size</span>
                <NumberInput
                  value={(props.fontSize as number) ?? 16}
                  onChange={(v) => updateNode(node.id, { props: { ...props, fontSize: v } })}
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
                <NumberInput
                  value={(props.letterSpacing as number) ?? 0}
                  onChange={(v) => updateNode(node.id, { props: { ...props, letterSpacing: v } })}
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
                  <NumberInput
                    value={node.itemSpacing ?? 0}
                    onChange={(v) => updateNode(node.id, { itemSpacing: v })}
                  />
                </div>
              </div>
              <div className={styles.row} style={{ marginTop: 4 }}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>T</span>
                  <NumberInput value={node.paddingTop ?? 0} onChange={(v) => updateNode(node.id, { paddingTop: v })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>R</span>
                  <NumberInput value={node.paddingRight ?? 0} onChange={(v) => updateNode(node.id, { paddingRight: v })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>B</span>
                  <NumberInput value={node.paddingBottom ?? 0} onChange={(v) => updateNode(node.id, { paddingBottom: v })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>L</span>
                  <NumberInput value={node.paddingLeft ?? 0} onChange={(v) => updateNode(node.id, { paddingLeft: v })} />
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
          <NumberInput
            value={node.rotation ?? 0}
            onChange={(v) => updateNode(node.id, { rotation: v })}
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

// ── Interactions Panel ────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const TRIGGER_LABELS: Record<string, string> = {
  ON_CLICK: "On Click",
  ON_HOVER: "On Hover",
  ON_CHANGE: "On Change",
};

function BlockEditor({
  block,
  nodes,
  onChange,
  onRemove,
}: {
  block: Block;
  nodes: SceneNode[];
  onChange: (b: Block) => void;
  onRemove: () => void;
}) {
  const allNodes = useMemo(() => {
    const flat: SceneNode[] = [];
    function walk(ns: SceneNode[]) {
      for (const n of ns) {
        flat.push(n);
        if (n.children) walk(n.children);
      }
    }
    walk(nodes);
    return flat;
  }, [nodes]);

  const frames = allNodes.filter((n) => n.type === "FRAME");
  const nonFrames = allNodes.filter((n) => n.type !== "FRAME" && n.type !== "TOPBAR");

  const setParam = useCallback((key: keyof BlockParams, val: unknown) => {
    onChange({ ...block, params: { ...(block.params ?? {}), [key]: val } });
  }, [block, onChange]);

  const setType = useCallback((type: BlockType) => {
    const label = BLOCK_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
    onChange({ ...block, type, label, params: {} });
  }, [block, onChange]);

  return (
    <div className={styles.blockEditor}>
      <div className={styles.blockHeader}>
        <select
          className={styles.blockTypeSelect}
          value={block.type}
          onChange={(e) => setType(e.target.value as BlockType)}
        >
          {BLOCK_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="button" className={styles.blockRemoveBtn} onClick={onRemove} title="Remove action">
          <Trash2 size={12} />
        </button>
      </div>

      {/* NAVIGATE_TO_FRAME */}
      {block.type === "NAVIGATE_TO_FRAME" && (
        <>
          <div className={styles.blockParam}>
            <span className={styles.blockParamLabel}>Target frame</span>
            <select
              className={styles.blockParamSelect}
              value={block.params?.targetFrameId ?? ""}
              onChange={(e) => {
                const frame = frames.find((f) => f.id === e.target.value);
                setParam("targetFrameId", e.target.value);
                setParam("targetFrameName", frame?.name ?? "");
              }}
            >
              <option value="">— select frame —</option>
              {frames.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.blockParam}>
            <span className={styles.blockParamLabel}>Transition</span>
            <select
              className={styles.blockParamSelect}
              value={(block.params?.transition as string) ?? "fade"}
              onChange={(e) => setParam("transition", e.target.value)}
            >
              {TRANSITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* OPEN_URL */}
      {block.type === "OPEN_URL" && (
        <div className={styles.blockParam}>
          <span className={styles.blockParamLabel}>URL</span>
          <input
            type="text"
            className={styles.blockParamInput}
            placeholder="https://example.com"
            value={(block.params?.url as string) ?? ""}
            onChange={(e) => setParam("url", e.target.value)}
          />
        </div>
      )}

      {/* SHOW / HIDE / TOGGLE_VISIBILITY */}
      {(block.type === "SHOW_ELEMENT" || block.type === "HIDE_ELEMENT" || block.type === "TOGGLE_VISIBILITY") && (
        <div className={styles.blockParam}>
          <span className={styles.blockParamLabel}>Target element</span>
          <select
            className={styles.blockParamSelect}
            value={block.params?.targetNodeId ?? ""}
            onChange={(e) => {
              const n = nonFrames.find((nd) => nd.id === e.target.value);
              setParam("targetNodeId", e.target.value);
              setParam("targetNodeName", n?.name ?? "");
            }}
          >
            <option value="">— select element —</option>
            {nonFrames.map((n) => (
              <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
            ))}
          </select>
        </div>
      )}

      {/* SEND_IPC */}
      {block.type === "SEND_IPC" && (
        <>
          <div className={styles.blockParam}>
            <span className={styles.blockParamLabel}>Event name</span>
            <input
              type="text"
              className={styles.blockParamInput}
              placeholder="my-event"
              value={(block.params?.ipcEvent as string) ?? ""}
              onChange={(e) => setParam("ipcEvent", e.target.value)}
            />
          </div>
          <div className={styles.blockParam}>
            <span className={styles.blockParamLabel}>Payload (JSON)</span>
            <input
              type="text"
              className={styles.blockParamInput}
              placeholder='{"key":"value"}'
              value={(block.params?.ipcPayload as string) ?? ""}
              onChange={(e) => setParam("ipcPayload", e.target.value)}
            />
          </div>
        </>
      )}

      {/* TRIGGER_EVENT */}
      {block.type === "TRIGGER_EVENT" && (
        <div className={styles.blockParam}>
          <span className={styles.blockParamLabel}>Event name</span>
          <input
            type="text"
            className={styles.blockParamInput}
            placeholder="my-custom-event"
            value={(block.params?.ipcEvent as string) ?? ""}
            onChange={(e) => setParam("ipcEvent", e.target.value)}
          />
        </div>
      )}

      {/* ANIMATION blocks — duration + delay */}
      {block.type.startsWith("ANIMATE_") && (
        <div className={styles.animParamRow}>
          <div className={styles.blockParam}>
            <span className={styles.blockParamLabel}>Duration (ms)</span>
            <input
              type="number"
              className={styles.blockParamInput}
              value={(block.params?.duration as number) ?? 400}
              min={50} max={3000} step={50}
              onChange={(e) => setParam("duration", Number(e.target.value))}
            />
          </div>
          <div className={styles.blockParam}>
            <span className={styles.blockParamLabel}>Delay (ms)</span>
            <input
              type="number"
              className={styles.blockParamInput}
              value={(block.params?.delay as number) ?? 0}
              min={0} max={5000} step={50}
              onChange={(e) => setParam("delay", Number(e.target.value))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InteractionEditor({
  interaction,
  nodes,
  onChange,
  onRemove,
}: {
  interaction: Interaction;
  nodes: SceneNode[];
  onChange: (i: Interaction) => void;
  onRemove: () => void;
}) {
  const addBlock = () => {
    const block: Block = {
      id: uid(),
      type: "NAVIGATE_TO_FRAME",
      label: "Navigate to Frame",
      enabled: true,
      params: {},
    };
    onChange({ ...interaction, blocks: [...interaction.blocks, block] });
  };

  const updateBlock = (idx: number, b: Block) => {
    const blocks = [...interaction.blocks];
    blocks[idx] = b;
    onChange({ ...interaction, blocks });
  };

  const removeBlock = (idx: number) => {
    const blocks = interaction.blocks.filter((_, i) => i !== idx);
    onChange({ ...interaction, blocks });
  };

  return (
    <div className={styles.interactionCard}>
      <div className={styles.interactionHeader}>
        <select
          className={styles.triggerSelect}
          value={interaction.trigger}
          onChange={(e) =>
            onChange({ ...interaction, trigger: e.target.value as Interaction["trigger"] })
          }
        >
          <option value="ON_CLICK">On Click</option>
          <option value="ON_HOVER">On Hover</option>
          <option value="ON_HOVER_END">On Hover End</option>
          <option value="ON_CHANGE">On Change</option>
          <option value="ON_LOAD">On Load</option>
        </select>
        <button type="button" className={styles.interactionRemoveBtn} onClick={onRemove} title="Remove interaction">
          <Trash2 size={13} />
        </button>
      </div>

      <div className={styles.blockList}>
        {interaction.blocks.map((block, idx) => (
          <BlockEditor
            key={block.id}
            block={block}
            nodes={nodes}
            onChange={(b) => updateBlock(idx, b)}
            onRemove={() => removeBlock(idx)}
          />
        ))}
      </div>

      <button type="button" className={styles.addBlockBtn} onClick={addBlock}>
        <Plus size={11} /> Add action
      </button>
    </div>
  );
}

function InteractionsPanel({ node }: { node: SceneNode }) {
  const { nodes, updateNode } = useEditorStore();
  const interactions: InteractionList = (node.props?._interactions as InteractionList) ?? [];
  const hoverPreset: HoverPreset = (node.props?._hoverPreset as HoverPreset) ?? "none";

  const save = useCallback((list: InteractionList) => {
    updateNode(node.id, { props: { ...(node.props ?? {}), _interactions: list } });
  }, [node, updateNode]);

  const setHoverPreset = useCallback((preset: HoverPreset) => {
    updateNode(node.id, { props: { ...(node.props ?? {}), _hoverPreset: preset } });
  }, [node, updateNode]);

  const addInteraction = () => {
    const block: Block = {
      id: uid(),
      type: "NAVIGATE_TO_FRAME",
      label: "Navigate to Frame",
      enabled: true,
      params: { transition: "fade" },
    };
    const interaction: Interaction = {
      id: uid(),
      trigger: "ON_CLICK",
      blocks: [block],
    };
    save([...interactions, interaction]);
  };

  const updateInteraction = (idx: number, i: Interaction) => {
    const list = [...interactions];
    list[idx] = i;
    save(list);
  };

  const removeInteraction = (idx: number) => {
    save(interactions.filter((_, i) => i !== idx));
  };

  return (
    <>
      {/* Hover Presets */}
      <div className={styles.section}>
        <div className={styles.label} style={{ marginBottom: 6 }}>Hover Effect</div>
        <div className={styles.hoverPresetGrid}>
          {HOVER_PRESETS.filter((p) => p.value !== "none").map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.description}
              className={`${styles.hoverPresetBtn} ${hoverPreset === preset.value ? styles.hoverPresetActive : ""}`}
              onClick={() => setHoverPreset(hoverPreset === preset.value ? "none" : preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactions */}
      <div className={styles.section}>
        <div className={styles.interactionsSectionHeader}>
          <div className={styles.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Zap size={11} /> Interactions
          </div>
          <button type="button" className={styles.addInteractionBtn} onClick={addInteraction}>
            <Plus size={12} /> Add
          </button>
        </div>

        {interactions.length === 0 && (
          <div className={styles.interactionsEmpty}>
            No interactions yet. Click Add to make this element do something.
          </div>
        )}

        {interactions.map((interaction, idx) => (
          <InteractionEditor
            key={interaction.id}
            interaction={interaction}
            nodes={nodes}
            onChange={(i) => updateInteraction(idx, i)}
            onRemove={() => removeInteraction(idx)}
          />
        ))}
      </div>
    </>
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
              <NumberInput
                value={Math.round(node.x)}
                onChange={(v) => updateNode(node.id, { x: v })}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>Y</span>
              <NumberInput
                value={Math.round(node.y)}
                onChange={(v) => updateNode(node.id, { y: v })}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.label}>Size</div>
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>W</span>
              <NumberInput
                value={Math.round(node.width)}
                onChange={(v) => updateNode(node.id, { width: v })}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>H</span>
              <NumberInput
                value={Math.round(node.height)}
                onChange={(v) => updateNode(node.id, { height: v })}
              />
            </div>
          </div>
        </div>

        {(node.type === "TEXT" || node.name === "Label") && (
          <>
            <div className={styles.section}>
              <div className={styles.label}>Content</div>
              <textarea
                className={styles.contentTextarea}
                value={(props.content as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "content", e.target.value)}
                placeholder="Text content"
                rows={3}
              />
            </div>
            <div className={styles.section}>
              <div className={styles.label}>Typography</div>
              <FontSelector
                value={(props.fontFamily as string) ?? "Inter"}
                onChange={(v) => {
                  loadGoogleFont(v);
                  updateProps(node, updateNode, "fontFamily", v);
                }}
              />
              <div className={styles.row} style={{ marginTop: 4 }}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>Size</span>
                  <NumberInput
                    value={(props.fontSize as number) ?? 14}
                    onChange={(v) => updateProps(node, updateNode, "fontSize", v)}
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
            <NumberInput
              min={0}
              max={100}
              value={Math.round((node.opacity ?? 1) * 100)}
              onChange={(v) => updateNode(node.id, { opacity: v / 100 })}
            />
          </div>
        </div>

        <InteractionsPanel node={node} />
      </div>
    </div>
  );
}
