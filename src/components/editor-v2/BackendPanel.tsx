"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getProject, saveProject } from "@/lib/projects";
import type {
  ProjectBackendConfig,
  BackendDbTable,
  BackendApiRoute,
  BackendHttpMethod,
  BackendAuthProvider,
} from "@/lib/editor/backend-config";
import { DEFAULT_BACKEND_CONFIG, normalizeBackendConfig } from "@/lib/editor/backend-config";
import styles from "./BackendPanel.module.css";

type BackendTab = "database" | "api" | "auth";

const METHOD_COLORS: Record<BackendHttpMethod, string> = {
  GET: "#22c55e",
  POST: "#3b82f6",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
  PATCH: "#8b5cf6",
};

function DatabasePanel({
  tables,
  setTables,
}: {
  tables: BackendDbTable[];
  setTables: React.Dispatch<React.SetStateAction<BackendDbTable[]>>;
}) {
  const addTable = () => {
    const id = `table_${Date.now()}`;
    setTables((t) => [
      ...t,
      {
        id,
        name: "new_table",
        x: 40 + t.length * 20,
        y: 40 + t.length * 20,
        fields: [{ id: "id", name: "id", type: "UUID", primaryKey: true, nullable: false }],
      },
    ]);
  };

  const addField = (tableId: string) => {
    setTables((ts) =>
      ts.map((t) =>
        t.id === tableId
          ? {
              ...t,
              fields: [
                ...t.fields,
                { id: `f_${Date.now()}`, name: "new_field", type: "TEXT", nullable: true },
              ],
            }
          : t
      )
    );
  };

  const generateSQL = () => {
    return tables
      .map((table) => {
        const fields = table.fields
          .map((f) => {
            let def = `  ${f.name} ${f.type}`;
            if (f.primaryKey) def += " PRIMARY KEY";
            if (!f.nullable) def += " NOT NULL";
            if (f.unique) def += " UNIQUE";
            return def;
          })
          .join(",\n");
        return `CREATE TABLE ${table.name} (\n${fields}\n);`;
      })
      .join("\n\n");
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={addTable}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            background: "#3b82f6",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Add Table
        </button>
        <button
          type="button"
          onClick={() => alert(generateSQL())}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--color-border-tertiary)",
            background: "transparent",
            color: "var(--color-text-primary)",
            cursor: "pointer",
          }}
        >
          View SQL
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {tables.map((table) => (
          <div
            key={table.id}
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 8,
              width: 280,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#1e40af",
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <input
                value={table.name}
                onChange={(e) =>
                  setTables((ts) =>
                    ts.map((t) => (t.id === table.id ? { ...t, name: e.target.value } : t))
                  )
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 13,
                  outline: "none",
                  width: "100%",
                }}
              />
              <button
                type="button"
                onClick={() => setTables((ts) => ts.filter((t) => t.id !== table.id))}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            {table.fields.map((field) => (
              <div
                key={field.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderBottom: "1px solid var(--color-border-tertiary)",
                  fontSize: 12,
                }}
              >
                {field.primaryKey && (
                  <span
                    style={{
                      background: "#fbbf24",
                      color: "#78350f",
                      borderRadius: 3,
                      padding: "1px 4px",
                      fontSize: 10,
                    }}
                  >
                    PK
                  </span>
                )}
                <input
                  value={field.name}
                  onChange={(e) =>
                    setTables((ts) =>
                      ts.map((t) =>
                        t.id === table.id
                          ? {
                              ...t,
                              fields: t.fields.map((f) =>
                                f.id === field.id ? { ...f, name: e.target.value } : f
                              ),
                            }
                          : t
                      )
                    )
                  }
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-primary)",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    setTables((ts) =>
                      ts.map((t) =>
                        t.id === table.id
                          ? {
                              ...t,
                              fields: t.fields.map((f) =>
                                f.id === field.id ? { ...f, type: e.target.value } : f
                              ),
                            }
                          : t
                      )
                    )
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {["TEXT", "INTEGER", "BOOLEAN", "TIMESTAMP", "UUID", "FLOAT", "JSON"].map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setTables((ts) =>
                      ts.map((t) =>
                        t.id === table.id
                          ? { ...t, fields: t.fields.filter((f) => f.id !== field.id) }
                          : t
                      )
                    )
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addField(table.id)}
              style={{
                width: "100%",
                padding: "6px",
                background: "transparent",
                border: "none",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              + Add field
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiPanel({
  routes,
  setRoutes,
  selectedId,
  setSelectedId,
}: {
  routes: BackendApiRoute[];
  setRoutes: React.Dispatch<React.SetStateAction<BackendApiRoute[]>>;
  selectedId: string;
  setSelectedId: (id: string) => void;
}) {
  const selected = routes.find((r) => r.id === selectedId);

  const generateCode = async (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    setRoutes((rs) => rs.map((r) => (r.id === routeId ? { ...r, generating: true } : r)));
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate a Tauri Rust command for this endpoint:\nMethod: ${route.method}\nPath: ${route.path}\nDescription: ${route.description}\n\nReturn ONLY the Rust code for the tauri command function ready to paste into src-tauri/src/main.rs`,
            },
          ],
          mode: "backend",
          nodes: [],
          projectName: "Haze App",
        }),
      });
      const data = (await res.json()) as { text?: string; rust?: string };
      setRoutes((rs) =>
        rs.map((r) =>
          r.id === routeId
            ? {
                ...r,
                generating: false,
                generatedCode: data.text ?? data.rust ?? "// Generation failed",
              }
            : r
        )
      );
    } catch {
      setRoutes((rs) =>
        rs.map((r) =>
          r.id === routeId ? { ...r, generating: false, generatedCode: "// Error" } : r
        )
      );
    }
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: 240, borderRight: "1px solid var(--color-border-tertiary)", padding: 12 }}>
        <button
          type="button"
          onClick={() => {
            const id = `r_${Date.now()}`;
            setRoutes((rs) => [
              ...rs,
              {
                id,
                method: "GET",
                path: "/api/new",
                description: "",
                generatedCode: "",
                generating: false,
              },
            ]);
            setSelectedId(id);
          }}
          style={{
            width: "100%",
            padding: "6px 12px",
            borderRadius: 6,
            background: "#3b82f6",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          + Add Route
        </button>
        {routes.map((route) => (
          <div
            key={route.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedId(route.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedId(route.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              borderRadius: 6,
              cursor: "pointer",
              background: selectedId === route.id ? "var(--color-background-tertiary)" : "transparent",
            }}
          >
            <span
              style={{
                color: METHOD_COLORS[route.method],
                fontWeight: 600,
                fontSize: 11,
                minWidth: 40,
              }}
            >
              {route.method}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {route.path}
            </span>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={selected.method}
              onChange={(e) =>
                setRoutes((rs) =>
                  rs.map((r) =>
                    r.id === selected.id ? { ...r, method: e.target.value as BackendHttpMethod } : r
                  )
                )
              }
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: METHOD_COLORS[selected.method],
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {(["GET", "POST", "PUT", "DELETE", "PATCH"] as const).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              value={selected.path}
              onChange={(e) =>
                setRoutes((rs) =>
                  rs.map((r) => (r.id === selected.id ? { ...r, path: e.target.value } : r))
                )
              }
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-primary)",
                fontSize: 13,
              }}
            />
          </div>
          <textarea
            value={selected.description}
            onChange={(e) =>
              setRoutes((rs) =>
                rs.map((r) => (r.id === selected.id ? { ...r, description: e.target.value } : r))
              )
            }
            placeholder="Describe what this endpoint does..."
            rows={3}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontSize: 13,
              resize: "vertical",
            }}
          />
          <button
            type="button"
            onClick={() => generateCode(selected.id)}
            disabled={selected.generating}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              background: "#7c3aed",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {selected.generating ? "Generating..." : "⚡ Generate Rust Code"}
          </button>
          {selected.generatedCode && (
            <pre
              style={{
                background: "#1e1e1e",
                color: "#d4d4d4",
                padding: 16,
                borderRadius: 8,
                fontSize: 12,
                overflow: "auto",
                flex: 1,
              }}
            >
              {selected.generatedCode}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function AuthPanel({
  providers,
  setProviders,
  jwtSecret,
  setJwtSecret,
  sessionDays,
  setSessionDays,
  generatedCode,
  setGeneratedCode,
}: {
  providers: BackendAuthProvider[];
  setProviders: React.Dispatch<React.SetStateAction<BackendAuthProvider[]>>;
  jwtSecret: string;
  setJwtSecret: (v: string) => void;
  sessionDays: number;
  setSessionDays: (v: number) => void;
  generatedCode: string;
  setGeneratedCode: (v: string) => void;
}) {
  const [generating, setGenerating] = useState(false);

  const generateAuthConfig = async () => {
    setGenerating(true);
    const enabled = providers.filter((p) => p.enabled);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Generate a complete Better Auth configuration file (auth.ts) for a Next.js + Tauri app. Enabled providers: ${enabled.map((p) => p.name).join(", ")}. Session duration: ${sessionDays} days. Include all necessary imports and exports. Return only the TypeScript code.`,
            },
          ],
          mode: "backend",
          nodes: [],
          projectName: "Haze App",
        }),
      });
      const data = (await res.json()) as { text?: string };
      setGeneratedCode(data.text ?? "// Generation failed");
    } catch {
      setGeneratedCode("// Error generating config");
    }
    setGenerating(false);
  };

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>
          Auth Providers
        </h3>
        {providers.map((p) => (
          <div
            key={p.id}
            style={{
              background: "var(--color-background-primary)",
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 8,
              marginBottom: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{p.name}</span>
              <button
                type="button"
                onClick={() =>
                  setProviders((ps) => ps.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)))
                }
                style={{
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "none",
                  background: p.enabled ? "#22c55e" : "var(--color-border-tertiary)",
                  color: p.enabled ? "white" : "var(--color-text-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {p.enabled ? "ON" : "OFF"}
              </button>
            </div>
            {p.enabled && p.id !== "email" && (
              <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  placeholder="Client ID"
                  value={p.clientId}
                  onChange={(e) =>
                    setProviders((ps) =>
                      ps.map((x) => (x.id === p.id ? { ...x, clientId: e.target.value } : x))
                    )
                  }
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--color-border-tertiary)",
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-primary)",
                    fontSize: 12,
                  }}
                />
                <input
                  type="password"
                  placeholder="Client Secret"
                  value={p.clientSecret}
                  onChange={(e) =>
                    setProviders((ps) =>
                      ps.map((x) => (x.id === p.id ? { ...x, clientSecret: e.target.value } : x))
                    )
                  }
                  style={{
                    padding: "6px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--color-border-tertiary)",
                    background: "var(--color-background-secondary)",
                    color: "var(--color-text-primary)",
                    fontSize: 12,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>
          Session Settings
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            JWT Secret (min 32 chars)
          </label>
          <input
            type="password"
            placeholder="your-super-secret-key-min-32-chars"
            value={jwtSecret}
            onChange={(e) => setJwtSecret(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontSize: 13,
            }}
          />
          <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            Session duration (days)
          </label>
          <input
            type="number"
            value={sessionDays}
            min={1}
            max={365}
            onChange={(e) => setSessionDays(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--color-border-tertiary)",
              background: "var(--color-background-primary)",
              color: "var(--color-text-primary)",
              fontSize: 13,
              width: 80,
            }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={generateAuthConfig}
        disabled={generating}
        style={{
          padding: "10px 16px",
          borderRadius: 6,
          background: "#7c3aed",
          color: "white",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {generating ? "Generating..." : "⚡ Generate auth.ts config"}
      </button>
      {generatedCode && (
        <pre
          style={{
            background: "#1e1e1e",
            color: "#d4d4d4",
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            overflow: "auto",
            maxHeight: 400,
          }}
        >
          {generatedCode}
        </pre>
      )}
    </div>
  );
}

export function BackendPanel({ projectId }: { projectId: string | null }) {
  const [tab, setTab] = useState<BackendTab>("database");
  const [config, setConfig] = useState<ProjectBackendConfig>(() => ({
    ...DEFAULT_BACKEND_CONFIG,
  }));
  const skipNextSave = useRef(false);

  useEffect(() => {
    skipNextSave.current = true;
    if (!projectId) {
      setConfig({ ...DEFAULT_BACKEND_CONFIG });
      return;
    }
    const p = getProject(projectId);
    setConfig(normalizeBackendConfig(p?.backendConfig));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      saveProject(projectId, { backendConfig: config });
    }, 600);
    return () => clearTimeout(t);
  }, [projectId, config]);

  const setTables = useCallback((fn: React.SetStateAction<BackendDbTable[]>) => {
    setConfig((c) => ({
      ...c,
      databaseTables: typeof fn === "function" ? fn(c.databaseTables) : fn,
    }));
  }, []);

  const setRoutes = useCallback((fn: React.SetStateAction<BackendApiRoute[]>) => {
    setConfig((c) => ({
      ...c,
      apiRoutes: typeof fn === "function" ? fn(c.apiRoutes) : fn,
    }));
  }, []);

  const setSelectedId = useCallback((id: string) => {
    setConfig((c) => ({ ...c, apiSelectedId: id }));
  }, []);

  const setProviders = useCallback((fn: React.SetStateAction<BackendAuthProvider[]>) => {
    setConfig((c) => ({
      ...c,
      authProviders: typeof fn === "function" ? fn(c.authProviders) : fn,
    }));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {(["database", "api", "auth"] as BackendTab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "database" ? "Database" : t === "api" ? "API Routes" : "Auth"}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {tab === "database" && (
          <DatabasePanel tables={config.databaseTables} setTables={setTables} />
        )}
        {tab === "api" && (
          <ApiPanel
            routes={config.apiRoutes}
            setRoutes={setRoutes}
            selectedId={
              config.apiRoutes.some((r) => r.id === config.apiSelectedId)
                ? config.apiSelectedId
                : config.apiRoutes[0]?.id ?? ""
            }
            setSelectedId={setSelectedId}
          />
        )}
        {tab === "auth" && (
          <AuthPanel
            providers={config.authProviders}
            setProviders={setProviders}
            jwtSecret={config.jwtSecret}
            setJwtSecret={(jwtSecret) => setConfig((c) => ({ ...c, jwtSecret }))}
            sessionDays={config.sessionDays}
            setSessionDays={(sessionDays) => setConfig((c) => ({ ...c, sessionDays }))}
            generatedCode={config.authGeneratedCode}
            setGeneratedCode={(authGeneratedCode) => setConfig((c) => ({ ...c, authGeneratedCode }))}
          />
        )}
      </div>
    </div>
  );
}
