"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../dashboard.module.css";

const TEMPLATES = [
  { id: "blank", name: "Blank Tauri App", desc: "Empty project ready for your design" },
  { id: "dashboard", name: "Desktop Dashboard", desc: "Multi-panel dashboard layout" },
  { id: "utility", name: "Utility Application", desc: "Compact single-window utility" },
  { id: "custom", name: "Custom Layout", desc: "Start from custom dimensions" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([
    { id: "1", name: "My App", updatedAt: "2 hours ago" },
    { id: "2", name: "Dashboard Prototype", updatedAt: "Yesterday" },
  ]);

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      setProjects((prev) => [...prev, { ...proj, id: `${id}-copy-${Date.now()}`, name: `${proj.name} (copy)`, updatedAt: "Just now" }]);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className={styles.section}>
      <h1>Projects</h1>
      <div className={styles.projectGrid}>
        <Link href="/editor" className={styles.projectCardNew}>
          <span className={styles.plusIcon}>+</span>
          <span>Create New Project</span>
        </Link>
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/editor?project=${project.id}`}
            className={styles.projectCard}
          >
            <div className={styles.projectPreview} />
            <div className={styles.projectInfo}>
              <h3>{project.name}</h3>
              <span>{project.updatedAt}</span>
            </div>
            <div className={styles.projectActions}>
              <button type="button" title="Duplicate" onClick={(e) => handleDuplicate(e, project.id)}>⎘</button>
              <button type="button" title="Delete" onClick={(e) => handleDelete(e, project.id)}>×</button>
            </div>
          </Link>
        ))}
      </div>

      <h2>Templates</h2>
      <div className={styles.templateGrid}>
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className={styles.templateCard}
            onClick={() => (window.location.href = `/editor?template=${tpl.id}`)}
          >
            <div className={styles.templatePreview}>
              {tpl.id === "blank" && <span className={styles.templateIcon}>□</span>}
              {tpl.id === "dashboard" && <span className={styles.templateIcon}>⊞</span>}
              {tpl.id === "utility" && <span className={styles.templateIcon}>◆</span>}
              {tpl.id === "custom" && <span className={styles.templateIcon}>⚙</span>}
            </div>
            <h3>{tpl.name}</h3>
            <p>{tpl.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
