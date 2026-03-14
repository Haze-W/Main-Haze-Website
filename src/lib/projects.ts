/**
 * Project persistence — localStorage backed.
 * Drop-in replacement for hardcoded project list.
 * Ready to swap for a real API when backend is added.
 */

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes?: unknown[];   // serialized SceneNode[]
  template?: string;
}

const PROJECTS_KEY = "render-projects";

function getAll(): Record<string, Project> {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Project>) : {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, Project>) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(map));
}

export function listProjects(): Project[] {
  const map = getAll();
  return Object.values(map).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getProject(id: string): Project | null {
  return getAll()[id] ?? null;
}

export function createProject(name: string, template?: string): Project {
  const map = getAll();
  const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const project: Project = { id, name, template, createdAt: now, updatedAt: now, nodes: [] };
  map[id] = project;
  saveAll(map);
  return project;
}

export function saveProject(id: string, updates: Partial<Project>) {
  const map = getAll();
  if (!map[id]) return;
  map[id] = { ...map[id], ...updates, updatedAt: new Date().toISOString() };
  saveAll(map);
}

export function deleteProject(id: string) {
  const map = getAll();
  delete map[id];
  saveAll(map);
}

export function duplicateProject(id: string): Project | null {
  const map = getAll();
  const src = map[id];
  if (!src) return null;
  const newId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const copy: Project = { ...src, id: newId, name: `${src.name} (copy)`, createdAt: now, updatedAt: now };
  map[newId] = copy;
  saveAll(map);
  return copy;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}
