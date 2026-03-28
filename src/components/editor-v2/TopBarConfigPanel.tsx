"use client";

import { useState, useRef, type CSSProperties } from "react";
import {
  Monitor,
  Apple,
  SlidersHorizontal,
  Type,
  Palette,
  Layout,
  Blocks,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import { ColorPickerPopover } from "@/components/editor/ColorPickerPopover";
import {
  createDefaultTopBarConfig,
  createDefaultButtons,
  BLOCK_TYPE_OPTIONS,
  type TopBarConfig,
  type TopBarLayout,
  type TopBarButtonConfig,
  type Block,
  type BlockChain,
} from "@/lib/editor/blocks";
import type { SceneNode } from "@/lib/editor/types";
import { useToast } from "@/components/Toast";
import styles from "./TopBarConfigPanel.module.css";

function findNode(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

function findTitleTextNode(top: SceneNode): SceneNode | undefined {
  return (
    top.children?.find((c) => c.type === "TEXT" && c.name === "Window Title") ??
    top.children?.find((c) => c.type === "TEXT")
  );
}

function WindowChromeConfig({ node }: { node: SceneNode }) {
  const { updateNode, deleteNodes } = useEditorStore();
  const { show } = useToast();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [bgAnchor, setBgAnchor] = useState<HTMLElement | null>(null);

  const titleChild = findTitleTextNode(node);
  const title = String((titleChild?.props?.content as string) ?? "");
  const style = node.props?.style === "windows" ? "windows" : "macos";
  const bg = (node.props?.backgroundColor as string) ?? "#1a1a1e";
  const showTitle = node.props?.showTitle !== false;
  const showControls = node.props?.showControls !== false;
  const hex = /^#[0-9A-Fa-f]{3,8}$/.test(bg) ? bg : "#1a1a1e";

  const setTitle = (v: string) => {
    if (!titleChild) return;
    updateNode(titleChild.id, {
      props: { ...(titleChild.props ?? {}), content: v },
    });
  };

  const patchTop = (props: Record<string, unknown>) => {
    updateNode(node.id, { props: { ...(node.props ?? {}), ...props } });
  };

  const removeTopBar = () => {
    deleteNodes([node.id]);
    show(
      "Top bar removed. Drag window controls from Assets to other buttons to add OS-style controls.",
      "info"
    );
    setConfirmRemove(false);
  };

  return (
    <div className={styles.configPanel}>
      <div className={styles.configHeader}>
        <span>Window Chrome</span>
      </div>
      <div className={styles.configContent}>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Style</span>
          <div className={styles.chromeStyleRow}>
            <button
              type="button"
              className={`${styles.chromeStyleBtn} ${style === "macos" ? styles.chromeStyleBtnActive : ""}`}
              onClick={() => patchTop({ style: "macos" })}
            >
              macOS
            </button>
            <button
              type="button"
              className={`${styles.chromeStyleBtn} ${style === "windows" ? styles.chromeStyleBtnActive : ""}`}
              onClick={() => patchTop({ style: "windows" })}
            >
              Windows
            </button>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Title</span>
          <input
            type="text"
            className={styles.textInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Window title"
          />
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Background</span>
          <div className={styles.chromeColorRow}>
            <button
              type="button"
              className={styles.chromeSwatch}
              style={{ "--swatch": hex } as CSSProperties}
              onClick={(e) => setBgAnchor((a) => (a ? null : e.currentTarget))}
              aria-label="Pick background color"
            />
            <input
              type="text"
              className={styles.textInput}
              value={bg}
              onChange={(e) => patchTop({ backgroundColor: e.target.value })}
            />
          </div>
          {bgAnchor && (
            <ColorPickerPopover
              value={bg}
              onChange={(v) => patchTop({ backgroundColor: v })}
              anchor={bgAnchor}
              onClose={() => setBgAnchor(null)}
            />
          )}
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Height</span>
          <input
            type="number"
            className={styles.numberInput}
            min={24}
            max={120}
            value={node.height}
            onChange={(e) => updateNode(node.id, { height: Number(e.target.value) })}
          />
        </div>

        <label className={styles.chromeToggle}>
          <input
            type="checkbox"
            checked={showTitle}
            onChange={(e) => patchTop({ showTitle: e.target.checked })}
          />
          <span>Show title</span>
        </label>
        <label className={styles.chromeToggle}>
          <input
            type="checkbox"
            checked={showControls}
            onChange={(e) => patchTop({ showControls: e.target.checked })}
          />
          <span>Show controls</span>
        </label>

        <button type="button" className={styles.chromeRemoveBtn} onClick={() => setConfirmRemove(true)}>
          Remove top bar
        </button>
      </div>

      {confirmRemove && (
        <div className={styles.chromeConfirmOverlay}>
          <div className={styles.chromeConfirmBox}>
            <p className={styles.chromeConfirmText}>Remove top bar? Controls will be deleted.</p>
            <div className={styles.chromeConfirmActions}>
              <button type="button" className={styles.chromeCancelBtn} onClick={() => setConfirmRemove(false)}>
                Cancel
              </button>
              <button type="button" className={styles.chromeConfirmBtn} onClick={removeTopBar}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColorField({
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
    <div className={styles.colorField}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.colorInput}>
        <button
          type="button"
          className={styles.colorSwatch}
          style={{ background: hex }}
          onClick={(e) => setAnchor((a) => (a ? null : e.currentTarget))}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorHex}
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

interface TopBarConfigPanelProps {
  nodeId: string;
}

export function TopBarConfigPanel({ nodeId }: TopBarConfigPanelProps) {
  const { nodes, updateNode } = useEditorStore();
  const node = findNode(nodes, nodeId);
  const [activeSection, setActiveSection] = useState<string>("layout");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!node || node.type !== "TOPBAR") return null;

  if (node.props?.isTopBar === true) {
    return <WindowChromeConfig node={node} />;
  }

  const stored = node.props?._topBarConfig as TopBarConfig | undefined;
  const layout = (node.props?._topBarLayout as TopBarLayout) ?? "windows";
  const config: TopBarConfig = stored ?? createDefaultTopBarConfig(layout);

  const updateConfig = (patch: Partial<TopBarConfig>) => {
    const next = { ...config, ...patch };
    updateNode(node.id, { props: { ...(node.props ?? {}), _topBarConfig: next } });
  };

  const updateButton = (btnId: string, patch: Partial<TopBarButtonConfig>) => {
    const next = config.buttons.map((b) => (b.id === btnId ? { ...b, ...patch } : b));
    updateConfig({ buttons: next });
  };

  const addBlockToChain = (btnId: string) => {
    const btn = config.buttons.find((b) => b.id === btnId);
    if (!btn) return;
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type: "CUSTOM",
      label: "Custom Action",
      enabled: true,
    };
    const chain: BlockChain = {
      ...btn.blockChain,
      blocks: [...btn.blockChain.blocks, newBlock],
    };
    updateButton(btnId, { blockChain: chain });
  };

  const removeBlockFromChain = (btnId: string, blockId: string) => {
    const btn = config.buttons.find((b) => b.id === btnId);
    if (!btn) return;
    const chain: BlockChain = {
      ...btn.blockChain,
      blocks: btn.blockChain.blocks.filter((b) => b.id !== blockId),
    };
    updateButton(btnId, { blockChain: chain });
  };

  const updateBlockInChain = (btnId: string, blockId: string, patch: Partial<Block>) => {
    const btn = config.buttons.find((b) => b.id === btnId);
    if (!btn) return;
    const chain: BlockChain = {
      ...btn.blockChain,
      blocks: btn.blockChain.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    };
    updateButton(btnId, { blockChain: chain });
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateConfig({ iconSrc: reader.result as string, showIcon: true });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sections = [
    { id: "layout", label: "Layout", icon: Layout },
    { id: "text", label: "Text", icon: Type },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "icons", label: "Icons", icon: SlidersHorizontal },
    { id: "blocks", label: "Blocks", icon: Blocks },
  ];

  return (
    <div className={styles.configPanel}>
      <div className={styles.configHeader}>
        <span>Top Bar Config</span>
      </div>

      <div className={styles.tabs}>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`${styles.tab} ${activeSection === s.id ? styles.tabActive : ""}`}
            onClick={() => setActiveSection(s.id)}
            title={s.label}
          >
            <s.icon size={14} />
          </button>
        ))}
      </div>

      <div className={styles.configContent}>
        {activeSection === "layout" && (
          <>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Preset</span>
              <div className={styles.presetGrid}>
                {([
                  { value: "windows" as const, label: "Windows", icon: Monitor },
                  { value: "mac" as const, label: "macOS", icon: Apple },
                  { value: "custom" as const, label: "Custom", icon: SlidersHorizontal },
                ]).map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`${styles.presetBtn} ${config.layout === p.value ? styles.presetActive : ""}`}
                    onClick={() => {
                      const defaults = createDefaultTopBarConfig(p.value);
                      updateConfig({
                        layout: p.value,
                        titleAlign: defaults.titleAlign,
                        buttons: p.value === "custom" ? config.buttons : createDefaultButtons(),
                      });
                      updateNode(node.id, {
                        props: {
                          ...(node.props ?? {}),
                          _topBarLayout: p.value,
                          _topBarConfig: {
                            ...config,
                            layout: p.value,
                            titleAlign: defaults.titleAlign,
                            buttons: p.value === "custom" ? config.buttons : createDefaultButtons(),
                          },
                        },
                      });
                    }}
                  >
                    <p.icon size={16} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Height</span>
              <input
                type="number"
                className={styles.numberInput}
                min={24}
                max={64}
                value={config.height}
                onChange={(e) => {
                  const h = Number(e.target.value);
                  updateConfig({ height: h });
                  updateNode(node.id, { height: h });
                }}
              />
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Padding X</span>
              <input
                type="number"
                className={styles.numberInput}
                min={0}
                max={48}
                value={config.paddingX}
                onChange={(e) => updateConfig({ paddingX: Number(e.target.value) })}
              />
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Title Align</span>
              <div className={styles.segmented}>
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`${styles.segBtn} ${config.titleAlign === a ? styles.segActive : ""}`}
                    onClick={() => updateConfig({ titleAlign: a })}
                  >
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.borderBottom}
                onChange={(e) => updateConfig({ borderBottom: e.target.checked })}
              />
              <span>Border bottom</span>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.dragRegion}
                onChange={(e) => updateConfig({ dragRegion: e.target.checked })}
              />
              <span>Drag region</span>
            </label>

            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.doubleClickMaximize}
                onChange={(e) => updateConfig({ doubleClickMaximize: e.target.checked })}
              />
              <span>Double-click maximize</span>
            </label>
          </>
        )}

        {activeSection === "text" && (
          <>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Title</span>
              <input
                type="text"
                className={styles.textInput}
                value={config.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
                placeholder="Application title"
              />
            </div>

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Font Family</span>
              <input
                type="text"
                className={styles.textInput}
                value={config.fontFamily}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Size</span>
                <input
                  type="number"
                  className={styles.numberInput}
                  min={9}
                  max={24}
                  value={config.fontSize}
                  onChange={(e) => updateConfig({ fontSize: Number(e.target.value) })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Weight</span>
                <select
                  className={styles.selectInput}
                  value={config.fontWeight}
                  onChange={(e) => updateConfig({ fontWeight: e.target.value })}
                >
                  <option value="300">Light</option>
                  <option value="400">Regular</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi Bold</option>
                  <option value="700">Bold</option>
                </select>
              </div>
            </div>
          </>
        )}

        {activeSection === "colors" && (
          <>
            <ColorField
              label="Background"
              value={config.backgroundColor}
              onChange={(v) => updateConfig({ backgroundColor: v })}
            />
            <ColorField
              label="Text"
              value={config.textColor}
              onChange={(v) => updateConfig({ textColor: v })}
            />
            <ColorField
              label="Border"
              value={config.borderColor}
              onChange={(v) => updateConfig({ borderColor: v })}
            />

            <div className={styles.sectionDivider} />
            <span className={styles.fieldLabel}>Button Colors</span>

            {config.buttons.map((btn) => (
              <div key={btn.id} className={styles.btnColorGroup}>
                <span className={styles.btnColorLabel}>
                  {btn.type === "minimize" ? "Minimize" : btn.type === "maximize" ? "Maximize" : "Close"}
                </span>
                <ColorField
                  label="Hover"
                  value={btn.hoverColor ?? "rgba(255,255,255,0.1)"}
                  onChange={(v) => updateButton(btn.id, { hoverColor: v })}
                />
                <ColorField
                  label="Active"
                  value={btn.activeColor ?? "rgba(255,255,255,0.15)"}
                  onChange={(v) => updateButton(btn.id, { activeColor: v })}
                />
              </div>
            ))}
          </>
        )}

        {activeSection === "icons" && (
          <>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={config.showIcon}
                onChange={(e) => updateConfig({ showIcon: e.target.checked })}
              />
              <span>Show app icon</span>
            </label>

            {config.showIcon && (
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Icon</span>
                <div className={styles.iconUploadArea}>
                  {config.iconSrc ? (
                    <div className={styles.iconPreview}>
                      <img src={config.iconSrc} alt="App icon" className={styles.iconPreviewImg} />
                      <button
                        type="button"
                        className={styles.iconRemoveBtn}
                        onClick={() => updateConfig({ iconSrc: undefined })}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.iconPlaceholder}>
                      <span>Default</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className={styles.iconUploadBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Icon
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIconUpload}
                    style={{ display: "none" }}
                  />
                </div>
              </div>
            )}

            <div className={styles.sectionDivider} />
            <span className={styles.fieldLabel}>Control Icons</span>
            <p className={styles.hint}>
              Custom control button icons can be uploaded for minimize, maximize, and close buttons.
            </p>

            {config.buttons.map((btn) => (
              <div key={btn.id} className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>
                  {btn.type === "minimize" ? "Minimize" : btn.type === "maximize" ? "Maximize" : "Close"}
                </span>
                <div className={styles.iconRow}>
                  {btn.icon ? (
                    <img src={btn.icon} alt="" className={styles.customIcon} />
                  ) : (
                    <span className={styles.defaultIconLabel}>Default</span>
                  )}
                  <button
                    type="button"
                    className={styles.smallBtn}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateButton(btn.id, { icon: reader.result as string });
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }}
                  >
                    Upload
                  </button>
                  {btn.icon && (
                    <button
                      type="button"
                      className={styles.smallBtn}
                      onClick={() => updateButton(btn.id, { icon: undefined })}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {activeSection === "blocks" && (
          <>
            <p className={styles.hint}>
              Each button executes a chain of blocks. Add, remove, or reorder blocks to create custom behaviors.
            </p>

            {config.buttons.map((btn) => (
              <div key={btn.id} className={styles.blockSection}>
                <div className={styles.blockSectionHeader}>
                  <span className={styles.blockSectionTitle}>
                    {btn.type === "minimize" ? "Minimize" : btn.type === "maximize" ? "Maximize" : "Close"} Button
                  </span>
                  <button
                    type="button"
                    className={styles.blockAddBtn}
                    onClick={() => addBlockToChain(btn.id)}
                    title="Add block"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className={styles.blockList}>
                  {btn.blockChain.blocks.map((block, idx) => (
                    <div key={block.id} className={styles.blockItem}>
                      <GripVertical size={10} className={styles.blockGrip} />
                      <span className={styles.blockIndex}>{idx + 1}</span>
                      <select
                        className={styles.blockSelect}
                        value={block.type}
                        onChange={(e) => {
                          const opt = BLOCK_TYPE_OPTIONS.find((o) => o.value === e.target.value);
                          updateBlockInChain(btn.id, block.id, {
                            type: e.target.value as Block["type"],
                            label: opt?.label ?? "Custom",
                          });
                        }}
                      >
                        {BLOCK_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.blockRemoveBtn}
                        onClick={() => removeBlockFromChain(btn.id, block.id)}
                        title="Remove block"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}

                  {btn.blockChain.blocks.length === 0 && (
                    <div className={styles.blockEmpty}>No blocks assigned</div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
