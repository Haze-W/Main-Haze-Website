"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Zap,
  Play,
  Clock,
  RotateCcw,
  Move,
  Maximize2,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor/store";
import type { SceneNode } from "@/lib/editor/types";
import styles from "./AnimationsPanel.module.css";

/* ── Types ──────────────────────────────────────────────────────── */

type EasingCurve =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "spring";

interface AnimationKeyframe {
  id: string;
  offset: number; // 0–100
  opacity?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
}

interface AnimationConfig {
  enabled: boolean;
  trigger: "entrance" | "exit" | "hover" | "scroll";
  duration: number;
  delay: number;
  easing: EasingCurve;
  iterations: number | "infinite";
  keyframes: AnimationKeyframe[];
}

const DEFAULT_KEYFRAME_START: AnimationKeyframe = {
  id: "kf-start",
  offset: 0,
  opacity: 0,
  translateY: 20,
  scale: 1,
  rotate: 0,
};

const DEFAULT_KEYFRAME_END: AnimationKeyframe = {
  id: "kf-end",
  offset: 100,
  opacity: 1,
  translateY: 0,
  scale: 1,
  rotate: 0,
};

const ANIMATION_PRESETS: {
  label: string;
  icon: string;
  config: Partial<AnimationConfig>;
}[] = [
  {
    label: "Fade In",
    icon: "◐",
    config: {
      trigger: "entrance",
      duration: 400,
      easing: "ease-out",
      keyframes: [
        { id: "p1-0", offset: 0, opacity: 0 },
        { id: "p1-1", offset: 100, opacity: 1 },
      ],
    },
  },
  {
    label: "Slide Up",
    icon: "↑",
    config: {
      trigger: "entrance",
      duration: 500,
      easing: "ease-out",
      keyframes: [
        { id: "p2-0", offset: 0, opacity: 0, translateY: 30 },
        { id: "p2-1", offset: 100, opacity: 1, translateY: 0 },
      ],
    },
  },
  {
    label: "Scale In",
    icon: "⊕",
    config: {
      trigger: "entrance",
      duration: 350,
      easing: "ease-out",
      keyframes: [
        { id: "p3-0", offset: 0, opacity: 0, scale: 0.8 },
        { id: "p3-1", offset: 100, opacity: 1, scale: 1 },
      ],
    },
  },
  {
    label: "Bounce",
    icon: "⚡",
    config: {
      trigger: "entrance",
      duration: 600,
      easing: "spring",
      keyframes: [
        { id: "p4-0", offset: 0, translateY: -40, opacity: 0 },
        { id: "p4-1", offset: 50, translateY: 8 },
        { id: "p4-2", offset: 75, translateY: -4 },
        { id: "p4-3", offset: 100, translateY: 0, opacity: 1 },
      ],
    },
  },
  {
    label: "Rotate In",
    icon: "↻",
    config: {
      trigger: "entrance",
      duration: 500,
      easing: "ease-out",
      keyframes: [
        { id: "p5-0", offset: 0, opacity: 0, rotate: -15, scale: 0.9 },
        { id: "p5-1", offset: 100, opacity: 1, rotate: 0, scale: 1 },
      ],
    },
  },
  {
    label: "Pulse",
    icon: "◉",
    config: {
      trigger: "hover",
      duration: 800,
      easing: "ease-in-out",
      iterations: "infinite" as const,
      keyframes: [
        { id: "p6-0", offset: 0, scale: 1 },
        { id: "p6-1", offset: 50, scale: 1.05 },
        { id: "p6-2", offset: 100, scale: 1 },
      ],
    },
  },
];

const EASING_OPTIONS: { value: EasingCurve; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In-Out" },
  { value: "spring", label: "Spring" },
];

const TRIGGER_OPTIONS: { value: AnimationConfig["trigger"]; label: string }[] = [
  { value: "entrance", label: "On Enter" },
  { value: "exit", label: "On Exit" },
  { value: "hover", label: "On Hover" },
  { value: "scroll", label: "On Scroll" },
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function findNode(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

/* ── Panel ───────────────────────────────────────────────────────── */

export function AnimationsPanel() {
  const nodes = useEditorStore((s) => s.nodes);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateNode = useEditorStore((s) => s.updateNode);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const selectedId = useMemo(
    () => (selectedIds.size === 1 ? [...selectedIds][0] : null),
    [selectedIds]
  );
  const selectedNode = useMemo(
    () => (selectedId ? findNode(nodes, selectedId) : null),
    [nodes, selectedId]
  );

  const [activeSection, setActiveSection] = useState<"presets" | "config" | "keyframes">("presets");

  const animation: AnimationConfig | null = useMemo(() => {
    if (!selectedNode) return null;
    const stored = selectedNode.props?._animation as AnimationConfig | undefined;
    return stored ?? null;
  }, [selectedNode]);

  const updateAnimation = useCallback(
    (patch: Partial<AnimationConfig>) => {
      if (!selectedNode) return;
      const current: AnimationConfig = animation ?? {
        enabled: true,
        trigger: "entrance",
        duration: 400,
        delay: 0,
        easing: "ease-out",
        iterations: 1,
        keyframes: [DEFAULT_KEYFRAME_START, DEFAULT_KEYFRAME_END],
      };
      const next = { ...current, ...patch };
      updateNode(selectedNode.id, {
        props: { ...(selectedNode.props ?? {}), _animation: next },
      });
      pushHistory();
    },
    [selectedNode, animation, updateNode, pushHistory]
  );

  const removeAnimation = useCallback(() => {
    if (!selectedNode) return;
    const { _animation, ...rest } = (selectedNode.props ?? {}) as Record<string, unknown>;
    updateNode(selectedNode.id, { props: rest });
    pushHistory();
  }, [selectedNode, updateNode, pushHistory]);

  const applyPreset = useCallback(
    (preset: (typeof ANIMATION_PRESETS)[0]) => {
      updateAnimation({
        enabled: true,
        trigger: preset.config.trigger ?? "entrance",
        duration: preset.config.duration ?? 400,
        delay: 0,
        easing: preset.config.easing ?? "ease-out",
        iterations: preset.config.iterations ?? 1,
        keyframes: preset.config.keyframes ?? [DEFAULT_KEYFRAME_START, DEFAULT_KEYFRAME_END],
      });
    },
    [updateAnimation]
  );

  /* ── Empty State ──────────────────────────────────────────────── */

  if (!selectedNode) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <Zap size={28} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Animations</p>
          <p className={styles.emptyDesc}>
            Select an element on the canvas to configure its animations and transitions.
          </p>
        </div>
      </div>
    );
  }

  /* ── Main Panel ───────────────────────────────────────────────── */

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Zap size={14} />
          <span>{selectedNode.name}</span>
        </div>
        {animation && (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={removeAnimation}
            title="Remove animation"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className={styles.tabs}>
        {(
          [
            { id: "presets" as const, label: "Presets", icon: Zap },
            { id: "config" as const, label: "Settings", icon: Clock },
            { id: "keyframes" as const, label: "Keyframes", icon: Play },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeSection === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveSection(tab.id)}
          >
            <tab.icon size={12} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* ── Presets ────────────────────────────────────────────── */}
        {activeSection === "presets" && (
          <div className={styles.presetsGrid}>
            {ANIMATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.presetCard}
                onClick={() => applyPreset(preset)}
              >
                <span className={styles.presetIcon}>{preset.icon}</span>
                <span className={styles.presetLabel}>{preset.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Configuration ─────────────────────────────────────── */}
        {activeSection === "config" && (
          <div className={styles.configSection}>
            {!animation ? (
              <div className={styles.noAnimation}>
                <p>No animation configured. Pick a preset or add one manually.</p>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() =>
                    updateAnimation({
                      enabled: true,
                      trigger: "entrance",
                      duration: 400,
                      delay: 0,
                      easing: "ease-out",
                      iterations: 1,
                      keyframes: [DEFAULT_KEYFRAME_START, DEFAULT_KEYFRAME_END],
                    })
                  }
                >
                  <Plus size={12} /> Add Animation
                </button>
              </div>
            ) : (
              <>
                {/* Enable toggle */}
                <label className={styles.toggle}>
                  <div className={styles.toggleTrack}>
                    <input
                      type="checkbox"
                      checked={animation.enabled}
                      onChange={(e) => updateAnimation({ enabled: e.target.checked })}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleThumb} />
                  </div>
                  <span>Enabled</span>
                </label>

                {/* Trigger */}
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Trigger</span>
                  <select
                    className={styles.select}
                    value={animation.trigger}
                    onChange={(e) =>
                      updateAnimation({ trigger: e.target.value as AnimationConfig["trigger"] })
                    }
                  >
                    {TRIGGER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Duration</span>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.numberInput}
                      value={animation.duration}
                      min={0}
                      max={10000}
                      step={50}
                      onChange={(e) => updateAnimation({ duration: Number(e.target.value) })}
                    />
                    <span className={styles.unit}>ms</span>
                  </div>
                </div>

                {/* Delay */}
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Delay</span>
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      className={styles.numberInput}
                      value={animation.delay}
                      min={0}
                      max={5000}
                      step={50}
                      onChange={(e) => updateAnimation({ delay: Number(e.target.value) })}
                    />
                    <span className={styles.unit}>ms</span>
                  </div>
                </div>

                {/* Easing */}
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Easing</span>
                  <select
                    className={styles.select}
                    value={animation.easing}
                    onChange={(e) => updateAnimation({ easing: e.target.value as EasingCurve })}
                  >
                    {EASING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Iterations */}
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Repeat</span>
                  <div className={styles.iterationsRow}>
                    <input
                      type="number"
                      className={styles.numberInput}
                      value={animation.iterations === "infinite" ? 0 : animation.iterations}
                      min={0}
                      max={999}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateAnimation({ iterations: v === 0 ? "infinite" : v });
                      }}
                    />
                    <label className={styles.infiniteLabel}>
                      <input
                        type="checkbox"
                        checked={animation.iterations === "infinite"}
                        onChange={(e) =>
                          updateAnimation({ iterations: e.target.checked ? "infinite" : 1 })
                        }
                      />
                      <span>∞</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Keyframes ─────────────────────────────────────────── */}
        {activeSection === "keyframes" && (
          <div className={styles.keyframesSection}>
            {!animation ? (
              <div className={styles.noAnimation}>
                <p>Add an animation first via Presets or Settings.</p>
              </div>
            ) : (
              <>
                {/* Timeline bar */}
                <div className={styles.timeline}>
                  <div className={styles.timelineTrack}>
                    {animation.keyframes.map((kf) => (
                      <div
                        key={kf.id}
                        className={styles.timelineMarker}
                        style={{ left: `${kf.offset}%` }}
                        title={`${kf.offset}%`}
                      />
                    ))}
                  </div>
                  <div className={styles.timelineLabels}>
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Keyframe list */}
                <div className={styles.keyframeList}>
                  {animation.keyframes.map((kf, idx) => (
                    <div key={kf.id} className={styles.keyframeItem}>
                      <div className={styles.keyframeHeader}>
                        <span className={styles.keyframeDot} />
                        <span className={styles.keyframeOffset}>{kf.offset}%</span>
                        {animation.keyframes.length > 2 && (
                          <button
                            type="button"
                            className={styles.keyframeRemove}
                            onClick={() => {
                              const next = animation.keyframes.filter((k) => k.id !== kf.id);
                              updateAnimation({ keyframes: next });
                            }}
                            title="Remove keyframe"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                      <div className={styles.keyframeProps}>
                        <div className={styles.kfField}>
                          <span>Offset</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={kf.offset}
                            className={styles.kfInput}
                            onChange={(e) => {
                              const next = animation.keyframes.map((k) =>
                                k.id === kf.id ? { ...k, offset: Number(e.target.value) } : k
                              );
                              updateAnimation({ keyframes: next });
                            }}
                          />
                        </div>
                        <div className={styles.kfField}>
                          <span>Opacity</span>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={kf.opacity ?? 1}
                            className={styles.kfInput}
                            onChange={(e) => {
                              const next = animation.keyframes.map((k) =>
                                k.id === kf.id ? { ...k, opacity: Number(e.target.value) } : k
                              );
                              updateAnimation({ keyframes: next });
                            }}
                          />
                        </div>
                        <div className={styles.kfField}>
                          <span>Y</span>
                          <input
                            type="number"
                            value={kf.translateY ?? 0}
                            className={styles.kfInput}
                            onChange={(e) => {
                              const next = animation.keyframes.map((k) =>
                                k.id === kf.id ? { ...k, translateY: Number(e.target.value) } : k
                              );
                              updateAnimation({ keyframes: next });
                            }}
                          />
                        </div>
                        <div className={styles.kfField}>
                          <span>Scale</span>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.05}
                            value={kf.scale ?? 1}
                            className={styles.kfInput}
                            onChange={(e) => {
                              const next = animation.keyframes.map((k) =>
                                k.id === kf.id ? { ...k, scale: Number(e.target.value) } : k
                              );
                              updateAnimation({ keyframes: next });
                            }}
                          />
                        </div>
                        <div className={styles.kfField}>
                          <span>Rotate</span>
                          <input
                            type="number"
                            value={kf.rotate ?? 0}
                            className={styles.kfInput}
                            onChange={(e) => {
                              const next = animation.keyframes.map((k) =>
                                k.id === kf.id ? { ...k, rotate: Number(e.target.value) } : k
                              );
                              updateAnimation({ keyframes: next });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.addKeyframeBtn}
                  onClick={() => {
                    const offsets = animation.keyframes.map((k) => k.offset);
                    const max = Math.max(...offsets);
                    const newOffset = max < 100 ? Math.round((max + 100) / 2) : 50;
                    const newKf: AnimationKeyframe = {
                      id: `kf-${Date.now()}`,
                      offset: newOffset,
                      opacity: 1,
                      translateY: 0,
                      scale: 1,
                      rotate: 0,
                    };
                    const next = [...animation.keyframes, newKf].sort(
                      (a, b) => a.offset - b.offset
                    );
                    updateAnimation({ keyframes: next });
                  }}
                >
                  <Plus size={12} /> Add Keyframe
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
