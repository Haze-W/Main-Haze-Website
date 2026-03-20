"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Bell, User, CreditCard, Megaphone, Settings, LogOut, Gem, MessageCircle, ToggleLeft, CheckCircle2 } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import styles from "./dashboard.module.css";
import { SettingsModal } from "./SettingsModal";
import { useAuth } from "@/lib/auth-context";
import { DISCORD_COMMUNITY_URL } from "@/lib/site-links";

export function StandaloneHeader() {
  const router = useRouter();
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadAvatar = useCallback(() => {
    try {
      const s = localStorage.getItem("haze-settings");
      if (s) {
        const parsed = JSON.parse(s) as Record<string, unknown>;
        setAvatarUrl((parsed.avatar as string) || null);
      } else {
        setAvatarUrl(null);
      }
    } catch {
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    loadAvatar();
    window.addEventListener("haze-settings-updated", loadAvatar);
    return () => window.removeEventListener("haze-settings-updated", loadAvatar);
  }, [loadAvatar]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <>
      <header className={styles.standaloneHeader}>
        <Link href="/dashboard" className={styles.standaloneLogo}>
          <img src="/haze-logo.png" alt="Haze" className={styles.logoImg} />
          <span>Haze</span>
        </Link>
        <div className={styles.standaloneRight}>
          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={16} strokeWidth={2} />
            <input
              id="standalone-header-search"
              name="q"
              type="search"
              placeholder="Search files..."
              className={styles.searchInput}
              autoComplete="off"
              aria-label="Search files"
            />
            <span className={styles.shortcut}>⌘ K</span>
          </div>
          <div ref={notifRef} className={styles.notifWrap}>
            <button type="button" className={styles.notifBtn} onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={20} strokeWidth={2} />
            </button>
            {notifOpen && (
              <div className={styles.notifPopover}>
                <div className={styles.notifHeader}>
                  <span className={styles.notifTitle}>Notifications</span>
                </div>
                <div className={styles.notifList}>
                  <div className={styles.notifItem}>
                    <div className={styles.notifAvatar} />
                    <div className={styles.notifContent}>
                      <div className={styles.notifText}><strong>Haze</strong></div>
                      <div className={styles.notifDesc}>No new notifications.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={profileRef} className={styles.profileWrap}>
            <button type="button" className={styles.avatarBtn} onClick={() => setProfileOpen((v) => !v)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className={styles.avatar} />
              ) : (
                <div className={styles.avatar} />
              )}
            </button>
            {profileOpen && (
              <div className={styles.profileDropdown}>
                <Link href="/dashboard/profile" className={styles.profileDropdownItem} onClick={() => setProfileOpen(false)}>
                  <User size={18} strokeWidth={1.5} />
                  Profile
                </Link>
                <Link href="/dashboard/pricing" className={styles.profileDropdownItem} onClick={() => setProfileOpen(false)}>
                  <Gem size={18} strokeWidth={1.5} />
                  Subscription
                </Link>
                <a
                  href={DISCORD_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.profileDropdownItem}
                  onClick={() => setProfileOpen(false)}
                >
                  <MessageCircle size={18} strokeWidth={1.5} />
                  Join Discord
                </a>
                <button type="button" className={styles.profileDropdownItem} onClick={() => { setSettingsOpen(true); setProfileOpen(false); }}>
                  <ToggleLeft size={18} strokeWidth={1.5} />
                  Settings
                </button>
                <div className={styles.profileDropdownDivider} />
                <Link href="/dashboard/updates" className={styles.profileDropdownItem} onClick={() => setProfileOpen(false)}>
                  <CheckCircle2 size={18} strokeWidth={1.5} />
                  Updates
                </Link>
                <button
                  type="button"
                  className={styles.profileDropdownItem}
                  onClick={async () => {
                    setProfileOpen(false);
                    await logout();
                    router.push("/login");
                  }}
                >
                  <LogOut size={18} strokeWidth={1.5} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      </Dialog.Root>
    </>
  );
}
