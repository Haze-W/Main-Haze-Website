"use client";

import { useState, Suspense, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2, Search, Grid3X3, X, GripHorizontal, ChevronDown } from "lucide-react";
import { CATEGORY_ORDER } from "@/lib/icon-categories";
import { getValidIconName } from "@/lib/icon-valid";
import styles from "./IconPickerModal.module.css";

const IconPickerContent = dynamic(
  () => import("./IconPickerContent").then((m) => m.IconPickerContent),
  { ssr: false }
);

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
}

const MIN_WIDTH = 520;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 820;
const DEFAULT_HEIGHT = 580;

function LoadingOverlay() {
  return (
    <div className={styles.loadingOverlay}>
      <Loader2 size={20} className={styles.spinner} />
      <p>Loading icons...</p>
    </div>
  );
}

export function IconPickerModal({ isOpen, onClose, onSelect }: IconPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [contentReady, setContentReady] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
  const [categoryOpen, setCategoryOpen] = useState(false);

  const isDragging = useRef(false);
  const isResizing = useRef<"e" | "s" | "se" | null>(null);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const resizeOrigin = useRef({ mx: 0, my: 0, w: 0, h: 0 });
  const wasOpenRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const t = setTimeout(() => setContentReady(true), 80);
      return () => clearTimeout(t);
    }
    if (!isOpen) {
      wasOpenRef.current = false;
      const t = setTimeout(() => {
        setContentReady(false);
        setSearch("");
        setSelectedCategory("all");
        setHoveredIcon(null);
        setPos({ x: 0, y: 0 });
        setSize({ w: DEFAULT_WIDTH, h: DEFAULT_HEIGHT });
        setCategoryOpen(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && contentReady && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, contentReady]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    if (categoryOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [categoryOpen]);

  const onDragBarDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, button, [data-category]")) return;
      isDragging.current = true;
      dragOrigin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos]
  );

  const onResizeDown = useCallback(
    (e: React.PointerEvent, dir: "e" | "s" | "se") => {
      e.stopPropagation();
      isResizing.current = dir;
      resizeOrigin.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isResizing.current) {
        const dx = e.clientX - resizeOrigin.current.mx;
        const dy = e.clientY - resizeOrigin.current.my;
        let nw = resizeOrigin.current.w;
        let nh = resizeOrigin.current.h;
        if (isResizing.current === "e" || isResizing.current === "se") nw = Math.max(MIN_WIDTH, nw + dx);
        if (isResizing.current === "s" || isResizing.current === "se") nh = Math.max(MIN_HEIGHT, nh + dy);
        setSize({ w: nw, h: nh });
      } else if (isDragging.current) {
        setPos({
          x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx),
          y: dragOrigin.current.py + (e.clientY - dragOrigin.current.my),
        });
      }
    },
    []
  );

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = null;
  }, []);

  const displayCategory = selectedCategory === "all" ? "All" : selectedCategory;

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          width: size.w,
          height: size.h,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Icon picker"
      >
        <div
          className={styles.topBar}
          onPointerDown={onDragBarDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className={styles.dragHandle}>
            <GripHorizontal size={14} />
          </div>

          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              id="icon-picker-search"
              name="icon_search"
              ref={searchRef}
              type="search"
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
              spellCheck={false}
              autoComplete="off"
              aria-label="Search icons"
            />
          </div>

          <div className={`${styles.categoryWrap} ${categoryOpen ? styles.categoryOpen : ""}`} ref={categoryRef}>
            <button
              type="button"
              className={styles.categoryBtn}
              onClick={() => setCategoryOpen((v) => !v)}
              data-category
            >
              <Grid3X3 size={13} className={styles.categoryIcon} />
              <span>{displayCategory}</span>
              <ChevronDown size={12} className={styles.categoryChevron} />
            </button>
            {categoryOpen && (
              <div className={styles.categoryDropdown}>
                <button
                  type="button"
                  className={`${styles.categoryOption} ${selectedCategory === "all" ? styles.categoryOptionActive : ""}`}
                  onClick={() => {
                    setSelectedCategory("all");
                    setCategoryOpen(false);
                  }}
                >
                  All
                </button>
                {CATEGORY_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.categoryOption} ${selectedCategory === c ? styles.categoryOptionActive : ""}`}
                    onClick={() => {
                      setSelectedCategory(c);
                      setCategoryOpen(false);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose} title="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.body}>
          {!contentReady ? (
            <LoadingOverlay />
          ) : (
            <Suspense fallback={<LoadingOverlay />}>
              <IconPickerContent
                search={search}
                selectedCategory={selectedCategory}
                onSelect={onSelect}
                onHover={setHoveredIcon}
                containerWidth={size.w}
              />
            </Suspense>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.previewIcon}>
            {hoveredIcon && (
              <Suspense fallback={null}>
                <HoverPreview iconName={hoveredIcon} />
              </Suspense>
            )}
          </div>
          <span className={hoveredIcon ? styles.previewName : styles.previewHint}>
            {hoveredIcon ?? "Hover an icon to preview"}
          </span>
        </div>

        {/* Resize handles */}
        <div
          className={styles.resizeHandleE}
          onPointerDown={(e) => onResizeDown(e, "e")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <div
          className={styles.resizeHandleS}
          onPointerDown={(e) => onResizeDown(e, "s")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <div
          className={styles.resizeHandleSe}
          onPointerDown={(e) => onResizeDown(e, "se")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
    </div>
  );
}

const DynamicIcon = dynamic(
  () => import("lucide-react/dynamic").then((m) => m.DynamicIcon),
  { ssr: false }
);

function HoverPreview({ iconName }: { iconName: string }) {
  return (
    <DynamicIcon
        name={getValidIconName(iconName) as never}
        size={22}
        strokeWidth={1.5}
        fallback={() => <span style={{ fontSize: 22 }}>◆</span>}
      />
  );
}
