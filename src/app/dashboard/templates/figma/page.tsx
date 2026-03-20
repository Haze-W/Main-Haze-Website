"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, LayoutTemplate } from "lucide-react";
import styles from "../marketplace/marketplace.module.css";

const FIGMA_TEMPLATES = [
  { id: "figma-dashboard", name: "Dashboard UI", category: "Dashboard" },
  { id: "figma-landing", name: "Landing Page", category: "Marketing" },
  { id: "figma-auth", name: "Auth Flow", category: "Auth" },
  { id: "figma-cards", name: "Card Grid", category: "Components" },
  { id: "figma-pricing", name: "Pricing Table", category: "Marketing" },
  { id: "figma-profile", name: "Profile Page", category: "Dashboard" },
  { id: "figma-ecommerce", name: "E-commerce", category: "Marketing" },
  { id: "figma-blog", name: "Blog Layout", category: "Content" },
];

export default function FigmaMarketPage() {
  const [search, setSearch] = useState("");

  return (
    <div className={styles.marketplace}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Figma Market</h1>
        <p className={styles.heroSubtitle}>
          Figma-compatible templates for your designs.
        </p>
        <div className={styles.searchBar}>
          <Search size={20} strokeWidth={2} />
          <input
            id="figma-market-search"
            name="q"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
            aria-label="Search Figma templates"
          />
        </div>
      </section>

      <section className={styles.allSection}>
        <h2 className={styles.sectionTitle}>Figma Templates</h2>
        <div className={styles.templateGrid}>
          {FIGMA_TEMPLATES.map((t) => (
            <Link
              key={t.id}
              href={`/editor?template=${t.id}`}
              className={styles.templateCard}
            >
              <div className={styles.templatePreview}>
                <LayoutTemplate size={40} strokeWidth={1.5} />
              </div>
              <div className={styles.templateInfo}>
                <h3>{t.name}</h3>
                <span>{t.category}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
