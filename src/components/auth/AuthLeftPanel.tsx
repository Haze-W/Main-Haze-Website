"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import styles from "@/app/auth/auth.module.css";

const CAROUSEL_IMAGES = [
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
];

interface AuthLeftPanelProps {
  slogan: string;
}

export default function AuthLeftPanel({ slogan }: AuthLeftPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % CAROUSEL_IMAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.leftPanel}>
      <div className={styles.carouselWrapper}>
        {CAROUSEL_IMAGES.map((src, i) => (
          <div
            key={i}
            className={`${styles.carouselSlide} ${i === activeIndex ? styles.active : ""}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div
          className={styles.carouselOverlay}
          aria-hidden
        />
      </div>
      <div className={styles.leftContent}>
        <span className={styles.logo}>Render</span>
        <Link href="/" className={styles.backBtn}>
          <ChevronLeft size={16} />
          Back
        </Link>
      </div>
      <p className={styles.slogan}>{slogan}</p>
      <div className={styles.carouselDots}>
        {CAROUSEL_IMAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.carouselDot} ${i === activeIndex ? styles.active : ""}`}
            onClick={() => setActiveIndex(i)}
            aria-label={`View image ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
