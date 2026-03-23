"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import {
  Image,
  Palette,
  Plus,
  Trash2,
  ChevronDown,
  Zap,
  ArrowLeftRight,
  ArrowUpDown,
  WrapText,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Scaling,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ColorPickerPopover } from "@/components/editor/ColorPickerPopover";
import { TopBarConfigPanel } from "./TopBarConfigPanel";
import type { Paint as FigmaPaint } from "@/lib/figma/types";
import type { Paint as ScenePaint, Effect as SceneEffect, DropShadow, InnerShadow, BlurEffect } from "@/lib/editor/types";
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

/** 3×3 Figma-style alignment: [primaryAxis, counterAxis] per cell */
const ALIGN_GRID: [string, string][][] = [
  [
    ["MIN", "MIN"],
    ["MIN", "CENTER"],
    ["MIN", "MAX"],
  ],
  [
    ["CENTER", "MIN"],
    ["CENTER", "CENTER"],
    ["CENTER", "MAX"],
  ],
  [
    ["MAX", "MIN"],
    ["MAX", "CENTER"],
    ["MAX", "MAX"],
  ],
];

function AutoLayoutFrameSection({
  node,
  updateNode,
}: {
  node: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  const layoutMode = node.layoutMode ?? "NONE";
  const isAuto = layoutMode === "HORIZONTAL" || layoutMode === "VERTICAL";
  const primary = node.primaryAxisAlignItems ?? "MIN";
  const counter = node.counterAxisAlignItems ?? "MIN";

  return (
    <div className={styles.section}>
      <div className={styles.label}>Layout</div>
      {layoutMode === "NONE" && (
        <button
          type="button"
          className={styles.autoLayoutAddBtn}
          onClick={() =>
            updateNode(node.id, {
              layoutMode: "HORIZONTAL",
              itemSpacing: 8,
              paddingTop: 8,
              paddingRight: 8,
              paddingBottom: 8,
              paddingLeft: 8,
              primaryAxisAlignItems: "MIN",
              counterAxisAlignItems: "MIN",
            })
          }
        >
          + Auto Layout
        </button>
      )}
      {isAuto && (
        <>
          <div className={styles.row} style={{ alignItems: "center", marginTop: 4 }}>
            <span className={styles.autoLayoutMiniLabel}>Direction</span>
            <div className={styles.directionBtnGroup}>
              <button
                type="button"
                title="Horizontal"
                className={`${styles.directionIconBtn} ${layoutMode === "HORIZONTAL" ? styles.directionIconBtnActive : ""}`}
                onClick={() => updateNode(node.id, { layoutMode: "HORIZONTAL" })}
              >
                <ArrowLeftRight size={16} />
              </button>
              <button
                type="button"
                title="Vertical"
                className={`${styles.directionIconBtn} ${layoutMode === "VERTICAL" ? styles.directionIconBtnActive : ""}`}
                onClick={() => updateNode(node.id, { layoutMode: "VERTICAL" })}
              >
                <ArrowUpDown size={16} />
              </button>
            </div>
          </div>

          <div className={styles.row} style={{ marginTop: 8 }}>
            <div className={styles.inputGroup}>
              <span className={styles.inputPrefix}>Gap</span>
              <NumberInput
                value={node.itemSpacing ?? 0}
                onChange={(v) => updateNode(node.id, { itemSpacing: v })}
              />
            </div>
          </div>

          <div className={styles.autoLayoutSubLabel}>Padding</div>
          <div className={styles.row}>
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

          <div className={styles.autoLayoutSubLabel}>Align</div>
          <div className={styles.alignGrid9} role="group" aria-label="Alignment">
            {ALIGN_GRID.map((row, ri) =>
              row.map(([p, c], ci) => {
                const active = primary === p && counter === c && primary !== "SPACE_BETWEEN";
                return (
                  <button
                    key={`${ri}-${ci}`}
                    type="button"
                    className={`${styles.alignCell9} ${active ? styles.alignCell9Active : ""}`}
                    title={`${p} / ${c}`}
                    onClick={() =>
                      updateNode(node.id, {
                        primaryAxisAlignItems: p,
                        counterAxisAlignItems: c,
                      })
                    }
                  />
                );
              })
            )}
          </div>
          <button
            type="button"
            className={`${styles.spaceBetweenBtn} ${primary === "SPACE_BETWEEN" ? styles.spaceBetweenBtnActive : ""}`}
            onClick={() => updateNode(node.id, { primaryAxisAlignItems: "SPACE_BETWEEN" })}
          >
            Space between (main axis)
          </button>

          <label className={styles.wrapToggle}>
            <input
              type="checkbox"
              checked={node.layoutWrap === "WRAP"}
              onChange={(e) => updateNode(node.id, { layoutWrap: e.target.checked ? "WRAP" : "NO_WRAP" })}
            />
            <WrapText size={14} />
            <span>Wrap</span>
          </label>

          <div className={styles.row} style={{ marginTop: 8 }}>
            <div className={styles.inputGroup} style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
              <span className={styles.autoLayoutMiniLabel}>Primary axis sizing</span>
              <select
                className={styles.select}
                value={node.primaryAxisSizingMode ?? "FIXED"}
                onChange={(e) =>
                  updateNode(node.id, {
                    primaryAxisSizingMode: e.target.value as "FIXED" | "AUTO",
                  })
                }
              >
                <option value="FIXED">Fixed</option>
                <option value="AUTO">Hug contents</option>
              </select>
            </div>
            <div className={styles.inputGroup} style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
              <span className={styles.autoLayoutMiniLabel}>Counter axis sizing</span>
              <select
                className={styles.select}
                value={node.counterAxisSizingMode ?? "FIXED"}
                onChange={(e) =>
                  updateNode(node.id, {
                    counterAxisSizingMode: e.target.value as "FIXED" | "AUTO",
                  })
                }
              >
                <option value="FIXED">Fixed</option>
                <option value="AUTO">Hug contents</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className={styles.clearAutoLayoutBtn}
            onClick={() => updateNode(node.id, { layoutMode: "NONE" })}
          >
            Remove auto layout
          </button>
        </>
      )}
    </div>
  );
}

function AutoLayoutChildSection({
  node,
  parent,
  updateNode,
}: {
  node: SceneNode;
  parent: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  const parentAuto =
    parent.layoutMode === "HORIZONTAL" || parent.layoutMode === "VERTICAL";
  if (!parentAuto) return null;

  return (
    <div className={styles.section}>
      <div className={styles.label}>In auto layout</div>
      <label className={styles.checkboxModern}>
        <div className={styles.checkboxTrack}>
          <input
            type="checkbox"
            checked={node.layoutGrow === 1}
            onChange={(e) => updateNode(node.id, { layoutGrow: e.target.checked ? 1 : 0 })}
            className={styles.checkboxInput}
          />
          <span className={styles.checkboxThumb} />
        </div>
        <span>Fill container</span>
      </label>
      <label className={styles.checkboxModern} style={{ marginTop: 8 }}>
        <div className={styles.checkboxTrack}>
          <input
            type="checkbox"
            checked={node.primaryAxisSizingMode === "AUTO"}
            onChange={(e) =>
              updateNode(node.id, {
                primaryAxisSizingMode: e.target.checked ? "AUTO" : "FIXED",
              })
            }
            className={styles.checkboxInput}
          />
          <span className={styles.checkboxThumb} />
        </div>
        <span>Hug contents</span>
      </label>
    </div>
  );
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

function defaultSolidFill(): ScenePaint {
  return { type: "SOLID", color: "#ffffff", opacity: 1 };
}

function defaultLinearFill(): ScenePaint {
  return {
    type: "GRADIENT_LINEAR",
    stops: [
      { position: 0, color: "#5e5ce6" },
      { position: 1, color: "#ff6b6b" },
    ],
    angle: 90,
  };
}

function defaultRadialFill(): ScenePaint {
  return {
    type: "GRADIENT_RADIAL",
    stops: [
      { position: 0, color: "#5e5ce6" },
      { position: 1, color: "#ff6b6b" },
    ],
  };
}

function defaultImageFill(): ScenePaint {
  return { type: "IMAGE", src: "", scaleMode: "FILL" };
}

function newDropShadowEffect(): DropShadow {
  return {
    type: "DROP_SHADOW",
    color: "#000000",
    opacity: 0.25,
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
  };
}

function newInnerShadowEffect(): InnerShadow {
  return {
    type: "INNER_SHADOW",
    color: "#000000",
    opacity: 0.25,
    offsetX: 0,
    offsetY: 2,
    blur: 6,
    spread: 0,
  };
}

function newLayerBlurEffect(): BlurEffect {
  return { type: "LAYER_BLUR", radius: 8 };
}

function SceneSwatchColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hex = /^#[0-9A-Fa-f]{3,8}$/.test(value) ? value : "#888888";
  return (
    <>
      <button
        type="button"
        className={styles.colorSwatchBtn}
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
    </>
  );
}

function SceneFillsEditor({
  node,
  updateNode,
}: {
  node: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  const fills = node.fills ?? [];

  const setFills = (next: ScenePaint[]) => {
    updateNode(node.id, { fills: next.length ? next : undefined });
  };

  const replaceFill = (index: number, fill: ScenePaint) => {
    const next = [...fills];
    next[index] = fill;
    setFills(next);
  };

  const setFillType = (index: number, t: ScenePaint["type"]) => {
    if (t === "SOLID") replaceFill(index, defaultSolidFill());
    else if (t === "GRADIENT_LINEAR") replaceFill(index, defaultLinearFill());
    else if (t === "GRADIENT_RADIAL") replaceFill(index, defaultRadialFill());
    else replaceFill(index, defaultImageFill());
  };

  const removeFill = (index: number) => {
    setFills(fills.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.section}>
      <div className={styles.interactionsSectionHeader}>
        <div className={styles.label}>Fills</div>
        <button
          type="button"
          className={styles.addInteractionBtn}
          title="Add fill"
          onClick={() => setFills([...fills, defaultSolidFill()])}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {fills.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>No fills — click Add or use Fill below.</div>
      )}

      {fills.map((fill, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--color-s-02)",
            borderRadius: 8,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div className={styles.row} style={{ alignItems: "center" }}>
            <select
              className={styles.select}
              value={fill.type}
              onChange={(e) => setFillType(i, e.target.value as ScenePaint["type"])}
            >
              <option value="SOLID">Solid</option>
              <option value="GRADIENT_LINEAR">Linear gradient</option>
              <option value="GRADIENT_RADIAL">Radial gradient</option>
              <option value="IMAGE">Image</option>
            </select>
            <button type="button" className={styles.interactionRemoveBtn} title="Remove fill" onClick={() => removeFill(i)}>
              <Trash2 size={13} />
            </button>
          </div>

          {fill.type === "SOLID" && (
            <>
              <div className={styles.row} style={{ alignItems: "center" }}>
                <span className={styles.label} style={{ textTransform: "none" }}>
                  Color
                </span>
                <SceneSwatchColorPicker
                  value={fill.color}
                  onChange={(v) => replaceFill(i, { ...fill, color: v })}
                />
              </div>
              <div className={styles.section}>
                <div className={styles.label}>Opacity</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((fill.opacity ?? 1) * 100)}
                  onChange={(e) =>
                    replaceFill(i, { ...fill, opacity: Number(e.target.value) / 100 })
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          {(fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL") && (
            <>
              <div className={styles.gradientInputs}>
              {fill.type === "GRADIENT_LINEAR" && (
                <div className={styles.gradientAngle}>
                  <span>Angle</span>
                  <NumberInput
                    min={0}
                    max={360}
                    value={fill.angle ?? 90}
                    onChange={(v) => replaceFill(i, { ...fill, angle: v })}
                    className={styles.gradientAngleInput}
                  />
                </div>
              )}
              <div className={styles.gradientStops}>
                <GradientStopPicker
                  label="Start"
                  value={fill.stops[0]?.color ?? "#5e5ce6"}
                  onChange={(v) => {
                    const stops = [...fill.stops];
                    stops[0] = { position: 0, color: v };
                    if (!stops[1]) stops[1] = { position: 1, color: "#ff6b6b" };
                    replaceFill(i, { ...fill, stops });
                  }}
                />
                <GradientStopPicker
                  label="End"
                  value={fill.stops[1]?.color ?? "#ff6b6b"}
                  onChange={(v) => {
                    const stops = [...fill.stops];
                    if (!stops[0]) stops[0] = { position: 0, color: "#5e5ce6" };
                    stops[1] = { position: 1, color: v };
                    replaceFill(i, { ...fill, stops });
                  }}
                />
              </div>
              </div>
            </>
          )}

          {fill.type === "IMAGE" && (
            <input
              type="text"
              className={styles.standaloneInput}
              placeholder="Image URL"
              value={fill.src ?? ""}
              onChange={(e) => replaceFill(i, { ...fill, src: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SceneEffectsEditor({
  node,
  updateNode,
}: {
  node: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  const effects = node.effects ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const effectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (effectMenuRef.current && !effectMenuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const setEffects = (next: SceneEffect[]) => {
    updateNode(node.id, { effects: next.length ? next : undefined });
  };

  const updateEffectAt = (index: number, efx: SceneEffect) => {
    const next = [...effects];
    next[index] = efx;
    setEffects(next);
  };

  const removeEffect = (index: number) => {
    setEffects(effects.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.section}>
      <div className={styles.interactionsSectionHeader} style={{ position: "relative" }}>
        <div className={styles.label}>Effects</div>
        <button
          type="button"
          className={styles.addInteractionBtn}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Plus size={12} /> Add
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              zIndex: 20,
              marginTop: 4,
              background: "var(--surface-03)",
              border: "1px solid var(--color-s-02)",
              borderRadius: 8,
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 140,
              boxShadow: "var(--box-shadow-popover)",
            }}
          >
            <button
              type="button"
              className={styles.fontItem}
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                setEffects([...effects, newDropShadowEffect()]);
                setMenuOpen(false);
              }}
            >
              Drop shadow
            </button>
            <button
              type="button"
              className={styles.fontItem}
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                setEffects([...effects, newInnerShadowEffect()]);
                setMenuOpen(false);
              }}
            >
              Inner shadow
            </button>
            <button
              type="button"
              className={styles.fontItem}
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                setEffects([...effects, newLayerBlurEffect()]);
                setMenuOpen(false);
              }}
            >
              Layer blur
            </button>
          </div>
        )}
      </div>

      {effects.map((efx, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--color-s-02)",
            borderRadius: 8,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div className={styles.row} style={{ alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--shade-06)" }}>
              {efx.type === "DROP_SHADOW"
                ? "Drop shadow"
                : efx.type === "INNER_SHADOW"
                  ? "Inner shadow"
                  : "Layer blur"}
            </span>
            <button type="button" className={styles.interactionRemoveBtn} title="Remove" onClick={() => removeEffect(i)}>
              <Trash2 size={13} />
            </button>
          </div>

          {(efx.type === "DROP_SHADOW" || efx.type === "INNER_SHADOW") && (
            <>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>X</span>
                  <NumberInput
                    value={efx.offsetX}
                    onChange={(v) => updateEffectAt(i, { ...efx, offsetX: v })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>Y</span>
                  <NumberInput
                    value={efx.offsetY}
                    onChange={(v) => updateEffectAt(i, { ...efx, offsetY: v })}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>Blur</span>
                  <NumberInput value={efx.blur} onChange={(v) => updateEffectAt(i, { ...efx, blur: v })} />
                </div>
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>Spr</span>
                  <NumberInput
                    value={efx.spread ?? 0}
                    onChange={(v) => updateEffectAt(i, { ...efx, spread: v })}
                  />
                </div>
              </div>
              <div className={styles.row} style={{ alignItems: "center" }}>
                <span className={styles.label} style={{ textTransform: "none" }}>
                  Color
                </span>
                <SceneSwatchColorPicker
                  value={efx.color}
                  onChange={(v) => updateEffectAt(i, { ...efx, color: v })}
                />
              </div>
              <div className={styles.section}>
                <div className={styles.label}>Opacity</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(efx.opacity * 100)}
                  onChange={(e) =>
                    updateEffectAt(i, { ...efx, opacity: Number(e.target.value) / 100 })
                  }
                  style={{ width: "100%" }}
                />
              </div>
            </>
          )}

          {efx.type === "LAYER_BLUR" && (
            <div className={styles.section}>
              <div className={styles.label}>Radius</div>
              <input
                type="range"
                min={0}
                max={64}
                value={efx.radius}
                onChange={(e) => updateEffectAt(i, { ...efx, radius: Number(e.target.value) })}
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>
      ))}
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
    fills: FigmaPaint[];
    strokes: FigmaPaint[];
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
          const newFills: FigmaPaint[] = [{ hex: v, alpha: fillAlpha }];
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
              const newFills: FigmaPaint[] = [{ hex: fillHex, alpha: a }];
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
              const newStrokes: FigmaPaint[] = [{ hex: v, alpha: strokeAlpha }];
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
          {props._textFills && (props._textFills as FigmaPaint[]).length > 0 && (
            <ColorRow
              label="Text color"
              value={(props._textFills as FigmaPaint[])[0].hex ?? "#000000"}
              onChange={(v) => {
                const f = (props._textFills as FigmaPaint[])[0];
                const alpha = f.alpha ?? f.opacity ?? 1;
                updateNode(node.id, { props: { ...props, _textFills: [{ hex: v, alpha }] } });
              }}
            />
          )}
        </>
      )}

      {isFrame && <AutoLayoutFrameSection node={node} updateNode={updateNode} />}

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

// ── Constraints (Figma-style) ────────────────────────────────────────────────

type ConstraintH = NonNullable<SceneNode["constraints"]>["horizontal"];
type ConstraintV = NonNullable<SceneNode["constraints"]>["vertical"];

function ConstraintsSection({
  node,
  updateNode,
}: {
  node: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  const base = node.constraints ?? { horizontal: "LEFT" as const, vertical: "TOP" as const };

  const setHorizontal = (horizontal: ConstraintH) => {
    updateNode(node.id, { constraints: { ...base, horizontal } });
  };
  const setVertical = (vertical: ConstraintV) => {
    updateNode(node.id, { constraints: { ...base, vertical } });
  };

  const horizontalOptions: { value: ConstraintH; title: string; Icon: typeof ArrowLeft }[] = [
    { value: "LEFT", title: "Left", Icon: ArrowLeft },
    { value: "RIGHT", title: "Right", Icon: ArrowRight },
    { value: "LEFT_RIGHT", title: "Left & right (stretch width)", Icon: ArrowLeftRight },
    { value: "CENTER", title: "Center horizontally", Icon: AlignHorizontalJustifyCenter },
    { value: "SCALE", title: "Scale horizontally", Icon: Scaling },
  ];

  const verticalOptions: { value: ConstraintV; title: string; Icon: LucideIcon }[] = [
    { value: "TOP", title: "Top", Icon: ArrowUp },
    { value: "BOTTOM", title: "Bottom", Icon: ArrowDown },
    { value: "TOP_BOTTOM", title: "Top & bottom (stretch height)", Icon: ArrowUpDown },
    { value: "CENTER", title: "Center vertically", Icon: AlignVerticalJustifyCenter },
    { value: "SCALE", title: "Scale vertically", Icon: Scaling },
  ];

  return (
    <div className={styles.section}>
      <div className={styles.label}>Constraints</div>
      <div className={styles.constraintSubLabel}>Horizontal</div>
      <div className={styles.constraintRow} role="group" aria-label="Horizontal constraints">
        {horizontalOptions.map(({ value, title, Icon }) => (
          <button
            key={value}
            type="button"
            className={`${styles.constraintIconBtn} ${base.horizontal === value ? styles.constraintIconBtnActive : ""}`}
            title={title}
            onClick={() => setHorizontal(value)}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        ))}
      </div>
      <div className={styles.constraintSubLabel}>Vertical</div>
      <div className={styles.constraintCol} role="group" aria-label="Vertical constraints">
        {verticalOptions.map(({ value, title, Icon }) => (
          <button
            key={value}
            type="button"
            className={`${styles.constraintIconBtn} ${base.vertical === value ? styles.constraintIconBtnActive : ""}`}
            title={title}
            onClick={() => setVertical(value)}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Prototype (Figma-style) ─────────────────────────────────────────────────

type PrototypeInteraction = {
  trigger: "ON_CLICK";
  action: "NAVIGATE" | "OVERLAY" | "BACK";
  targetId?: string;
  transition?: string;
  duration?: number;
};

const ON_CLICK_OPTIONS = [
  { value: "none", label: "None" },
  { value: "navigate", label: "Navigate to" },
  { value: "overlay", label: "Open overlay" },
  { value: "back", label: "Go back" },
] as const;

const TRANSITION_OPTIONS = ["Instant", "Dissolve", "Push Left", "Push Right", "Slide Up"] as const;

function PrototypeSection({ node, updateNode }: { node: SceneNode; updateNode: (id: string, p: Partial<SceneNode>) => void }) {
  const nodes = useEditorStore((s) => s.nodes);
  const frames = useMemo(() => {
    const flat: SceneNode[] = [];
    function walk(ns: SceneNode[]) {
      for (const n of ns) {
        flat.push(n);
        if (n.children?.length) walk(n.children);
      }
    }
    walk(nodes);
    return flat.filter((n) => n.type === "FRAME");
  }, [nodes]);

  const raw = node.props?.interactions as PrototypeInteraction[] | undefined;
  const first = raw?.[0];
  const mode =
    !first || !first.action
      ? "none"
      : first.action === "NAVIGATE"
        ? "navigate"
        : first.action === "OVERLAY"
          ? "overlay"
          : first.action === "BACK"
            ? "back"
            : "none";

  const targetId = first?.action === "NAVIGATE" ? first.targetId ?? "" : "";
  const transition = first?.transition ?? "Instant";
  const durationMs = first?.duration ?? 300;

  const setInteractions = (list: PrototypeInteraction[] | undefined) => {
    const props = { ...(node.props ?? {}) };
    if (list && list.length > 0) props.interactions = list as unknown[];
    else delete props.interactions;
    updateNode(node.id, { props });
  };

  return (
    <div className={styles.section}>
      <div className={styles.label}>Prototype</div>
      <div className={styles.section} style={{ gap: 8 }}>
        <div className={styles.label} style={{ textTransform: "none", fontSize: 11 }}>
          On Click
        </div>
        <select
          className={styles.select}
          value={mode}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "none") setInteractions(undefined);
            else if (v === "navigate") {
              const tid = frames.find((f) => f.id !== node.id)?.id ?? "";
              setInteractions([
                {
                  trigger: "ON_CLICK",
                  action: "NAVIGATE",
                  targetId: tid,
                  transition: "Instant",
                  duration: 300,
                },
              ]);
            } else if (v === "overlay") {
              setInteractions([{ trigger: "ON_CLICK", action: "OVERLAY" }]);
            } else if (v === "back") {
              setInteractions([{ trigger: "ON_CLICK", action: "BACK" }]);
            }
          }}
        >
          {ON_CLICK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {mode === "navigate" && (
          <>
            <div className={styles.label} style={{ textTransform: "none", fontSize: 11 }}>
              Destination
            </div>
            <select
              className={styles.select}
              value={targetId}
              onChange={(e) => {
                setInteractions([
                  {
                    trigger: "ON_CLICK",
                    action: "NAVIGATE",
                    targetId: e.target.value,
                    transition,
                    duration: durationMs,
                  },
                ]);
              }}
            >
              <option value="">Select frame…</option>
              {frames
                .filter((f) => f.id !== node.id)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name || f.id}
                  </option>
                ))}
            </select>
            <div className={styles.label} style={{ textTransform: "none", fontSize: 11 }}>
              Transition
            </div>
            <select
              className={styles.select}
              value={transition}
              onChange={(e) => {
                setInteractions([
                  {
                    trigger: "ON_CLICK",
                    action: "NAVIGATE",
                    targetId,
                    transition: e.target.value,
                    duration: durationMs,
                  },
                ]);
              }}
            >
              {TRANSITION_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div className={styles.label} style={{ textTransform: "none", fontSize: 11 }}>
              Duration (ms)
            </div>
            <div className={styles.inputGroup}>
              <NumberInput
                min={0}
                max={10000}
                value={durationMs}
                onChange={(v) => {
                  setInteractions([
                    {
                      trigger: "ON_CLICK",
                      action: "NAVIGATE",
                      targetId,
                      transition,
                      duration: v,
                    },
                  ]);
                }}
              />
            </div>
          </>
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
  const { nodes, selectedIds, updateNode, setSelectedIds, createInstance, detachInstance, getNode } =
    useEditorStore();
  const selectedId = [...selectedIds][0];
  const node = selectedId ? findNode(nodes, selectedId) : null;

  if (!node) {
    return <CanvasProperties />;
  }

  if (node.type === "TOPBAR") {
    return <TopBarConfigPanel nodeId={node.id} />;
  }

  const props = node.props ?? {};
  const isMasterComponent =
    node.type === "COMPONENT" && (props as { isComponent?: boolean }).isComponent === true;
  const isInstance = node.type === "COMPONENT_INSTANCE";
  const masterForInstance = node.mainComponentId ? getNode(node.mainComponentId) : undefined;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Properties</div>
      <div className={styles.content}>
        {isMasterComponent && (
          <div className={styles.componentMasterBanner}>
            <span className={styles.componentMasterBadge}>Master Component</span>
            <button
              type="button"
              className={styles.componentInstanceActionBtn}
              onClick={() => createInstance(node.id)}
            >
              Duplicate as Instance
            </button>
          </div>
        )}
        {isInstance && (
          <div className={styles.componentInstanceBanner}>
            <div className={styles.componentInstanceTitle}>
              Instance of: <strong>{masterForInstance?.name ?? "…"}</strong>
            </div>
            <div className={styles.componentInstanceActions}>
              <button
                type="button"
                className={styles.componentInstanceActionBtn}
                onClick={() => detachInstance(node.id)}
              >
                Detach
              </button>
              <button
                type="button"
                className={styles.componentInstanceActionBtn}
                onClick={() => {
                  if (node.mainComponentId) setSelectedIds([node.mainComponentId]);
                }}
                disabled={!node.mainComponentId}
              >
                Go to master
              </button>
            </div>
          </div>
        )}
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

        {node.parentId &&
          (() => {
            const p = findNode(nodes, node.parentId!);
            return p && p.type === "FRAME" ? (
              <ConstraintsSection node={node} updateNode={updateNode} />
            ) : null;
          })()}

        {node.parentId &&
          (() => {
            const p = findNode(nodes, node.parentId!);
            return p ? <AutoLayoutChildSection node={node} parent={p} updateNode={updateNode} /> : null;
          })()}

        {(node.type === "FRAME" || node.type === "CONTAINER") && (
          <AutoLayoutFrameSection node={node} updateNode={updateNode} />
        )}

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

        {(node.type === "RECTANGLE" || node.type === "VECTOR" || node.type === "FRAME") && (
          <>
            <SceneFillsEditor node={node} updateNode={updateNode} />
            <SceneEffectsEditor node={node} updateNode={updateNode} />
            <div className={styles.section}>
              <div className={styles.label}>Fallback fill (when no fills)</div>
              <ColorRow
                label="Background"
                value={(props.backgroundColor as string) ?? (node.type === "FRAME" ? "#000000" : "#1c1c1e")}
                onChange={(v) => updateProps(node, updateNode, "backgroundColor", v)}
              />
            </div>
            <ColorRow
              label="Border"
              value={(props.borderColor as string) ?? "#30363d"}
              onChange={(v) => updateProps(node, updateNode, "borderColor", v)}
            />
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

        {/* Chart data */}
        {(node.name === "Bar Chart" || node.name === "Line Chart" || node.name === "Pie Chart") && (
          <div className={styles.section}>
            <div className={styles.label}>Data (comma-separated)</div>
            <input
              type="text"
              className={styles.standaloneInput}
              value={(props.data as string) ?? ""}
              placeholder={node.name === "Pie Chart" ? "50,30,20" : "60,85,45,90,70,55,80"}
              onChange={(e) => updateProps(node, updateNode, "data", e.target.value)}
            />
            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
              {node.name === "Pie Chart" ? "Slice sizes e.g. 50,30,20" : "Bar heights 0–100 e.g. 60,85,45"}
            </div>
          </div>
        )}

        {/* Tabs labels */}
        {node.name === "Tabs" && (
          <div className={styles.section}>
            <div className={styles.label}>Tab labels (comma-separated)</div>
            <input
              type="text"
              className={styles.standaloneInput}
              value={((props.tabs as string[]) ?? ["Tab 1", "Tab 2"]).join(", ")}
              placeholder="Tab 1, Tab 2, Tab 3"
              onChange={(e) => updateProps(node, updateNode, "tabs", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </div>
        )}

        {/* Accordion sections */}
        {node.name === "Accordion" && (
          <div className={styles.section}>
            <div className={styles.label}>Sections (comma-separated)</div>
            <input
              type="text"
              className={styles.standaloneInput}
              value={((props.sections as string[]) ?? ["Section 1", "Section 2", "Section 3"]).join(", ")}
              placeholder="Section 1, Section 2"
              onChange={(e) => updateProps(node, updateNode, "sections", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </div>
        )}

        {/* Carousel slides */}
        {node.name === "Carousel" && (
          <div className={styles.section}>
            <div className={styles.label}>Slides (comma-separated)</div>
            <input
              type="text"
              className={styles.standaloneInput}
              value={((props.slides as string[]) ?? ["Slide 1", "Slide 2", "Slide 3"]).join(", ")}
              placeholder="Slide 1, Slide 2, Slide 3"
              onChange={(e) => updateProps(node, updateNode, "slides", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </div>
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

        <PrototypeSection node={node} updateNode={updateNode} />

        <InteractionsPanel node={node} />
      </div>
    </div>
  );
}
