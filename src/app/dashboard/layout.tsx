"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutTemplate,
  Box,
  Heart,
  FolderInput,
  FolderPlus,
  FolderOpen,
  Search,
  Bell,
  ArrowLeft,
  ArrowRight,
  Menu,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings,
  User,
  CreditCard,
  LogOut,
  Pencil,
  Trash2,
  Megaphone,
  Gem,
  MessageCircle,
  ToggleLeft,
  CheckCircle2,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import styles from "./dashboard.module.css";
import { SettingsModal } from "./SettingsModal";
import { CreateProjectModal } from "./CreateProjectModal";
import { CreateModalProvider } from "./CreateModalContext";
import { StandaloneHeader } from "./StandaloneHeader";
import { getFolders, saveFolders, type FolderItem } from "@/lib/folders";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

const STANDALONE_PATHS = [
  "/dashboard/pricing",
  "/dashboard/updates",
];

const SIDEBAR_NAV = [
  {
    name: "Explore",
    icon: LayoutTemplate,
    path: "/dashboard/templates",
    hasChevron: true,
    children: [
      { name: "Marketplace", path: "/dashboard/templates/marketplace" },
      { name: "Figma", path: "/dashboard/templates/figma", comingSoon: true },
    ],
  },
  { name: "Assets", icon: Box, path: "/dashboard/assets", badge: "15", hasChevron: true },
  { name: "Likes", icon: Heart, path: "/dashboard/likes", comingSoon: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_PATHS.includes(pathname);

  if (isStandalone) {
    return (
      <div className={styles.standaloneLayout}>
        <StandaloneHeader />
        <main className={styles.standaloneContent}>{children}</main>
      </div>
    );
  }

  return (
    <DashboardFullLayout>{children}</DashboardFullLayout>
  );
}

function DashboardFullLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderContext, setFolderContext] = useState<{ x: number; y: number; folder: FolderItem } | null>(null);
  const [folderRenameId, setFolderRenameId] = useState<string | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState<Set<string>>(new Set());
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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
    setFolders(getFolders());
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/templates")) setTemplatesExpanded(true);
  }, [pathname]);

  useEffect(() => {
    try {
      const s = localStorage.getItem("haze-notif-read");
      if (s) setNotifRead(new Set(JSON.parse(s)));
    } catch {}
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setFolderContext(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleNewFolder = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newFolderName.trim()) {
      const id = `f-${Date.now()}`;
      const next = [{ id, name: newFolderName.trim(), path: `/dashboard?folder=${id}` }, ...folders];
      setFolders(next);
      saveFolders(next);
      setNewFolderName("");
      setNewFolderOpen(false);
    } else if (e.key === "Escape") {
      setNewFolderOpen(false);
      setNewFolderName("");
    }
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: FolderItem) => {
    e.preventDefault();
    e.stopPropagation();
    setFolderContext({ x: e.clientX, y: e.clientY, folder });
  };

  const handleFolderRename = useCallback(() => {
    if (!folderContext) return;
    const folder = folderContext.folder;
    setFolderRenameId(folder.id);
    setFolderRenameValue(folder.name);
    setFolderContext(null);
  }, [folderContext]);

  const applyFolderRename = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && folderRenameValue.trim()) {
      const next = folders.map((f) =>
        f.id === folderRenameId ? { ...f, name: folderRenameValue.trim() } : f
      );
      setFolders(next);
      saveFolders(next);
      setFolderRenameId(null);
      setFolderRenameValue("");
    } else if (e.key === "Escape") {
      setFolderRenameId(null);
      setFolderRenameValue("");
    }
  };

  const handleFolderDelete = useCallback(() => {
    if (!folderContext) return;
    const folder = folderContext.folder;
    const next = folders.filter((f) => f.id !== folder.id);
    setFolders(next);
    saveFolders(next);
    setFolderContext(null);
  }, [folderContext, folders]);

  return (
    <CreateModalProvider openCreate={() => setCreateProjectOpen(true)}>
      <div className={styles.container}>
        <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarHidden : ""}`}>
          <Link href="/dashboard" className={styles.logo}>
            <img src="/haze-logo.png" alt="Haze" className={styles.logoImg} />
            <span>Haze</span>
          </Link>

          <nav className={styles.section}>
            {SIDEBAR_NAV.map((item) => {
              const hasChildren = "children" in item && item.children;
              const isExpanded = hasChildren && templatesExpanded;
              return (
                <div key={item.name}>
                  {hasChildren ? (
                    <button
                      type="button"
                      className={`${styles.item} ${pathname.startsWith(item.path) ? styles.itemActive : ""}`}
                      onClick={() => setTemplatesExpanded((v) => !v)}
                    >
                      <item.icon className={styles.icon} size={20} strokeWidth={2} />
                      <span className={styles.itemLabel}>{item.name}</span>
                      {isExpanded ? (
                        <ChevronUp className={styles.chevron} size={14} />
                      ) : (
                        <ChevronDown className={styles.chevron} size={14} />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.comingSoon ? "#" : item.path}
                      className={`${styles.item} ${item.comingSoon ? styles.itemDisabled : ""} ${pathname === item.path ? styles.itemActive : ""}`}
                      onClick={(e) => item.comingSoon && e.preventDefault()}
                    >
                      <item.icon className={styles.icon} size={20} strokeWidth={2} />
                      <span className={styles.itemLabel}>{item.name}</span>
                      {item.comingSoon && <span className={styles.comingSoon}>Coming soon</span>}
                      {item.badge && !item.comingSoon && <span className={styles.badge}>{item.badge}</span>}
                      {item.hasChevron && !item.comingSoon && <ChevronRight className={styles.chevron} size={14} />}
                    </Link>
                  )}
                  {hasChildren && isExpanded && (
                    <div className={styles.treeNav}>
                      {item.children!.map((child) => (
                        <div key={child.path} className={styles.treeItem}>
                          {"comingSoon" in child && child.comingSoon ? (
                            <span className={`${styles.treeLink} ${styles.treeLinkDisabled}`}>
                              {child.name}
                              <span className={styles.comingSoon}>Coming soon</span>
                            </span>
                          ) : (
                            <Link
                              href={child.path}
                              className={`${styles.treeLink} ${pathname === child.path ? styles.treeLinkActive : ""}`}
                            >
                              {child.name}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className={styles.divider} />

          <div className={styles.section}>
            <div className={styles.sectionTitle}>My projects</div>
            <Link href="/dashboard" className={`${styles.item} ${pathname === "/dashboard" ? styles.itemActive : ""}`}>
              <FolderOpen className={styles.icon} size={20} strokeWidth={2} />
              <span className={styles.itemLabel}>My Projects</span>
            </Link>
            <button type="button" className={styles.item} onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className={styles.icon} size={20} strokeWidth={2} />
              <span className={styles.itemLabel}>New Folder</span>
            </button>
            {newFolderOpen && (
              <div className={styles.item}>
                <FolderInput className={styles.icon} size={20} strokeWidth={2} />
                <input
                  id="dashboard-new-folder-name"
                  name="new_folder_name"
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={handleNewFolder}
                  onBlur={() => setNewFolderOpen(false)}
                  placeholder="Folder name..."
                  className={styles.folderInput}
                  autoComplete="off"
                />
              </div>
            )}
            {folders.map((f) =>
              folderRenameId === f.id ? (
                <div key={f.id} className={styles.item}>
                  <FolderInput className={styles.icon} size={20} strokeWidth={2} />
                  <input
                    id={`dashboard-folder-rename-${folderRenameId ?? "current"}`}
                    name="folder_rename"
                    autoFocus
                    type="text"
                    value={folderRenameValue}
                    onChange={(e) => setFolderRenameValue(e.target.value)}
                    onKeyDown={applyFolderRename}
                    onBlur={() => setFolderRenameId(null)}
                    className={styles.folderInput}
                    autoComplete="off"
                  />
                </div>
              ) : (
                <Link
                  href={f.path}
                  key={f.id}
                  className={`${styles.item} ${pathname === f.path ? styles.itemActive : ""}`}
                  onContextMenu={(e) => handleFolderContextMenu(e, f)}
                >
                  <FolderInput className={styles.icon} size={20} strokeWidth={2} />
                  <span className={styles.itemLabel}>{f.name}</span>
                </Link>
              )
            )}
          </div>
        </aside>

        <div className={styles.mainWrapper}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button type="button" className={styles.iconBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <ArrowLeft size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
              </button>
              <button type="button" className={styles.iconBtn} disabled>
                <ArrowRight size={20} strokeWidth={2} />
              </button>
              <div className={styles.searchBar}>
                <Search className={styles.searchIcon} size={16} strokeWidth={2} />
                <input
                  id="dashboard-header-search"
                  name="q"
                  type="search"
                  placeholder="Search files..."
                  className={styles.searchInput}
                  autoComplete="off"
                  aria-label="Search files"
                />
                <span className={styles.shortcut}>⌘ K</span>
              </div>
            </div>

            <div className={styles.headerRight}>
              <div ref={notifRef} className={styles.notifWrap}>
                <button type="button" className={styles.notifBtn} onClick={() => setNotifOpen((v) => !v)}>
                  <Bell size={20} strokeWidth={2} />
                  {!notifRead.has("n1") && <span className={styles.notifDot} />}
                </button>
                {notifOpen && (
                  <div className={styles.notifPopover}>
                    <div className={styles.notifHeader}>
                      <span className={styles.notifTitle}>Notifications</span>
                    </div>
                    <div className={styles.notifList}>
                      <div
                        className={`${styles.notifItem} ${expandedNotifId === "n1" ? styles.notifItemExpanded : ""}`}
                        onClick={() => setExpandedNotifId((v) => (v === "n1" ? null : "n1"))}
                      >
                        <div className={styles.notifAvatar} />
                        <div className={styles.notifContent}>
                          <div className={styles.notifText}><strong>Haze</strong> <span className={styles.notifTime}>1h ago</span></div>
                          <div className={styles.notifDesc}>Welcome to Haze. Create your first project to get started.</div>
                          {!notifRead.has("n1") && <span className={styles.notifUnreadDot} />}
                          {expandedNotifId === "n1" && (
                            <button
                              type="button"
                              className={styles.notifMarkRead}
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = new Set(notifRead).add("n1");
                                setNotifRead(next);
                                try {
                                  localStorage.setItem("haze-notif-read", JSON.stringify([...next]));
                                } catch {}
                              }}
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="button" className={styles.createBtn} onClick={() => setCreateProjectOpen(true)}>
                <Plus size={16} strokeWidth={2} />
                Create
              </button>

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
                    <Link href="/dashboard/profile" className={`${styles.profileDropdownItem} ${pathname === "/dashboard/profile" ? styles.profileDropdownItemActive : ""}`} onClick={() => setProfileOpen(false)}>
                      <User size={18} strokeWidth={1.5} />
                      Profile
                    </Link>
                    <Link href="/dashboard/pricing" className={styles.profileDropdownItem} onClick={() => setProfileOpen(false)}>
                      <Gem size={18} strokeWidth={1.5} />
                      Subscription
                    </Link>
                    <a href="#" className={styles.profileDropdownItem} onClick={() => setProfileOpen(false)}>
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

          <main className={styles.content}>{children}</main>
        </div>

        {folderContext && (
          <div
            ref={contextMenuRef}
            className={styles.contextMenu}
            style={{ left: folderContext.x, top: folderContext.y }}
          >
            <button type="button" className={styles.contextMenuItem} onClick={handleFolderRename}>
              <Pencil size={14} strokeWidth={2} />
              Rename
            </button>
            <button type="button" className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`} onClick={handleFolderDelete}>
              <Trash2 size={14} strokeWidth={2} />
              Delete
            </button>
          </div>
        )}

        <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SettingsModal onClose={() => setSettingsOpen(false)} />
        </Dialog.Root>

        <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      </div>
    </CreateModalProvider>
  );
}
