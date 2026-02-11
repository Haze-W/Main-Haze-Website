"use client";

import { useState, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
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

function LoadingOverlay() {
  return (
    <div className={styles.loadingOverlay}>
      <Loader2 size={32} className={styles.spinner} />
      <p>Loading icon library...</p>
    </div>
  );
}

export function IconPickerModal({ isOpen, onClose, onSelect }: IconPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setContentReady(false);
      const t = setTimeout(() => setContentReady(true), 150);
      return () => clearTimeout(t);
    } else {
      setContentReady(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (name: string) => {
    onSelect(name);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Icon picker"
      >
        <div className={styles.header}>
          <h2>Icon Library</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.searchRow}>
          <input
            type="search"
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="all">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.count}>
          Search and filter — Click or drag into canvas
        </div>
        <div className={styles.hoverPreviewSlot}>
          {hoveredIcon ? (
            <div className={styles.hoverPreview}>
              <Suspense fallback={<div className={styles.hoverPreviewIcon} />}>
                <HoverPreview iconName={hoveredIcon} />
              </Suspense>
              <span className={styles.hoverPreviewName}>{hoveredIcon}</span>
            </div>
          ) : (
            <div className={styles.hoverPreviewPlaceholder} />
          )}
        </div>
        <div className={styles.contentWrapper}>
          {!contentReady ? (
            <LoadingOverlay />
          ) : (
            <Suspense fallback={<LoadingOverlay />}>
              <IconPickerContent
              search={search}
              selectedCategory={selectedCategory}
              onSelect={handleSelect}
              onHover={setHoveredIcon}
            />
            </Suspense>
          )}
        </div>
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
    <div className={styles.hoverPreviewIcon}>
      <DynamicIcon name={getValidIconName(iconName) as never} size={48} strokeWidth={1.5} />
    </div>
  );
}
