"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UpdateLogBell } from "@/components/dashboard/UpdateLogBell";
import styles from "./dashboard.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/billing", label: "Subscription" },
  { href: "/dashboard/account", label: "Account" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.logo}>
          <Zap size={20} className={styles.logoIcon} />
          <span>Render</span>
        </Link>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${
                pathname === href ? styles.navActive : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerRight}>
          <UpdateLogBell />
          <div className={styles.avatar} title="Account" />
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={logout}
            title="Log out"
          >
            Log out
          </button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
