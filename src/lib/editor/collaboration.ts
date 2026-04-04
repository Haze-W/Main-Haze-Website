/**
 * Client-side collaboration roles & share metadata (localStorage).
 * Owner: full access. Editor: design changes only. Viewer: read-only canvas.
 */

export type CollabRole = "owner" | "editor" | "viewer";

export type ShareLinkAccess = "off" | "view" | "edit";

export interface ShareMeta {
  ownerEmail?: string;
  ownerUserId?: string;
  /** Anyone-with-link: off | view-only | can edit */
  linkAccess: ShareLinkAccess;
}

export interface CollaboratorRecord {
  id: string;
  name: string;
  email: string;
  /** Invited collaborators are editor or viewer only */
  role: "editor" | "viewer";
}

const shareMetaKey = (projectId: string) => `haze_share_meta_${projectId}`;
const collabKey = (projectId: string) => `haze_collaborators_${projectId}`;
const tokenKey = (projectId: string) => `haze_share_token_${projectId}`;
const deviceOwnerKey = (projectId: string) => `haze_device_owner_${projectId}`;

/** Call when this browser creates a project or is confirmed as account owner */
export function markDeviceAsProjectOwner(projectId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(deviceOwnerKey(projectId), "1");
}

function isDeviceOwner(projectId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(deviceOwnerKey(projectId)) === "1";
}

export function generateShareToken(projectId: string): string {
  const key = tokenKey(projectId);
  if (typeof window === "undefined") {
    return randomToken();
  }
  const existing = localStorage.getItem(key);
  if (existing && /^[a-zA-Z0-9]{16}$/.test(existing)) return existing;
  const t = randomToken();
  localStorage.setItem(key, t);
  return t;
}

/**
 * When opening /editor?project=&token=, store the token so it matches `generateShareToken`
 * for this browser (link access still comes from loaded `ShareMeta` / project file).
 */
export function ingestShareTokenFromUrl(projectId: string | null, tokenFromUrl: string | null) {
  if (typeof window === "undefined" || !projectId || projectId === "local") return;
  if (!tokenFromUrl || !/^[a-zA-Z0-9]{16}$/.test(tokenFromUrl)) return;
  localStorage.setItem(tokenKey(projectId), tokenFromUrl);
}

export function readShareToken(projectId: string): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(tokenKey(projectId));
  return v && /^[a-zA-Z0-9]{16}$/.test(v) ? v : null;
}

function randomToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let t = "";
  for (let i = 0; i < 16; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export function loadShareMeta(projectId: string): ShareMeta {
  if (typeof window === "undefined") {
    return { linkAccess: "off" };
  }
  try {
    const raw = localStorage.getItem(shareMetaKey(projectId));
    if (!raw) return { linkAccess: "off" };
    const o = JSON.parse(raw) as Partial<ShareMeta>;
    const linkAccess = o.linkAccess === "view" || o.linkAccess === "edit" ? o.linkAccess : "off";
    return {
      ownerEmail: typeof o.ownerEmail === "string" ? o.ownerEmail : undefined,
      ownerUserId: typeof o.ownerUserId === "string" ? o.ownerUserId : undefined,
      linkAccess,
    };
  } catch {
    return { linkAccess: "off" };
  }
}

export function saveShareMeta(projectId: string, meta: ShareMeta) {
  if (typeof window === "undefined") return;
  localStorage.setItem(shareMetaKey(projectId), JSON.stringify(meta));
}

export function ensureProjectShareOwner(projectId: string, email: string, userId?: string) {
  const cur = loadShareMeta(projectId);
  if (!cur.ownerEmail) {
    markDeviceAsProjectOwner(projectId);
    saveShareMeta(projectId, {
      ...cur,
      ownerEmail: email.toLowerCase(),
      ownerUserId: userId,
    });
  } else if (cur.ownerEmail.toLowerCase() === email.toLowerCase()) {
    markDeviceAsProjectOwner(projectId);
  }
}

export function loadCollaborators(projectId: string): CollaboratorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(collabKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateCollabRow).filter(Boolean) as CollaboratorRecord[];
  } catch {
    return [];
  }
}

function migrateCollabRow(row: unknown): CollaboratorRecord | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = String(o.id ?? "");
  const name = String(o.name ?? "");
  const email = String(o.email ?? "");
  if (!id || !email) return null;
  let role: "editor" | "viewer" = "editor";
  if (o.role === "viewer" || o.role === "editor") role = o.role;
  else if (o.permission === "view") role = "viewer";
  else if (o.permission === "edit") role = "editor";
  return { id, name, email, role };
}

export function saveCollaborators(projectId: string, list: CollaboratorRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(collabKey(projectId), JSON.stringify(list));
}

export function resolveCollabRole(
  projectId: string | null,
  opts: { userEmail: string | null | undefined; tokenFromUrl: string | null | undefined }
): CollabRole {
  const pid = projectId ?? "local";
  const meta = loadShareMeta(pid);
  const tokenOk =
    Boolean(opts.tokenFromUrl && opts.tokenFromUrl.length === 16) &&
    opts.tokenFromUrl === readShareToken(pid);

  if (tokenOk && meta.linkAccess === "view") return "viewer";
  if (tokenOk && meta.linkAccess === "edit") return "editor";

  const email = opts.userEmail?.trim().toLowerCase();
  if (email && meta.ownerEmail && email === meta.ownerEmail.toLowerCase()) {
    return "owner";
  }

  if (email) {
    const hit = loadCollaborators(pid).find((c) => c.email.toLowerCase() === email);
    if (hit) return hit.role === "editor" ? "editor" : "viewer";
  }

  if (!projectId || projectId === "local") return "owner";

  /** Project not yet claimed — first editor to open becomes owner via ensureProjectShareOwner */
  if (!meta.ownerEmail) return "owner";

  /** Same browser that created or verified ownership */
  if (isDeviceOwner(pid)) return "owner";

  /** Public link on but visitor has no valid token */
  if (meta.linkAccess !== "off" && !tokenOk) return "viewer";

  /** Claimed project, stranger without invite */
  return "viewer";
}

export function getCapabilities(role: CollabRole) {
  return {
    /** Canvas edits */
    canEditScene: role !== "viewer",
    /** Export, Share, Backend, project save-as destructive */
    canManageProject: role === "owner",
    /** Share modal & inviting */
    canShare: role === "owner",
    /** Backend workspace */
    canBackend: role === "owner",
    /** Export download */
    canExport: role === "owner",
    /** AI prompt that mutates scene — same as edit */
    canUseAiBuild: role !== "viewer",
    /** Code panel edit */
    canEditCode: role !== "viewer",
  };
}
