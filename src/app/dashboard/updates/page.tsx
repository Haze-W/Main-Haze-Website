"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { UpdateLogEntry } from "@/lib/update-log";
import styles from "./updates.module.css";

const BRAINWAVE_UPDATES = [
  {
    id: "3d-library",
    title: "3D Library",
    date: "May 28, 2025",
    subtitle: "Smarter Assets. Smoother Workflow.",
    bullets: [
      "Unified Search: Browse by type, theme, or prompt tags — all in one place",
      "Smart Categories: Characters, Environments, Props, Animations, and FX — now neatly grouped",
      "Live Preview: See animated models in motion before adding them",
      "Favorites & History: Quickly find what you used or loved before",
      "Optimized for AI Prompts: Each asset is labeled for best AI pairing and results",
    ],
    paragraph: "This is part of our continued effort to make 3D creation intuitive and fun, powered by AI and designed for speed. Dive in and explore what's new — your creative toolbox just leveled up.",
  },
  {
    id: "new-materials",
    title: "New Materials",
    date: "Apr 20, 2025",
    subtitle: "More Looks. More Control.",
    bullets: [
      "40+ New Materials: From brushed metal to soft fabric, wet clay to neon glass",
      "Material Preview Panel: Instantly see how materials look on sample shapes",
      "Drag & Apply: Apply materials directly to any object in your scene",
      "Smart Material Suggestions: Get AI-recommended finishes based on your scene's theme",
      "Custom Material Tweaks: Adjust color, reflectivity, and bump directly inside Haze",
    ],
    paragraph: "Whether you're prototyping a product or animating a fantasy world, these new materials help bring your ideas to life — fast. No more shader headaches. Just smooth, beautiful surfaces.",
  },
];

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function UpdatesPage() {
  const [entries, setEntries] = useState<{
    id: string;
    title: string;
    date: string;
    subtitle: string;
    bullets: string[];
    paragraph: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/update-log", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { entries?: UpdateLogEntry[] }) => {
        if (data.entries && data.entries.length > 0) {
          const transformed = data.entries.slice(0, 5).map((e) => {
            const desc = e.description;
            return {
              id: e.id,
              title: e.title.replace(/^\[.*?\]\s*/, ""),
              date: formatDate(e.publishedAt),
              subtitle: desc[0] || e.title,
              bullets: desc.length > 2 ? desc.slice(1, -1) : desc.slice(1),
              paragraph: desc.length > 1 ? desc[desc.length - 1] : "",
            };
          });
          setEntries(transformed);
        } else {
          setEntries(BRAINWAVE_UPDATES);
        }
      })
      .catch(() => setEntries(BRAINWAVE_UPDATES))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Updates</h1>
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spin} />
          <span>Loading updates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Updates</h1>
      <p className={styles.subtitle}>What&apos;s new in Haze.</p>
      <div className={styles.list}>
        {entries.map((entry) => (
          <article key={entry.id} className={styles.entry}>
            <h2 className={styles.entryTitle}>{entry.title}</h2>
            <time className={styles.entryDate}>{entry.date}</time>
            <h3 className={styles.entrySubtitle}>{entry.subtitle}</h3>
            <h4 className={styles.whatsNew}>What&apos;s new</h4>
            <ul className={styles.bullets}>
              {entry.bullets.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
            <p className={styles.paragraph}>{entry.paragraph}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
