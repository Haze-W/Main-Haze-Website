"use client";

import Link from "next/link";
import { FolderOpen, CreditCard, User } from "lucide-react";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.dashboardOverview}>
      <h1 className={styles.overviewTitle}>Welcome to Haze</h1>
      <p className={styles.overviewSubtitle}>
        Your visual Tauri GUI builder. Manage projects, subscription, and account.
      </p>
      <div className={styles.overviewGrid}>
        <Link href="/dashboard/projects" className={styles.overviewCard}>
          <FolderOpen size={24} className={styles.overviewIcon} />
          <h2>Projects</h2>
          <p>Create and manage your design projects</p>
        </Link>
        <Link href="/dashboard/billing" className={styles.overviewCard}>
          <CreditCard size={24} className={styles.overviewIcon} />
          <h2>Subscription</h2>
          <p>View plan, upgrade, and billing</p>
        </Link>
        <Link href="/dashboard/account" className={styles.overviewCard}>
          <User size={24} className={styles.overviewIcon} />
          <h2>Account</h2>
          <p>Profile and settings</p>
        </Link>
      </div>
    </div>
  );
}
