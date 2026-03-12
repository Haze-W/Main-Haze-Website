"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import { iconNames } from "lucide-react/dynamic";
import { getIconCategory, CATEGORY_ORDER } from "@/lib/icon-categories";
import { getValidIconName } from "@/lib/icon-valid";
import styles from "./IconPickerModal.module.css";

const DynamicIcon = dynamic(
  () => import("lucide-react/dynamic").then((m) => m.DynamicIcon),
  { ssr: false, loading: () => <span className={styles.iconSpinner} /> }
);

const CELL_SIZE = 92;
const GAP = 6;
const HEADER_HEIGHT = 34;

interface IconPickerContentProps {
  search: string;
  selectedCategory: string;
  onSelect: (name: string) => void;
  onHover: (name: string | null) => void;
  containerWidth: number;
}

export function IconPickerContent({
  search,
  selectedCategory,
  onSelect,
  onHover,
  containerWidth,
}: IconPickerContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLoading, setScrollLoading] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cols = Math.max(3, Math.floor((containerWidth - 36 - 36) / (CELL_SIZE + GAP)));
  const rowHeight = CELL_SIZE + GAP;

  const categorized = useMemo(() => {
    const q = search.toLowerCase().replace(/\s+/g, "-");
    const filtered = q
      ? iconNames.filter((n) => n.toLowerCase().includes(q))
      : iconNames;

    const byCat: Record<string, string[]> = {};
    for (const name of filtered) {
      const cat = getIconCategory(name);
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(name);
    }
    for (const k of Object.keys(byCat)) byCat[k].sort();
    return byCat;
  }, [search]);

  const categories = useMemo(
    () =>
      Object.keys(categorized).sort(
        (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b) || a.localeCompare(b)
      ),
    [categorized]
  );

  const flatRows = useMemo(() => {
    const rows: Array<
      { type: "header"; label: string; count: number } | { type: "icons"; icons: string[] }
    > = [];
    for (const cat of categories) {
      if (selectedCategory !== "all" && selectedCategory !== cat) continue;
      const icons = categorized[cat];
      if (!icons || icons.length === 0) continue;
      rows.push({ type: "header", label: cat, count: icons.length });
      for (let i = 0; i < icons.length; i += cols) {
        rows.push({ type: "icons", icons: icons.slice(i, i + cols) });
      }
    }
    return rows;
  }, [categories, categorized, selectedCategory, cols]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (flatRows[i].type === "header" ? HEADER_HEIGHT : rowHeight),
    overscan: 4,
  });

  const onScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setScrollLoading(true);
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollLoading(false);
      scrollTimeoutRef.current = null;
    }, 150);
  }, []);

  return (
    <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
      {scrollLoading && (
        <div className={styles.scrollLoading}>
          <span className={styles.scrollSpinner} />
        </div>
      )}
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vr) => {
          const row = flatRows[vr.index];
          return (
            <div
              key={vr.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: vr.size,
                transform: `translateY(${vr.start}px)`,
              }}
            >
              {row.type === "header" ? (
                <div className={styles.catHeader}>
                  <span>{row.label}</span>
                  <span className={styles.catCount}>{row.count}</span>
                </div>
              ) : (
                <div
                  className={styles.iconRow}
                  style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  }}
                >
                  {row.icons.map((name) => (
                    <IconCell
                      key={name}
                      name={name}
                      onSelect={onSelect}
                      onHover={onHover}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconCell({
  name,
  onSelect,
  onHover,
}: {
  name: string;
  onSelect: (name: string) => void;
  onHover: (n: string | null) => void;
}) {
  return (
    <button
      type="button"
      className={styles.iconCell}
      onClick={() => onSelect(name)}
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover(null)}
      title={name}
    >
      <DynamicIcon
        name={getValidIconName(name) as React.ComponentProps<typeof DynamicIcon>["name"]}
        size={24}
        strokeWidth={1.5}
      />
      <span className={styles.iconLabel}>{name}</span>
    </button>
  );
}
