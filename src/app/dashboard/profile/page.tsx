"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, MapPin, Link2, Share2 } from "lucide-react";
import { listProjects } from "@/lib/projects";
import { useToast } from "@/components/Toast";
import styles from "./profile.module.css";

const SETTINGS_KEY = "haze-settings";
const PROFILE_KEY = "haze-profile";

interface ProfileData {
  name: string;
  location: string;
  website?: string;
  avatar?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
}

function loadProfile(): ProfileData {
  if (typeof window === "undefined") {
    return { name: "Sophie Bennett ®", location: "Dubai" };
  }
  try {
    const base = { name: "Sophie Bennett ®", location: "Dubai" };
    const settings = localStorage.getItem(SETTINGS_KEY);
    if (settings) {
      const s = JSON.parse(settings) as Record<string, unknown>;
      return {
        ...base,
        name: (s.name as string) || base.name,
        location: (s.location as string) || base.location,
        website: s.website as string | undefined,
        avatar: s.avatar as string | undefined,
        twitter: s.twitter as string | undefined,
        linkedin: s.linkedin as string | undefined,
        github: s.github as string | undefined,
      };
    }
    const profile = localStorage.getItem(PROFILE_KEY);
    if (profile) return { ...base, ...JSON.parse(profile) };
    return base;
  } catch {
    return { name: "Sophie Bennett ®", location: "Dubai" };
  }
}

export default function ProfilePage() {
  const { show } = useToast();
  const [profile, setProfile] = useState<ProfileData>(loadProfile);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const onSettingsUpdate = () => setProfile(loadProfile());
    window.addEventListener("haze-settings-updated", onSettingsUpdate);
    return () => window.removeEventListener("haze-settings-updated", onSettingsUpdate);
  }, []);

  useEffect(() => {
    try {
      const list = listProjects();
      setProjects(list.map((p) => ({ id: p.id, name: p.name })));
    } catch {
      setProjects([]);
    }
  }, []);

  const sceneCount = projects.length;
  const likeCount = 5882;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder} />
          )}
          <div className={styles.userInfo}>
            <h1 className={styles.name}>{profile.name}</h1>
            <div className={styles.stats}>
              <span>{sceneCount} projects</span>
              <span className={styles.dot}> • </span>
              <span>{likeCount.toLocaleString()} likes</span>
              {profile.location && (
                <>
                  <span className={styles.dot}> • </span>
                  <span className={styles.location}>
                    <MapPin size={14} strokeWidth={2} />
                    {profile.location}
                  </span>
                </>
              )}
              {profile.website && (
                <>
                  <span className={styles.dot}> • </span>
                  <a href={profile.website} className={styles.website} target="_blank" rel="noopener noreferrer">
                    <Link2 size={14} strokeWidth={2} />
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.socialBtns}>
            {profile.twitter && (
              <a href={profile.twitter} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            )}
          </div>
          <button
            type="button"
            className={styles.shareBtn}
            onClick={async () => {
              const url = typeof window !== "undefined" ? window.location.href : "";
              try {
                await navigator.clipboard.writeText(url);
                show("Profile link copied to clipboard.", "success");
              } catch {
                window.prompt("Copy this link:", url);
              }
            }}
          >
            <Share2 size={16} strokeWidth={2} />
            Share
          </button>
        </div>
      </header>

      <div className={styles.masonry}>
        {projects.length === 0 ? (
          <div className={styles.empty}>
            <LayoutGrid size={48} strokeWidth={1.5} />
            <p>No projects yet</p>
            <Link href="/dashboard" className={styles.createLink}>Create your first project</Link>
          </div>
        ) : (
          projects.map((p) => (
            <Link key={p.id} href={`/editor?project=${p.id}`} className={styles.projectCard}>
              <div className={styles.projectPreview}>
                <LayoutGrid size={32} strokeWidth={1.5} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
