"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, LayoutGrid, Filter, ChevronDown } from "lucide-react";
import { listProjects } from "@/lib/projects";
import styles from "./dashboard.module.css";
import { useOpenCreateModal } from "./CreateModalContext";
import { useToast } from "@/components/Toast";

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString();
}

type ProjectSort = "recent" | "name";

export default function DashboardPage() {
  const [projects, setProjects] = useState<{ id: string; name: string; folder: string; updatedAt: string }[]>([]);
  const [sort, setSort] = useState<ProjectSort>("recent");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const openCreate = useOpenCreateModal();
  const { show } = useToast();

  useEffect(() => {
    try {
      const list = listProjects();
      setProjects(
        list.map((p) => ({
          id: p.id,
          name: p.name,
          folder: "Untitled Folder",
          updatedAt: formatRelativeTime(p.updatedAt),
        }))
      );
    } catch {
      setProjects([]);
    }
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Projects</h1>
          <p className={styles.pageSubtitle}>All projects</p>
        </div>
        <button type="button" className={styles.filterBtn}>
          <Filter size={16} strokeWidth={2} />
          All projects
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>
      <div className={styles.sceneGrid}>
        <button
          type="button"
          className={styles.sceneCardNew}
          onClick={openCreate}
        >
          <span className={styles.plusIcon}>
            <Plus size={24} strokeWidth={2} />
          </span>
          <span>Create New Project</span>
        </button>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/editor?project=${project.id}`}
            className={styles.sceneCard}
          >
            <div className={styles.scenePreview}>
              <LayoutGrid size={32} strokeWidth={1.5} />
            </div>
            <div className={styles.sceneInfo}>
              <h3>{project.name}</h3>
              <span>{project.folder}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
