"use client";

import { useAuth } from "@/lib/auth-context";
import styles from "./account.module.css";

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <div className={styles.account}>
      <h1 className={styles.title}>Account</h1>
      <div className={styles.card}>
        <div className={styles.row}>
          <label>Email</label>
          <span>{user?.email ?? "—"}</span>
        </div>
        <div className={styles.row}>
          <label>Name</label>
          <span>{user?.name ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
