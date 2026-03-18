"use client";

import { useState, useRef, useEffect } from "react";
import { X, User, Settings, Shield, Bell, CreditCard, Camera, Twitter, Linkedin, Github, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import * as Dialog from "@radix-ui/react-dialog";
import styles from "./SettingsModal.module.css";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

const LOCATIONS = [
  "Dubai", "New York", "London", "Tokyo", "Paris", "Singapore", "Sydney",
  "Berlin", "Toronto", "San Francisco", "Los Angeles", "Chicago", "Mumbai",
];

const SETTINGS_KEY = "haze-settings";

function loadSettings() {
  if (typeof window === "undefined") return {};
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, unknown>) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("haze-settings-updated"));
    }
  } catch {}
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("General");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    const lang = (s.language as string) || "en";
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, []);

  const updateSetting = (key: string, value: unknown) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    if (key === "language" && typeof document !== "undefined") {
      document.documentElement.lang = (value as string) || "en";
    }
  };

  const filteredLocations = LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const tabs = [
    { name: "General", icon: Settings },
    { name: "Profile", icon: User },
    { name: "Security", icon: Shield },
    { name: "Notifications", icon: Bell },
    { name: "Subscription", icon: CreditCard },
  ];

  return (
    <>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} onEscapeKeyDown={onClose}>
          <Dialog.Title asChild>
            <span className={styles.visuallyHidden}>Settings</span>
          </Dialog.Title>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>

          <div className={styles.sidebar}>
            <div className={styles.sidebarLabel}>Settings</div>
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.name}
                className={`${styles.tab} ${activeTab === tab.name ? styles.tabActive : ""}`}
                onClick={() => setActiveTab(tab.name)}
              >
                <tab.icon size={18} strokeWidth={2} />
                {tab.name}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            <h2 className={styles.sectionTitle}>{activeTab}</h2>

            {activeTab === "General" && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Theme</label>
                  <select
                    className={styles.input}
                    value={theme || "dark"}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="light">Light Theme</option>
                    <option value="dark">Dark Theme</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Language</label>
                  <select
                    className={styles.input}
                    value={(settings.language as string) || "en"}
                    onChange={(e) => updateSetting("language", e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className={styles.saveBtn} onClick={() => saveSettings(settings)}>
                  Save Changes
                </button>
              </>
            )}

            {activeTab === "Profile" && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Profile Photo</label>
                  <div className={styles.avatarRow}>
                    {(settings.avatar as string) ? (
                      <img src={settings.avatar as string} alt="" className={styles.avatarSmall} />
                    ) : (
                      <div className={styles.avatarPlaceholder} />
                    )}
                    <button
                      type="button"
                      className={styles.avatarUploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={16} strokeWidth={2} />
                      Upload photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className={styles.hiddenInput}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            updateSetting("avatar", reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={(settings.name as string) || "Sophie Bennett"}
                    onChange={(e) => updateSetting("name", e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={(settings.email as string) || "sophie@example.com"}
                    onChange={(e) => updateSetting("email", e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Location</label>
                  <div className={styles.locationWrap}>
                    <input
                      type="text"
                      className={styles.input}
                      value={locationOpen ? locationSearch : ((settings.location as string) || "Dubai")}
                      onChange={(e) =>
                        locationOpen
                          ? setLocationSearch(e.target.value)
                          : updateSetting("location", e.target.value)
                      }
                      onFocus={() => {
                        setLocationOpen(true);
                        setLocationSearch((settings.location as string) || "Dubai");
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setLocationOpen(false);
                          if (locationSearch.trim()) updateSetting("location", locationSearch.trim());
                        }, 150);
                      }}
                    />
                    {locationOpen && (
                      <ul className={styles.locationList}>
                        {filteredLocations.map((loc) => (
                          <li
                            key={loc}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              updateSetting("location", loc);
                              setLocationSearch("");
                              setLocationOpen(false);
                            }}
                          >
                            {loc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Social links</label>
                  <div className={styles.socialRow}>
                    <Twitter size={16} strokeWidth={2} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Twitter / X"
                      value={(settings.twitter as string) || ""}
                      onChange={(e) => updateSetting("twitter", e.target.value)}
                    />
                  </div>
                  <div className={styles.socialRow}>
                    <Linkedin size={16} strokeWidth={2} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="LinkedIn"
                      value={(settings.linkedin as string) || ""}
                      onChange={(e) => updateSetting("linkedin", e.target.value)}
                    />
                  </div>
                  <div className={styles.socialRow}>
                    <Github size={16} strokeWidth={2} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="GitHub"
                      value={(settings.github as string) || ""}
                      onChange={(e) => updateSetting("github", e.target.value)}
                    />
                  </div>
                  <div className={styles.socialRow}>
                    <Globe size={16} strokeWidth={2} />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Website"
                      value={(settings.website as string) || ""}
                      onChange={(e) => updateSetting("website", e.target.value)}
                    />
                  </div>
                </div>
                <button type="button" className={styles.saveBtn} onClick={() => saveSettings(settings)}>
                  Update Profile
                </button>
              </>
            )}

            {activeTab === "Notifications" && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.toggleLabel}>
                    <span>Email notifications</span>
                    <input
                      type="checkbox"
                      checked={(settings.emailNotifications as boolean) ?? true}
                      onChange={(e) => updateSetting("emailNotifications", e.target.checked)}
                    />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.toggleLabel}>
                    <span>Push notifications</span>
                    <input
                      type="checkbox"
                      checked={(settings.pushNotifications as boolean) ?? false}
                      onChange={(e) => updateSetting("pushNotifications", e.target.checked)}
                    />
                  </label>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.toggleLabel}>
                    <span>Project updates</span>
                    <input
                      type="checkbox"
                      checked={(settings.projectUpdates as boolean) ?? true}
                      onChange={(e) => updateSetting("projectUpdates", e.target.checked)}
                    />
                  </label>
                </div>
                <button type="button" className={styles.saveBtn} onClick={() => saveSettings(settings)}>
                  Save Notification Settings
                </button>
              </>
            )}

            {(activeTab === "Security" || activeTab === "Subscription") && (
              <p className={styles.placeholderText}>
                Manage your {activeTab.toLowerCase()} settings and preferences here. This section is currently under construction.
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </>
  );
}
