"use client";

import { createContext, useCallback, useContext, useState, useRef, useEffect } from "react";
import styles from "./Toast.module.css";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const show = useCallback((message: string, type: ToastType = "error") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      timeoutRefs.current.delete(id);
    }, 5000);
    timeoutRefs.current.set(id, t);
  }, []);

  const dismiss = useCallback((id: string) => {
    const t = timeoutRefs.current.get(id);
    if (t) clearTimeout(t);
    timeoutRefs.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((t) => clearTimeout(t));
      timeoutRefs.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type]}`}
            role="alert"
          >
            <span className={styles.icon}>
              {t.type === "error" ? "✕" : t.type === "success" ? "✓" : "ℹ"}
            </span>
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
