/**
 * Folder persistence — localStorage backed.
 * Each folder is empty by default. Create unique folders to organize projects.
 */

import { nanoid } from "nanoid";

export interface FolderItem {
  id: string;
  name: string;
  path: string;
}

const FOLDERS_KEY = "haze-folders";

export function getFolders(): FolderItem[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FolderItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFolders(folders: FolderItem[]) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    // ignore
  }
}

/** Generate a unique folder name (e.g. "New Folder", "New Folder (1)") */
export function getUniqueFolderName(): string {
  const folders = getFolders();
  const base = "New Folder";
  const used = new Set(folders.map((f) => f.name));
  if (!used.has(base)) return base;
  let i = 1;
  while (used.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

export function createFolder(name?: string): FolderItem {
  const folders = getFolders();
  const finalName = name?.trim() || getUniqueFolderName();
  const id = `f-${nanoid(10)}`;
  const item: FolderItem = {
    id,
    name: finalName,
    path: `/dashboard?folder=${id}`,
  };
  const next = [item, ...folders];
  saveFolders(next);
  return item;
}
