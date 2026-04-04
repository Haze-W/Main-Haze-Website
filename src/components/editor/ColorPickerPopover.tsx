"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  hexToHsv,
  hsvToHex,
  hexToRgb,
  rgbToHex,
  isValidHex,
  normalizeHex,
} from "@/lib/color-utils";
import styles from "./ColorPickerPopover.module.css";

interface ColorPickerPopoverProps {
  value: string;
  onChange: (hex: string) => void;
  anchor: HTMLElement | null;
  onClose: () => void;
}

export function ColorPickerPopover({
  value,
  onChange,
  anchor,
  onClose,
}: ColorPickerPopoverProps) {
  const hex = isValidHex(value) ? normalizeHex(value) : "#888888";
  const initial = hexToHsv(hex) ?? { h: 0, s: 0, v: 0.5 };
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [v, setV] = useState(initial.v);
  const [hexInput, setHexInput] = useState(hex);
  const [isDragging, setIsDragging] = useState<"sv" | "h" | null>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentHex = hsvToHex(h, s, v);

  const updateFromHsv = useCallback(
    (nh: number, ns: number, nv: number) => {
      setH(nh);
      setS(ns);
      setV(nv);
      const newHex = hsvToHex(nh, ns, nv);
      setHexInput(newHex);
      onChange(newHex);
    },
    [onChange]
  );

  const handleSvMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = svRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      updateFromHsv(h, x, y);
    },
    [h, updateFromHsv]
  );

  const handleHMove = useCallback(
    (clientX: number) => {
      const el = hRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      updateFromHsv(x * 360, s, v);
    },
    [s, v, updateFromHsv]
  );

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

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        (anchor && anchor.contains(target))
      ) {
        return;
      }
      onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onOutside), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [anchor, onClose]);

  const rgb = hexToRgb(currentHex);

  if (!anchor || typeof document === "undefined") return null;

  const rect = anchor.getBoundingClientRect();
  const popoverH = 320;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const showAbove = spaceBelow < popoverH && spaceAbove > spaceBelow;

  const popoverEl = (
    <div
      ref={popoverRef}
      className={styles.popover}
      style={{
        position: "fixed",
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
        top: showAbove ? rect.top - popoverH - 8 : rect.bottom + 6,
        zIndex: 100000,
      }}
    >
      <div className={styles.svArea}>
        <div
          ref={svRef}
          className={styles.svGradient}
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(h, 1, 1)})`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging("sv");
            handleSvMove(e.clientX, e.clientY);
          }}
        >
          <div
            className={styles.svHandle}
            style={{
              left: `${s * 100}%`,
              top: `${(1 - v) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      <div
        ref={hRef}
        className={styles.hueBar}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging("h");
          handleHMove(e.clientX);
        }}
      >
        <div
          className={styles.hueHandle}
          style={{ left: `${(h / 360) * 100}%`, transform: "translateX(-50%)" }}
        />
      </div>

      <div className={styles.inputsRow}>
        <div className={styles.hexWrap}>
          <span className={styles.hexPrefix}>#</span>
          <input
            type="text"
            className={styles.hexInput}
            value={hexInput.replace(/^#/, "").toUpperCase()}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
              setHexInput(raw);
              if (raw.length === 6 || raw.length === 3) {
                const hex = "#" + (raw.length === 3 ? raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2] : raw);
                const hsv = hexToHsv(hex);
                if (hsv) {
                  setH(hsv.h);
                  setS(hsv.s);
                  setV(hsv.v);
                  onChange(hex);
                }
              }
            }}
            onBlur={() => setHexInput(currentHex)}
          />
        </div>
        <div className={styles.rgbWrap}>
          <div className={styles.rgbInput}>
            <span className={styles.rgbLabel}>R</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb?.r ?? 0}
              onChange={(e) => {
                const r = Math.max(0, Math.min(255, Number(e.target.value)));
                const g = rgb?.g ?? 0;
                const b = rgb?.b ?? 0;
                const newHex = rgbToHex(r, g, b);
                const hsv = hexToHsv(newHex);
                if (hsv) updateFromHsv(hsv.h, hsv.s, hsv.v);
              }}
            />
          </div>
          <div className={styles.rgbInput}>
            <span className={styles.rgbLabel}>G</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb?.g ?? 0}
              onChange={(e) => {
                const g = Math.max(0, Math.min(255, Number(e.target.value)));
                const r = rgb?.r ?? 0;
                const b = rgb?.b ?? 0;
                const newHex = rgbToHex(r, g, b);
                const hsv = hexToHsv(newHex);
                if (hsv) updateFromHsv(hsv.h, hsv.s, hsv.v);
              }}
            />
          </div>
          <div className={styles.rgbInput}>
            <span className={styles.rgbLabel}>B</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb?.b ?? 0}
              onChange={(e) => {
                const b = Math.max(0, Math.min(255, Number(e.target.value)));
                const r = rgb?.r ?? 0;
                const g = rgb?.g ?? 0;
                const newHex = rgbToHex(r, g, b);
                const hsv = hexToHsv(newHex);
                if (hsv) updateFromHsv(hsv.h, hsv.s, hsv.v);
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.previewRow}>
        <div className={styles.previewSwatch} style={{ background: currentHex }} />
        <span className={styles.previewHex}>{currentHex}</span>
      </div>
    </div>
  );

  return createPortal(popoverEl, document.body);
}
