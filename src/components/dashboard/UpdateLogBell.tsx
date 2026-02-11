"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import type { UpdateLogEntry } from "@/lib/update-log";
import styles from "@/app/dashboard/dashboard.module.css";

const POLL_INTERVAL_MS = 15000;
const LAST_SEEN_KEY = "render:last-seen-update-id";

type UpdateLogResponse = {
  entries: UpdateLogEntry[];
  error?: string;
};

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
}

export function UpdateLogBell() {
  const [entries, setEntries] = useState<UpdateLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string>("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_SEEN_KEY) || "";
      setLastSeenId(stored);
    } catch {
      setLastSeenId("");
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchUpdates = async () => {
      try {
        const response = await fetch("/api/update-log", { cache: "no-store" });
        const payload = (await response.json()) as UpdateLogResponse;

        if (!isActive) return;

        if (!response.ok) {
          setError(payload.error || "Unable to load updates right now.");
          setEntries([]);
        } else {
          setError(null);
          setEntries(payload.entries || []);
        }
      } catch {
        if (!isActive) return;
        setError("Unable to load updates right now.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchUpdates();
    const timer = window.setInterval(fetchUpdates, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

  const latestId = entries[0]?.id || "";
  const hasUnread = Boolean(latestId) && latestId !== lastSeenId;

  const latestTitle = useMemo(() => entries[0]?.title || "Update Log", [entries]);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && latestId) {
      setLastSeenId(latestId);
      try {
        window.localStorage.setItem(LAST_SEEN_KEY, latestId);
      } catch {
        // Ignore localStorage errors in restricted environments.
      }
    }
  };

  return (
    <div className={styles.updateLogWrap}>
      <button
        type="button"
        className={styles.iconBtn}
        title={latestTitle}
        onClick={handleToggle}
      >
        <Bell size={18} />
        {hasUnread ? <span className={styles.updateDot} /> : null}
      </button>

      {isOpen ? (
        <div className={styles.updatePanel} role="dialog" aria-label="Update log">
          <div className={styles.updatePanelHeader}>
            <strong>Update Log</strong>
          </div>

          {isLoading ? (
            <div className={styles.updateLoading}>
              <Loader2 size={14} className={styles.spinIcon} />
              <span>Loading updates...</span>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className={styles.updateError}>{error}</div>
          ) : null}

          {!isLoading && !error && entries.length === 0 ? (
            <p className={styles.updateEmpty}>No updates published yet.</p>
          ) : null}

          {!isLoading && !error && entries.length > 0 ? (
            <div className={styles.updateList}>
              {entries.map((entry) => (
                <article key={entry.id} className={styles.updateItem}>
                  <h3>{entry.title}</h3>
                  <ul>
                    {entry.description.map((point) => (
                      <li key={`${entry.id}-${point}`}>{point}</li>
                    ))}
                  </ul>
                  <time>{formatDate(entry.publishedAt)}</time>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
