"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Copy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  type ShareLinkAccess,
  type CollaboratorRecord,
  generateShareToken,
  loadShareMeta,
  saveShareMeta,
  loadCollaborators,
  saveCollaborators,
} from "@/lib/editor/collaboration";
import { saveProject } from "@/lib/projects";
import styles from "./ShareModal.module.css";

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
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [people, setPeople] = useState<CollaboratorRecord[]>([]);
  const [linkAccess, setLinkAccess] = useState<ShareLinkAccess>("off");
  const [copiedLink, setCopiedLink] = useState(false);

  const pid = projectId ?? "local";

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || linkAccess === "off") return "";
    const token = generateShareToken(pid);
    const u = new URL(window.location.origin + "/editor");
    u.searchParams.set("project", pid);
    u.searchParams.set("token", token);
    return u.toString();
  }, [pid, linkAccess]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setPeople(loadCollaborators(pid));
    setLinkAccess(loadShareMeta(pid).linkAccess);
  }, [isOpen, pid]);

  const persistPeople = useCallback(
    (next: CollaboratorRecord[]) => {
      setPeople(next);
      saveCollaborators(pid, next);
      if (pid !== "local") {
        saveProject(pid, {
          shareMeta: loadShareMeta(pid),
          collaborators: next,
        });
      }
    },
    [pid]
  );

  const persistLinkAccess = useCallback(
    (next: ShareLinkAccess) => {
      setLinkAccess(next);
      const meta = loadShareMeta(pid);
      saveShareMeta(pid, { ...meta, linkAccess: next });
      if (pid !== "local") {
        saveProject(pid, {
          shareMeta: loadShareMeta(pid),
          collaborators: loadCollaborators(pid),
        });
      }
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
      { id: `c-${Date.now()}`, name, email, role: inviteRole },
    ]);
    setInviteEmail("");
  };

  const updateRole = (id: string, role: "editor" | "viewer") => {
    persistPeople(people.map((p) => (p.id === id ? { ...p, role } : p)));
  };

  const removePerson = (id: string) => {
    persistPeople(people.filter((p) => p.id !== id));
  };

  const copyLink = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const ownerName = user?.name?.trim() || "You";
  const ownerEmail = user?.email?.trim() || "Not signed in";
  const ownerInitials =
    ownerName
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
              {user?.image ? <img src={user.image} alt="" /> : ownerInitials}
            </div>
            <div className={styles.ownerMeta}>
              <div className={styles.ownerName}>{ownerName}</div>
              <div className={styles.ownerEmail}>{ownerEmail}</div>
            </div>
            <span className={styles.badge}>Owner</span>
          </div>

          <h3 className={`${styles.sectionTitle} ${styles.sectionTitleFirst}`}>Invite people</h3>
          <p className={styles.linkHint}>
            Editors can change the canvas and prototype links. Viewers can only browse and preview.
          </p>
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
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
              aria-label="Invite role"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
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
                  value={p.role}
                  onChange={(e) => updateRole(p.id, e.target.value as "editor" | "viewer")}
                  aria-label={`Role for ${p.email}`}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
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
            <span className={styles.toggleLabel}>Link access</span>
            <select
              className={styles.permSelect}
              value={linkAccess}
              onChange={(e) => persistLinkAccess(e.target.value as ShareLinkAccess)}
              aria-label="Anyone with link"
            >
              <option value="off">Off — link disabled</option>
              <option value="view">Anyone with link can view</option>
              <option value="edit">Anyone with link can edit</option>
            </select>
          </div>

          {linkAccess !== "off" ? (
            <div className={styles.linkRow}>
              <input type="text" readOnly className={styles.linkInput} value={shareUrl} aria-label="Share URL" />
              <button type="button" className={styles.copyLinkBtn} onClick={copyLink}>
                <Copy size={16} aria-hidden />
                {copiedLink ? "Copied!" : "Copy link"}
              </button>
            </div>
          ) : (
            <p className={styles.linkHint}>Turn on link sharing to generate a URL with the project token.</p>
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
