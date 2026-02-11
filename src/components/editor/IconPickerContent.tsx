"use client";

import { useMemo, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import { iconNames } from "lucide-react/dynamic";
import { getIconCategory, CATEGORY_ORDER } from "@/lib/icon-categories";
import { getValidIconName } from "@/lib/icon-valid";
import styles from "./IconPickerModal.module.css";

const DynamicIcon = dynamic(
  () => import("lucide-react/dynamic").then((m) => m.DynamicIcon),
  { ssr: false }
);

const COLS = 8;
const ROW_HEIGHT = 72;

interface IconPickerContentProps {
  search: string;
  selectedCategory: string;
  onSelect: (name: string) => void;
  onHover: (name: string | null) => void;
}

export function IconPickerContent({ search, selectedCategory, onSelect, onHover }: IconPickerContentProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const categorized = useMemo(() => {
    const filtered = search
      ? iconNames.filter((n) =>
          n.toLowerCase().includes(search.toLowerCase().replace(/\s/g, "-"))
        )
      : iconNames;
    const byCat: Record<string, string[]> = {};
    for (const name of filtered) {
      const cat = getIconCategory(name);
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(name);
    }
    for (const cat of Object.keys(byCat)) {
      byCat[cat].sort();
    }
    return byCat;
  }, [search]);

  const categories = useMemo(() => {
    return Object.keys(categorized).sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b) ||
        a.localeCompare(b)
    );
  }, [categorized]);

  const flatRows = useMemo(() => {
    const rows: { type: "header"; label: string } | { type: "icons"; icons: string[] }[] = [];
    for (const cat of categories) {
      if (selectedCategory !== "all" && selectedCategory !== cat) continue;
      const icons = categorized[cat];
      if (icons.length === 0) continue;
      rows.push({ type: "header", label: cat });
      for (let i = 0; i < icons.length; i += COLS) {
        rows.push({ type: "icons", icons: icons.slice(i, i + COLS) });
      }
    }
    return rows;
  }, [categories, categorized, selectedCategory]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatRows[i].type === "header" ? 36 : ROW_HEIGHT),
    overscan: 3,
  });

  return (
    <div ref={parentRef} className={styles.content}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = flatRows[virtualRow.index];
          if (row.type === "header") {
            return (
              <div
                key={`h-${row.label}-${virtualRow.key}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <h3 className={styles.categoryHeader}>{row.label}</h3>
              </div>
            );
          }
          return (
            <div
              key={`r-${virtualRow.index}-${virtualRow.key}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={styles.iconGrid}>
                {row.icons.map((name) => (
                  <IconCell
                    key={name}
                    name={name}
                    onSelect={onSelect}
                    onHover={onHover}
                  />
                ))}
              </div>
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
  onSelect: () => void;
  onHover: (n: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `icon-${name}`,
    data: { type: "icon", iconName: name },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${styles.iconCell} ${isDragging ? styles.dragging : ""}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover(null)}
      title={name}
    >
      <DynamicIcon
        name={getValidIconName(name) as React.ComponentProps<typeof DynamicIcon>["name"]}
        size={24}
        strokeWidth={1.5}
      />
      <span className={styles.iconName}>{name}</span>
    </div>
  );
}
