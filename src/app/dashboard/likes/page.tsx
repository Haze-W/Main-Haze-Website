"use client";

import { Heart } from "lucide-react";
import styles from "../dashboard.module.css";

export default function LikesPage() {
  return (
    <div>
      <h1 className={styles.pageTitle}>Likes</h1>
      <p className={styles.pageSubtitle}>Projects you&apos;ve liked.</p>
      <div className={styles.sceneGrid}>
        <div className={styles.sceneCardEmpty}>
          <Heart size={48} strokeWidth={1.5} />
          <span className={styles.comingSoonTitle}>Coming soon</span>
          <span className={styles.comingSoonDesc}>Save your favorite projects here.</span>
        </div>
      </div>
    </div>
  );
}
