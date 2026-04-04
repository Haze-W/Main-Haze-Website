"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, LayoutTemplate, Puzzle, BookOpen } from "lucide-react";
import styles from "./marketplace.module.css";

const NAV_ITEMS = [
  { name: "Templates", path: "#", active: true },
  { name: "Plugins", path: "#" },
  { name: "Components", path: "#" },
  { name: "Vectors", path: "#" },
  { name: "Tutorials", path: "#" },
];

const FEATURED = [
  { id: "nova", name: "Nova App", category: "Template", type: "template" },
  { id: "tidy", name: "Tidy Up", category: "Plugin", type: "plugin" },
  { id: "animate", name: "Animate Framer Sites", category: "Course", author: "Nandi", type: "course" },
];

const TEMPLATES = [
  { id: "dashboard", name: "Dashboard UI", category: "Dashboard" },
  { id: "landing", name: "Landing Page", category: "Marketing" },
  { id: "auth", name: "Auth Flow", category: "Auth" },
  { id: "cards", name: "Card Grid", category: "Components" },
  { id: "pricing", name: "Pricing Table", category: "Marketing" },
  { id: "profile", name: "Profile Page", category: "Dashboard" },
  { id: "ecommerce", name: "E-commerce", category: "Marketing" },
  { id: "blog", name: "Blog Layout", category: "Content" },
  { id: "saas", name: "SaaS Dashboard", category: "Dashboard" },
  { id: "portfolio", name: "Portfolio", category: "Creative" },
  { id: "agency", name: "Agency", category: "Marketing" },
  { id: "app", name: "Mobile App", category: "App" },
];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");

  return (
    <div className={styles.marketplace}>
      <nav className={styles.topNav}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.name}
            href={item.path}
            className={`${styles.navLink} ${item.active ? styles.navLinkActive : ""}`}
          >
            {item.name}
          </Link>
        ))}
        <div className={styles.navSearch}>
          <Search size={18} strokeWidth={2} />
        </div>
      </nav>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Marketplace</h1>
        <p className={styles.heroSubtitle}>
          The best templates, plugins and components from the community.
        </p>
        <div className={styles.searchBar}>
          <Search size={20} strokeWidth={2} />
          <input
            id="marketplace-search"
            name="q"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
            aria-label="Search marketplace"
          />
        </div>
      </section>

      <section className={styles.featuredSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured</h2>
          <div className={styles.pagination}>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`${styles.dot} ${i === 2 ? styles.dotActive : ""}`} />
            ))}
          </div>
        </div>
        <div className={styles.featuredGrid}>
          {FEATURED.map((item) => (
            <Link
              key={item.id}
              href={`/editor?template=${item.id}`}
              className={styles.featuredCard}
            >
              <div className={styles.featuredPreview}>
                {item.type === "template" && <LayoutTemplate size={48} strokeWidth={1.5} />}
                {item.type === "plugin" && <Puzzle size={48} strokeWidth={1.5} />}
                {item.type === "course" && <BookOpen size={48} strokeWidth={1.5} />}
              </div>
              <div className={styles.featuredInfo}>
                <h3>{item.name}</h3>
                <span>{item.category}</span>
                {item.author && <span className={styles.author}>{item.author}</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.allSection}>
        <h2 className={styles.sectionTitle}>All Templates</h2>
        <div className={styles.templateGrid}>
          {TEMPLATES.map((t) => (
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
