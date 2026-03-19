"use client";

import { useState } from "react";
import {
  Square,
  Circle,
  Triangle,
  Star,
  Hexagon,
  Minus,
  Plus,
  ChevronRight,
  Check,
  X,
  Search,
  Menu,
  MoreVertical,
  Download,
  Copy,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import styles from "../dashboard.module.css";

const UI_ASSETS = [
  { id: "btn-primary", name: "Primary Button", icon: Square, category: "Buttons" },
  { id: "btn-secondary", name: "Secondary Button", icon: Minus, category: "Buttons" },
  { id: "icon-check", name: "Check Icon", icon: Check, category: "Icons" },
  { id: "icon-close", name: "Close Icon", icon: X, category: "Icons" },
  { id: "icon-search", name: "Search Icon", icon: Search, category: "Icons" },
  { id: "icon-menu", name: "Menu Icon", icon: Menu, category: "Icons" },
  { id: "icon-more", name: "More Icon", icon: MoreVertical, category: "Icons" },
  { id: "shape-circle", name: "Circle", icon: Circle, category: "Shapes" },
  { id: "shape-triangle", name: "Triangle", icon: Triangle, category: "Shapes" },
  { id: "shape-star", name: "Star", icon: Star, category: "Shapes" },
  { id: "shape-hexagon", name: "Hexagon", icon: Hexagon, category: "Shapes" },
  { id: "icon-chevron", name: "Chevron Right", icon: ChevronRight, category: "Icons" },
  { id: "icon-plus", name: "Plus Icon", icon: Plus, category: "Icons" },
  { id: "icon-download", name: "Download Icon", icon: Download, category: "Icons" },
  { id: "icon-copy", name: "Copy Icon", icon: Copy, category: "Icons" },
];

export default function AssetsPage() {
  const [selectedAsset, setSelectedAsset] = useState<typeof UI_ASSETS[0] | null>(null);

  return (
    <div>
      <h1 className={styles.pageTitle}>Assets</h1>
      <p className={styles.pageSubtitle}>UI components and icons for your projects.</p>
      <div className={styles.assetGrid}>
        {UI_ASSETS.map((asset) => (
          <button
            key={asset.id}
            type="button"
            className={styles.assetCard}
            onClick={() => setSelectedAsset(asset)}
          >
            <div className={styles.assetPreview}>
              <asset.icon size={28} strokeWidth={2} />
            </div>
            <div className={styles.assetInfo}>
              <h3>{asset.name}</h3>
              <span>{asset.category}</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog.Root open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.assetModalOverlay} />
          {selectedAsset && (
            <Dialog.Content className={styles.assetModal} aria-describedby={undefined}>
              <Dialog.Title asChild>
                <h2 className={styles.assetModalTitle}>{selectedAsset.name}</h2>
              </Dialog.Title>
              <div className={styles.assetModalHeader}>
                <div className={styles.assetModalPreview}>
                  <selectedAsset.icon size={48} strokeWidth={2} />
                </div>
                <div>
                  <span className={styles.assetModalCategory}>{selectedAsset.category}</span>
                </div>
              </div>
              <div className={styles.assetModalBody}>
                <p className={styles.assetModalDesc}>
                  Use this asset in your project. Copy the component or drag it into the canvas.
                </p>
                <div className={styles.assetModalActions}>
                  <button type="button" className={styles.assetModalBtn}>
                    <Copy size={16} strokeWidth={2} />
                    Copy
                  </button>
                  <button type="button" className={styles.assetModalBtn}>
                    <Download size={16} strokeWidth={2} />
                    Download SVG
                  </button>
                </div>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
