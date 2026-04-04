"use client";

import { AuthFormPanel } from "@/components/auth/AuthFormPanel";
import { AuthChatPanel } from "@/components/auth/AuthChatPanel";
import styles from "@/app/auth/auth.module.css";

export default function SignupPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.formPanel}>
          <div className={styles.formContent}>
            <AuthFormPanel mode="signup" />
          </div>
        </div>
        <div className={styles.chatPanel}>
          <AuthChatPanel />
        </div>
      </div>
    </div>
  );
}
