"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Copy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import styles from "./ShareModal.module.css";

export function generateShareToken(projectId: string): string {
  const key = `haze_share_token_${projectId}`;
  if (typeof window === "undefined") {
    return "xxxxxxxxxxxxxxxx".replace(/x/g, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 62))
    );
  }
  const existing = localStorage.getItem(key);
  if (existing && /^[a-zA-Z0-9]{16}$/.test(existing)) return existing;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let t = "";
  for (let i = 0; i < 16; i++) t += chars[Math.floor(Math.random() * chars.length)];
  localStorage.setItem(key, t);
  return t;
}

export type CollaboratorPermission = "edit" | "view";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  permission: CollaboratorPermission;
}

function collaboratorsKey(projectId: string) {
  return `haze_collaborators_${projectId}`;
}

function loadCollaborators(projectId: string): Collaborator[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(collaboratorsKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Collaborator[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCollaborators(projectId: string, list: Collaborator[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(collaboratorsKey(projectId), JSON.stringify(list));
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
}

export function ShareModal({ isOpen, onClose, projectId }: ShareModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerm, setInvitePerm] = useState<CollaboratorPermission>("edit");
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const pid = projectId ?? "local";

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const token = generateShareToken(pid);
    const u = new URL(window.location.origin + "/editor");
    u.searchParams.set("project", pid);
    u.searchParams.set("token", token);
    return u.toString();
  }, [pid]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setPeople(loadCollaborators(pid));
  }, [isOpen, pid]);

  const persistPeople = useCallback(
    (next: Collaborator[]) => {
      setPeople(next);
      saveCollaborators(pid, next);
    },
    [pid]
  );

  const addInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (people.some((p) => p.email.toLowerCase() === email)) {
      setInviteEmail("");
      return;
    }
    const localPart = email.split("@")[0] ?? "User";
    const name = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    persistPeople([
      ...people,
      { id: `c-${Date.now()}`, name, email, permission: invitePerm },
    ]);
    setInviteEmail("");
  };

  const updatePerm = (id: string, permission: CollaboratorPermission) => {
    persistPeople(people.map((p) => (p.id === id ? { ...p, permission } : p)));
  };

  const removePerson = (id: string) => {
    persistPeople(people.filter((p) => p.id !== id));
  };

  const copyLink = () => {
    const token = generateShareToken(pid);
    const u =
      typeof window !== "undefined"
        ? `${window.location.origin}/editor?project=${encodeURIComponent(pid)}&token=${encodeURIComponent(token)}`
        : "";
    void navigator.clipboard.writeText(u).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const ownerName = user?.name?.trim() || "You";
  const ownerEmail = user?.email?.trim() || "Not signed in";
  const ownerInitials = ownerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className={styles.header}>
          <h2 id="share-modal-title" className={styles.title}>
            Share project
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.ownerRow}>
            <div className={styles.avatar}>
              {user?.image ? (
                <img src={user.image} alt="" />
              ) : (
                ownerInitials
              )}
            </div>
            <div className={styles.ownerMeta}>
              <div className={styles.ownerName}>{ownerName}</div>
              <div className={styles.ownerEmail}>{ownerEmail}</div>
            </div>
            <span className={styles.badge}>Owner</span>
          </div>

          <h3 className={`${styles.sectionTitle} ${styles.sectionTitleFirst}`}>Invite people</h3>
          <div className={styles.inviteRow}>
            <input
              type="email"
              className={styles.emailInput}
              placeholder="Add people by email..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInvite()}
            />
            <select
              className={styles.permSelect}
              value={invitePerm}
              onChange={(e) => setInvitePerm(e.target.value as CollaboratorPermission)}
              aria-label="Invite permission"
            >
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
            </select>
            <button type="button" className={styles.inviteBtn} onClick={addInvite} disabled={!inviteEmail.trim()}>
              Invite
            </button>
          </div>

          <h3 className={styles.sectionTitle}>People with access</h3>
          {people.map((p) => {
            const hue = hashHue(p.email);
            const bg = `hsl(${hue} 35% 32%)`;
            const initials = p.name
              .split(/\s+/)
              .map((x) => x[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div key={p.id} className={styles.collaboratorRow}>
                <div
                  className={styles.collabAvatar}
                  style={{ "--collab-avatar-bg": bg } as React.CSSProperties}
                >
                  {initials}
                </div>
                <div className={styles.collabText}>
                  <div className={styles.collabName}>{p.name}</div>
                  <div className={styles.collabEmail}>{p.email}</div>
                </div>
                <select
                  className={styles.collabPerm}
                  value={p.permission}
                  onChange={(e) => updatePerm(p.id, e.target.value as CollaboratorPermission)}
                  aria-label={`Permission for ${p.email}`}
                >
                  <option value="edit">Can edit</option>
                  <option value="view">Can view</option>
                </select>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removePerson(p.id)}
                  aria-label={`Remove ${p.email}`}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
          {people.length === 0 && <p className={styles.linkHint}>Only you have access right now.</p>}

          <div className={styles.divider} />

          <h3 className={styles.sectionTitle}>Share link</h3>
          <div className={styles.shareLinkRow}>
            <span className={styles.toggleLabel}>Anyone with the link can view</span>
            <button
              type="button"
              className={`${styles.switchTrack} ${linkEnabled ? styles.switchTrackOn : ""}`}
              onClick={() => setLinkEnabled((v) => !v)}
              role="switch"
              aria-checked={linkEnabled}
              aria-label="Anyone with the link can view"
            >
              <span className={`${styles.switchThumb} ${linkEnabled ? styles.switchThumbOn : ""}`} />
            </button>
          </div>

          {linkEnabled ? (
            <div className={styles.linkRow}>
              <input type="text" readOnly className={styles.linkInput} value={shareUrl} aria-label="Share URL" />
              <button type="button" className={styles.copyLinkBtn} onClick={copyLink}>
                <Copy size={16} aria-hidden />
                {copiedLink ? "Copied!" : "Copy link"}
              </button>
            </div>
          ) : (
            <p className={styles.linkHint}>Only invited people can access</p>
          )}

          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
