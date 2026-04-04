/**
 * Folder persistence — localStorage backed.
 */

export interface FolderItem {
  id: string;
  name: string;
  path: string;
}

const FOLDERS_KEY = "haze-folders";

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "f1", name: "Untitled Folder", path: "/dashboard" },
  { id: "f2", name: "3D Icons", path: "/dashboard?folder=3d-icons" },
];

export function getFolders(): FolderItem[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [...DEFAULT_FOLDERS];
    const parsed = JSON.parse(raw) as FolderItem[];
    return Array.isArray(parsed) ? parsed : [...DEFAULT_FOLDERS];
  } catch {
    return [...DEFAULT_FOLDERS];
  }
}

export function saveFolders(folders: FolderItem[]) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    // ignore
  }
}
