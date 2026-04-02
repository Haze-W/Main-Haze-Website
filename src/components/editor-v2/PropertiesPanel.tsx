"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import {
  Image,
  Palette,
  Plus,
  Trash2,
  Zap,
  Pencil,
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
  Upload,
  PlusCircle,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ColorPickerPopover } from "@/components/editor/ColorPickerPopover";
import { TopBarConfigPanel } from "./TopBarConfigPanel";
import type { Paint as FigmaPaint } from "@/lib/figma/types";
import type { Paint as ScenePaint, Effect as SceneEffect, DropShadow, InnerShadow, BlurEffect } from "@/lib/editor/types";
import { GOOGLE_FONTS, loadGoogleFont } from "@/lib/editor/fonts";
import { BLOCK_TYPE_OPTIONS, TRANSITION_OPTIONS as BLOCK_TRANSITION_OPTIONS, HOVER_PRESETS } from "@/lib/editor/blocks";
import type { Interaction, Block, BlockType, BlockParams, InteractionList, HoverPreset } from "@/lib/editor/blocks";
import styles from "./PropertiesPanel.module.css";
import {
  hexToHsv,
  hsvToHex,
  isValidHex,
  normalizeHex,
} from "@/lib/color-utils";

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

function findAncestorTopBar(nodes: SceneNode[], nodeId: string): SceneNode | null {
  let cur = findNode(nodes, nodeId);
  while (cur) {
    if (cur.type === "TOPBAR") return cur;
    const pid = cur.parentId;
    if (!pid) return null;
    cur = findNode(nodes, pid);
  }
  return null;
}

/** 3×3 Figma-style alignment: [primaryAxis, counterAxis] per cell */
const ALIGN_GRID: [string, string][][] = [
  [["MIN", "MIN"], ["MIN", "CENTER"], ["MIN", "MAX"]],
  [["CENTER", "MIN"], ["CENTER", "CENTER"], ["CENTER", "MAX"]],
  [["MAX", "MIN"], ["MAX", "CENTER"], ["MAX", "MAX"]],
];

// ── NEW DESIGN SYSTEM COMPONENTS ─────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} onClick={() => setOpen(!open)}>
        <span style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.2s", fontSize: 10, display: "flex", alignItems: "center", color: "#666" }}>▼</span>
        <span className={styles.label}>{title}</span>
      </div>
      {open && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

function LayoutGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.layoutGrid}>{children}</div>;
}

function PropertyInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={styles.inputGroup}>
      <span className={styles.inputPrefix}>{label}</span>
      <input {...props} />
    </div>
  );
}

function PropertyNumberInput({ label, value, onChange, min, max, ...props }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "min" | "max">) {
  return (
    <div className={styles.inputGroup}>
      <span className={styles.inputPrefix}>{label}</span>
      <NumberInput value={value} onChange={onChange} min={min} max={max} {...props} />
    </div>
  );
}

function VisualSpacingWidget({
  padding,
  onPaddingChange,
}: {
  padding: { top: number; right: number; bottom: number; left: number };
  onPaddingChange: (key: keyof typeof padding, val: number) => void;
}) {
  return (
    <div className={styles.spacingWidget}>
      <div className={styles.spacingOuter}>
        <div className={styles.spacingValue + " " + styles.spacingT} onClick={() => {
          const val = prompt("Padding Top", String(padding.top));
          if (val !== null) onPaddingChange("top", Number(val));
        }}>{padding.top}</div>
        <div className={styles.spacingValue + " " + styles.spacingB} onClick={() => {
          const val = prompt("Padding Bottom", String(padding.bottom));
          if (val !== null) onPaddingChange("bottom", Number(val));
        }}>{padding.bottom}</div>
        <div className={styles.spacingValue + " " + styles.spacingL} onClick={() => {
          const val = prompt("Padding Left", String(padding.left));
          if (val !== null) onPaddingChange("left", Number(val));
        }}>{padding.left}</div>
        <div className={styles.spacingValue + " " + styles.spacingR} onClick={() => {
          const val = prompt("Padding Right", String(padding.right));
          if (val !== null) onPaddingChange("right", Number(val));
        }}>{padding.right}</div>
      </div>
      <div className={styles.spacingInner}>
        <div className={styles.spacingLink}>
          <Scaling size={16} />
        </div>
      </div>
    </div>
  );
}


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
    <Section title="Auto Layout">
      {layoutMode === "NONE" && (
        <button
          type="button"
          className={styles.standaloneInput}
          style={{ color: "var(--accent)", fontWeight: 600 }}
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
          + Add Auto Layout
        </button>
      )}
      {isAuto && (
        <>
          <div className={styles.row}>
            <div className={styles.directionBtnGroup}>
              <button
                type="button"
                className={`${styles.directionIconBtn} ${layoutMode === "HORIZONTAL" ? styles.directionIconBtnActive : ""}`}
                onClick={() => updateNode(node.id, { layoutMode: "HORIZONTAL" })}
              >
                <ArrowLeftRight size={16} />
              </button>
              <button
                type="button"
                className={`${styles.directionIconBtn} ${layoutMode === "VERTICAL" ? styles.directionIconBtnActive : ""}`}
                onClick={() => updateNode(node.id, { layoutMode: "VERTICAL" })}
              >
                <ArrowUpDown size={16} />
              </button>
            </div>
            <PropertyNumberInput
              label="Gap"
              value={node.itemSpacing ?? 0}
              onChange={(v) => updateNode(node.id, { itemSpacing: v })}
            />
          </div>

          <div className={styles.label} style={{ marginTop: 12 }}>Dimensions</div>
          <div className={styles.row}>
            <PropertyNumberInput
              label="W"
              value={node.width}
              onChange={(v) => updateNode(node.id, { width: v })}
            />
            <PropertyNumberInput
              label="H"
              value={node.height}
              onChange={(v) => updateNode(node.id, { height: v })}
            />
          </div>

          <div className={styles.label} style={{ marginTop: 12 }}>Padding</div>
          <VisualSpacingWidget
            padding={{
              top: node.paddingTop ?? 0,
              right: node.paddingRight ?? 0,
              bottom: node.paddingBottom ?? 0,
              left: node.paddingLeft ?? 0,
            }}
            onPaddingChange={(key, val) => {
              const k = `padding${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof SceneNode;
              updateNode(node.id, { [k]: val });
            }}
          />

          <div className={styles.label} style={{ marginTop: 12 }}>Alignment</div>
          <div className={styles.alignGrid9} style={{ margin: "8px 0" }}>
            {ALIGN_GRID.map((row, ri) =>
              row.map(([p, c], ci) => {
                const active = primary === p && counter === c && primary !== "SPACE_BETWEEN";
                return (
                  <button
                    key={`${ri}-${ci}`}
                    type="button"
                    className={`${styles.alignCell9} ${active ? styles.alignCell9Active : ""}`}
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

          <label className={styles.checkboxModern}>
            <div className={styles.checkboxTrack}>
              <input
                type="checkbox"
                checked={node.layoutWrap === "WRAP"}
                onChange={(e) => updateNode(node.id, { layoutWrap: e.target.checked ? "WRAP" : "NO_WRAP" })}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxThumb} />
            </div>
            <span>Wrap items</span>
          </label>

          <button
            type="button"
            className={styles.clearAutoLayoutBtn}
            style={{ marginTop: 12, fontSize: 11, color: "#ff453a" }}
            onClick={() => updateNode(node.id, { layoutMode: "NONE" })}
          >
            Remove auto layout
          </button>
        </>
      )}
    </Section>
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
        <span className={styles.fontSelectorArrow}>&#9660;</span>
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

function ColorPickerStatic({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const hex = isValidHex(value) ? normalizeHex(value) : "#888888";
  const initial = hexToHsv(hex) ?? { h: 0, s: 0, v: 0.5 };
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [v, setV] = useState(initial.v);
  const [isDragging, setIsDragging] = useState<"sv" | "h" | null>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);

  const currentHex = hsvToHex(h, s, v);

  const updateFromHsv = useCallback((nh: number, ns: number, nv: number) => {
    setH(nh);
    setS(ns);
    setV(nv);
    const newHex = hsvToHex(nh, ns, nv);
    onChange(newHex);
  }, [onChange]);

  const handleSvMove = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    updateFromHsv(h, x, y);
  }, [h, updateFromHsv]);

  const handleHMove = useCallback((clientX: number) => {
    const el = hRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    updateFromHsv(x * 360, s, v);
  }, [s, v, updateFromHsv]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging === "sv") handleSvMove(e.clientX, e.clientY);
      else if (isDragging === "h") handleHMove(e.clientX);
    };
    const onMouseUp = () => setIsDragging(null);
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, handleSvMove, handleHMove]);

  return (
    <div className={styles.staticColorPicker}>
      <div 
        ref={svRef}
        className={styles.staticSvArea}
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 1, 1)})` }}
        onMouseDown={(e) => { e.preventDefault(); setIsDragging("sv"); handleSvMove(e.clientX, e.clientY); }}
      >
        <div 
          className={styles.staticSvCursor} 
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: currentHex }}
        />
      </div>
      <div className={styles.staticTools}>
        <div 
          ref={hRef}
          className={styles.staticHueBar}
          onMouseDown={(e) => { e.preventDefault(); setIsDragging("h"); handleHMove(e.clientX); }}
        >
          <div className={styles.staticHueCursor} style={{ left: `${(h / 360) * 100}%` }} />
        </div>
        <div className={styles.staticHexRow}>
           <div className={styles.swatchSm} style={{ background: currentHex, width: 20, height: 20, borderRadius: 4, flexShrink: 0 }} />
           <input 
             className={styles.colorHexInput} 
             value={currentHex.toUpperCase()} 
             onChange={(e) => { if (isValidHex(e.target.value)) onChange(e.target.value); }}
           />
        </div>
      </div>
    </div>
  );
}

function DirectImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange(url);
    e.target.value = "";
  };

  return (
    <div className={styles.row} style={{ gap: 8 }}>
      <input
        type="text"
        className={styles.colorHexInput}
        style={{ flex: 1, fontFamily: "sans-serif" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://image-url"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      <button
        type="button"
        className={styles.toolBtn}
        style={{ width: 32, height: 32, background: "#000", border: "1px solid #333", borderRadius: 6 }}
        onClick={() => fileInputRef.current?.click()}
        title="Upload Image"
      >
        <Upload size={14} />
      </button>
    </div>
  );
}

type FillMode = "solid" | "gradient" | "pattern" | "picture";

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
    if (value.includes("pattern")) return "pattern";
    if (value.startsWith("url(")) return "picture";
    if (value.includes("gradient")) return "gradient";
    return "solid";
  });
  const [gradientAngle, setGradientAngle] = useState(90);
  const [gradientFrom, setGradientFrom] = useState("#5e5ce6");
  const [gradientTo, setGradientTo] = useState("#ff6b6b");
  const [imageUrl, setImageUrl] = useState(value.startsWith("url(") ? value.replace(/^url\(["']?|["']?\)$/g, "") : "");
  
  // Pattern states (Two pickers)
  const [patternUrl, setPatternUrl] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");

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
    setMode("picture");
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
          {(["solid", "gradient", "pattern", "picture"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.colorTab} ${mode === m ? styles.colorTabActive : ""}`}
              onClick={() => setMode(m)}
            >
              <span style={{ textTransform: "capitalize" }}>{m}</span>
            </button>
          ))}
        </div>

        {mode === "solid" && (
          <div style={{ padding: "0 12px 12px 12px" }}>
             <ColorPickerStatic value={value} onChange={handleSolidChange} />
          </div>
        )}

        {mode === "pattern" && (
          <div className={styles.directImagePicker}>
            <div className={styles.imagePickerLabel}>Pattern Base</div>
            <DirectImagePicker 
               value={patternUrl} 
               onChange={(url) => {
                 setPatternUrl(url);
                 onChange(url ? `url("${url}") pattern` : "#1e1e1e");
               }} 
            />
            <div className={styles.imagePickerLabel}>Overlay Mask</div>
            <DirectImagePicker 
               value={overlayUrl} 
               onChange={(url) => {
                 setOverlayUrl(url);
                 // Logic for multi-layer patterns could go here
               }} 
            />
          </div>
        )}

        {mode === "picture" && (
          <div className={styles.directImagePicker}>
            <div className={styles.imagePickerLabel}>Background Image</div>
            <DirectImagePicker 
               value={imageUrl} 
               onChange={handleImageUrl} 
            />
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
        className={`${styles.colorSwatchBtn} ${styles.swatchSm20}`}
        style={{ background: hex }}
        onClick={(e) => setAnchor((a) => (a ? null : e.currentTarget))}
      />
      {anchor && (
        <ColorPickerPopover
          value={value}
          onChange={onChange}
          anchor={anchor}
          onClose={() => setAnchor(null)}
          onContrastChange={(isLight: boolean) => {/* Optional */}}
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
    <Section title="Backgrounds">
      <div className={styles.row} style={{ marginBottom: 12 }}>
        <div className={styles.colorPickerTabs} style={{ flex: 1, height: 32 }}>
          {["SOLID", "GRADIENT_LINEAR", "IMAGE"].map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.colorTab} ${fills[0]?.type === t ? styles.colorTabActive : ""}`}
              onClick={() => fills.length ? setFillType(0, t as ScenePaint["type"]) : setFills([defaultSolidFill()])}
              style={{ fontSize: 10 }}
            >
              {t.replace("GRADIENT_LINEAR", "Gradient").replace("SOLID", "Solid").replace("IMAGE", "Image")}
            </button>
          ))}
        </div>
      </div>

      {fills.map((fill, i) => (
        <div key={i} className={styles.sceneFillCard} style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 8 }}>
          <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <span className={styles.label} style={{ textTransform: "none" }}>{fill.type.replace("_", " ").toLowerCase()}</span>
            <button type="button" onClick={() => removeFill(i)}><Trash2 size={12} color="#666" /></button>
          </div>

          {fill.type === "SOLID" && (
            <div className={styles.row}>
              <SceneSwatchColorPicker value={fill.color} onChange={(v) => replaceFill(i, { ...fill, color: v })} />
              <PropertyInput label="#" value={fill.color} onChange={(e) => replaceFill(i, { ...fill, color: e.target.value })} style={{ fontFamily: "monospace" }} />
              <PropertyNumberInput label="%" value={Math.round((fill.opacity ?? 1) * 100)} onChange={(v) => replaceFill(i, { ...fill, opacity: v / 100 })} style={{ width: 60 }} />
            </div>
          )}

          {(fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL") && (
            <div className={styles.row}>
              <GradientStopPicker label="S" value={fill.stops[0]?.color ?? "#5e5ce6"} onChange={(v) => {
                const stops = [...fill.stops];
                stops[0] = { position: 0, color: v };
                replaceFill(i, { ...fill, stops });
              }} />
              <GradientStopPicker label="E" value={fill.stops[1]?.color ?? "#ff6b6b"} onChange={(v) => {
                const stops = [...fill.stops];
                stops[1] = { position: 1, color: v };
                replaceFill(i, { ...fill, stops });
              }} />
              <PropertyNumberInput label="Angle" value={fill.angle ?? 90} onChange={(v) => replaceFill(i, { ...fill, angle: v })} />
            </div>
          )}

          {fill.type === "IMAGE" && (
            <PropertyInput label="URL" value={fill.src ?? ""} onChange={(e) => replaceFill(i, { ...fill, src: e.target.value })} placeholder="https://..." />
          )}
        </div>
      ))}

      {!fills.length && (
        <button
          className={styles.standaloneInput}
          onClick={() => setFills([defaultSolidFill()])}
        >+ Add Fill</button>
      )}
    </Section>
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

  const removeEffect = (index: number) => {
    setEffects(effects.filter((_, i) => i !== index));
  };

  const updateEffect = (index: number, eff: SceneEffect) => {
    const next = [...effects];
    next[index] = eff;
    setEffects(next);
  };

  return (
    <Section title="Effects">
      {effects.map((eff, i) => (
        <div key={i} className={styles.sceneFillCard} style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 8 }}>
          <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <span className={styles.label} style={{ textTransform: "none" }}>{eff.type.replace("_", " ").toLowerCase()}</span>
            <button type="button" onClick={() => removeEffect(i)}><Trash2 size={12} color="#666" /></button>
          </div>

          {(eff.type === "DROP_SHADOW" || eff.type === "INNER_SHADOW") && (
            <>
              <div className={styles.row}>
                <PropertyNumberInput label="X" value={eff.offsetX ?? 0} onChange={(v) => updateEffect(i, { ...eff, offsetX: v })} />
                <PropertyNumberInput label="Y" value={eff.offsetY ?? 0} onChange={(v) => updateEffect(i, { ...eff, offsetY: v })} />
              </div>
              <div className={styles.row} style={{ marginTop: 8 }}>
                <PropertyNumberInput label="Blur" value={eff.blur ?? 4} onChange={(v) => updateEffect(i, { ...eff, blur: v })} />
                <div className={styles.row} style={{ background: "#0f0f0f", padding: "4px 8px", borderRadius: 6, border: "1px solid #333", flex: 1 }}>
                  <SceneSwatchColorPicker value={eff.color ?? "#000000"} onChange={(v) => updateEffect(i, { ...eff, color: v })} />
                  <span style={{ fontSize: 10, color: "#666", marginLeft: 4 }}>Shadow</span>
                </div>
              </div>
            </>
          )}

          {eff.type === "LAYER_BLUR" && (
            <PropertyNumberInput label="Radius" value={eff.radius ?? 8} onChange={(v) => updateEffect(i, { ...eff, radius: v })} />
          )}
        </div>
      ))}

      <button
        className={styles.standaloneInput}
        style={{ color: "#7c3aed" }}
        onClick={() => setEffects([...effects, { type: "DROP_SHADOW", color: "#00000033", blur: 4, offsetX: 0, offsetY: 2, opacity: 0.2, spread: 0 }])}
      >+ Add Effect</button>
    </Section>
  );
}

function AutoLayoutChildSection({
  node,
  updateNode,
}: {
  node: SceneNode;
  updateNode: (id: string, p: Partial<SceneNode>) => void;
}) {
  return (
    <Section title="Resizing">
      <div className={styles.row}>
        <div style={{ flex: 1 }}>
          <div className={styles.label} style={{ marginBottom: 4 }}>Horizontal</div>
          <select
            className={styles.select}
            value={node.layoutGrow ? "FILL" : node.primaryAxisSizingMode === "AUTO" ? "HUG" : "FIXED"}
            onChange={(e) => {
              const val = e.target.value;
              updateNode(node.id, {
                layoutGrow: val === "FILL" ? 1 : 0,
                primaryAxisSizingMode: val === "HUG" ? "AUTO" : "FIXED",
              });
            }}
          >
            <option value="FIXED">Fixed width</option>
            <option value="HUG">Hug contents</option>
            <option value="FILL">Fill container</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div className={styles.label} style={{ marginBottom: 4 }}>Vertical</div>
          <select
            className={styles.select}
            value={node.layoutAlign === "STRETCH" ? "FILL" : node.counterAxisSizingMode === "AUTO" ? "HUG" : "FIXED"}
            onChange={(e) => {
              const val = e.target.value;
              updateNode(node.id, {
                layoutAlign: val === "FILL" ? "STRETCH" : "INHERIT",
                counterAxisSizingMode: val === "HUG" ? "AUTO" : "FIXED",
              });
            }}
          >
            <option value="FIXED">Fixed height</option>
            <option value="HUG">Hug contents</option>
            <option value="FILL">Fill container</option>
          </select>
        </div>
      </div>
    </Section>
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

        <Section title="Appearance">
          <LayoutGrid>
            <PropertyNumberInput
              label="Opacity"
              value={Math.round((node.opacity ?? 1) * 100)}
              onChange={(v) => updateNode(node.id, { opacity: v / 100 })}
              min={0}
              max={100}
            />
            <PropertyNumberInput
              label="Rotation"
              value={Math.round(node.rotation ?? 0)}
              onChange={(v) => updateNode(node.id, { rotation: v })}
            />
          </LayoutGrid>
          <div style={{ marginTop: 12 }}>
            <PropertyNumberInput
              label="Corners"
              value={(node.props?.cornerRadius as number) ?? 0}
              onChange={(v) => updateNode(node.id, { props: { ...(node.props ?? {}), cornerRadius: v } })}
              min={0}
            />
          </div>
          <div style={{ marginTop: 12 }}>
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
        </Section>
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
        <Section title="Background">
          <PageColorPicker label="Color" value={canvasBg} onChange={setCanvasBg} />
        </Section>

        <Section title="Grid">
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

          {showGrid && (
            <div style={{ marginTop: 12 }}>
              <div className={styles.label} style={{ marginBottom: 8 }}>Grid style</div>
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
        </Section>
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

/** Prototype “Navigate” transition labels (stored on interactions; distinct from block transition keys). */
const PROTOTYPE_NAVIGATE_TRANSITIONS = ["Instant", "Dissolve", "Push Left", "Push Right", "Slide Up"] as const;

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
              {PROTOTYPE_NAVIGATE_TRANSITIONS.map((t) => (
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
  ON_CLICK: "ON CLICK",
  ON_HOVER: "ON HOVER",
  ON_HOVER_END: "ON HOVER END",
  ON_CHANGE: "ON CHANGE",
  ON_LOAD: "ON LOAD",
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
              {BLOCK_TRANSITION_OPTIONS.map((o) => (
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
    <div className={styles.interactionCard} style={{ background: "#1a1a1a", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #333" }}>
      <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <select
          className={styles.select}
          style={{ width: "auto", minWidth: 120 }}
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
        <button type="button" onClick={onRemove} title="Remove interaction">
          <Trash2 size={14} color="#666" />
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

      <button
        type="button"
        className={styles.standaloneInput}
        style={{ marginTop: 8, fontSize: 11, background: "#0f0f0f" }}
        onClick={addBlock}
      >
        <Plus size={12} style={{ marginRight: 4 }} /> Add action
      </button>
    </div>
  );
}

function InteractionsPanel({ node, updateNode }: { node: SceneNode; updateNode: (id: string, p: Partial<SceneNode>) => void }) {
  const interactions = (node.props?.interactions as InteractionList) ?? [];
  const hoverPreset = (node.props?.hoverPreset as HoverPreset) ?? "none";
  const nodes = useEditorStore((s) => s.nodes);

  const setInteractionsList = (list: InteractionList) => {
    updateNode(node.id, {
      props: {
        ...(node.props ?? {}),
        interactions: list,
      },
    });
  };

  const addInteraction = () => {
    const next: Interaction = {
      id: uid(),
      trigger: "ON_CLICK",
      blocks: [
        { id: uid(), type: "NAVIGATE_TO_FRAME", label: "Navigate", enabled: true, params: {} }
      ],
    };
    setInteractionsList([...interactions, next]);
  };

  return (
    <>
      <Section title="Interactions">
        <div className={styles.label} style={{ marginBottom: 8 }}>Hover Preset</div>
        <select
          className={styles.select}
          value={hoverPreset}
          onChange={(e) => updateNode(node.id, { props: { ...(node.props ?? {}), hoverPreset: e.target.value as HoverPreset } })}
        >
          {HOVER_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <div style={{ marginTop: 16 }}>
          {interactions.map((interaction, idx) => (
            <InteractionEditor
              key={interaction.id}
              interaction={interaction}
              nodes={nodes}
              onChange={(i) => {
                const next = [...interactions];
                next[idx] = i;
                setInteractionsList(next);
              }}
              onRemove={() => {
                setInteractionsList(interactions.filter((_, i) => i !== idx));
              }}
            />
          ))}
        </div>

        <button
          className={styles.standaloneInput}
          style={{ marginTop: 8, color: "var(--accent)" }}
          onClick={addInteraction}
        >
          <Plus size={12} style={{ marginRight: 4 }} /> Add Interaction
        </button>
      </Section>
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

  const topBarAncestor = findAncestorTopBar(nodes, selectedId);
  if (topBarAncestor) {
    return <TopBarConfigPanel nodeId={topBarAncestor.id} />;
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
        <Section title="General">
          <div className={styles.label} style={{ marginBottom: 8 }}>Name</div>
          <input
            type="text"
            className={styles.standaloneInput}
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
          />
        </Section>

        <Section title="Layout">
          <LayoutGrid>
            <PropertyNumberInput
              label="X"
              value={Math.round(node.x)}
              onChange={(v) => updateNode(node.id, { x: v })}
            />
            <PropertyNumberInput
              label="Y"
              value={Math.round(node.y)}
              onChange={(v) => updateNode(node.id, { y: v })}
            />
            <PropertyNumberInput
              label="W"
              value={Math.round(node.width)}
              onChange={(v) => updateNode(node.id, { width: v })}
            />
            <PropertyNumberInput
              label="H"
              value={Math.round(node.height)}
              onChange={(v) => updateNode(node.id, { height: v })}
            />
          </LayoutGrid>
        </Section>

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
            return p ? <AutoLayoutChildSection node={node} updateNode={updateNode} /> : null;
          })()}

        {(node.type === "FRAME" || node.type === "CONTAINER") && (
          <AutoLayoutFrameSection node={node} updateNode={updateNode} />
        )}

        {(node.type === "TEXT" || node.name === "Label") && (
          <>
            <Section title="Text">
              <div className={styles.label} style={{ marginBottom: 8 }}>Content</div>
              <textarea
                className={styles.contentTextarea}
                value={(props.content as string) ?? ""}
                onChange={(e) => updateProps(node, updateNode, "content", e.target.value)}
                placeholder="Text content"
                rows={3}
              />

              <div className={styles.label} style={{ margin: "12px 0 8px" }}>Typography</div>
              <FontSelector
                value={(props.fontFamily as string) ?? "Inter"}
                onChange={(v) => {
                  loadGoogleFont(v);
                  updateProps(node, updateNode, "fontFamily", v);
                }}
              />
              <LayoutGrid>
                <select
                  value={(props.fontWeight as string) ?? "normal"}
                  onChange={(e) => updateProps(node, updateNode, "fontWeight", e.target.value)}
                  className={styles.select}
                  style={{ marginTop: 8 }}
                >
                  <option value="normal">Regular</option>
                  <option value="medium">Medium</option>
                  <option value="bold">Bold</option>
                </select>
                <PropertyNumberInput
                  label="Size"
                  style={{ marginTop: 8 }}
                  value={(props.fontSize as number) ?? 14}
                  onChange={(v) => updateProps(node, updateNode, "fontSize", v)}
                />
              </LayoutGrid>
              <LayoutGrid>
                <PropertyNumberInput
                  label="L-S"
                  style={{ marginTop: 8 }}
                  title="Letter Spacing"
                  value={(props.letterSpacing as number) ?? 0}
                  onChange={(v) => updateProps(node, updateNode, "letterSpacing", v)}
                />
                <PropertyInput
                  label="L-H"
                  style={{ marginTop: 8 }}
                  title="Line Height"
                  value={String((props.lineHeight as string | number) ?? "auto")}
                  onChange={(e) => updateProps(node, updateNode, "lineHeight", e.target.value)}
                />
              </LayoutGrid>
              <div className={styles.row} style={{ marginTop: 8 }}>
                 <select
                  value={(props.textAlign as string) ?? "left"}
                  onChange={(e) => updateProps(node, updateNode, "textAlign", e.target.value)}
                  className={styles.select}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <div className={styles.row} style={{ background: "rgba(0,0,0,0.04)", padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.08)", flex: 1 }}>
                  <SceneSwatchColorPicker
                    value={(props.color as string) ?? "#ffffff"}
                    onChange={(v) => updateProps(node, updateNode, "color", v)}
                  />
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#666", marginLeft: 4 }}>
                    {(props.color as string ?? "#ffffff").toUpperCase()}
                  </span>
                </div>
              </div>
            </Section>
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

        <InteractionsPanel node={node} updateNode={updateNode} />
      </div>
    </div>
  );
}
