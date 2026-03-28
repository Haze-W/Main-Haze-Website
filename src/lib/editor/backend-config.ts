/**
 * Serializable backend designer state (persisted on Project).
 */

export type BackendTableField = {
  id: string;
  name: string;
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
};

export type BackendDbTable = {
  id: string;
  name: string;
  x: number;
  y: number;
  fields: BackendTableField[];
};

export type BackendHttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type BackendApiRoute = {
  id: string;
  method: BackendHttpMethod;
  path: string;
  description: string;
  generatedCode: string;
  generating: boolean;
};

export type BackendAuthProvider = {
  id: string;
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
};

export interface ProjectBackendConfig {
  v: 1;
  databaseTables: BackendDbTable[];
  apiRoutes: BackendApiRoute[];
  apiSelectedId: string;
  authProviders: BackendAuthProvider[];
  jwtSecret: string;
  sessionDays: number;
  authGeneratedCode: string;
}

export const DEFAULT_BACKEND_CONFIG: ProjectBackendConfig = {
  v: 1,
  databaseTables: [
    {
      id: "users",
      name: "users",
      x: 40,
      y: 40,
      fields: [
        { id: "id", name: "id", type: "UUID", primaryKey: true, nullable: false },
        { id: "email", name: "email", type: "TEXT", unique: true, nullable: false },
        { id: "created_at", name: "created_at", type: "TIMESTAMP", nullable: false },
      ],
    },
  ],
  apiRoutes: [
    {
      id: "1",
      method: "GET",
      path: "/api/users",
      description: "Get all users",
      generatedCode: "",
      generating: false,
    },
    {
      id: "2",
      method: "POST",
      path: "/api/users",
      description: "Create a new user",
      generatedCode: "",
      generating: false,
    },
  ],
  apiSelectedId: "1",
  authProviders: [
    { id: "email", name: "Email + Password", enabled: true, clientId: "", clientSecret: "" },
    { id: "google", name: "Google OAuth", enabled: false, clientId: "", clientSecret: "" },
    { id: "github", name: "GitHub OAuth", enabled: false, clientId: "", clientSecret: "" },
    { id: "discord", name: "Discord OAuth", enabled: false, clientId: "", clientSecret: "" },
  ],
  jwtSecret: "",
  sessionDays: 7,
  authGeneratedCode: "",
};

export function normalizeBackendConfig(raw: unknown): ProjectBackendConfig {
  const base = DEFAULT_BACKEND_CONFIG;
  if (!raw || typeof raw !== "object") return { ...base };
  const o = raw as Partial<ProjectBackendConfig>;
  return {
    v: 1,
    databaseTables: Array.isArray(o.databaseTables) ? (o.databaseTables as BackendDbTable[]) : base.databaseTables,
    apiRoutes: Array.isArray(o.apiRoutes) ? (o.apiRoutes as BackendApiRoute[]) : base.apiRoutes,
    apiSelectedId: typeof o.apiSelectedId === "string" ? o.apiSelectedId : base.apiSelectedId,
    authProviders: Array.isArray(o.authProviders) ? (o.authProviders as BackendAuthProvider[]) : base.authProviders,
    jwtSecret: typeof o.jwtSecret === "string" ? o.jwtSecret : base.jwtSecret,
    sessionDays: typeof o.sessionDays === "number" && o.sessionDays >= 1 ? o.sessionDays : base.sessionDays,
    authGeneratedCode: typeof o.authGeneratedCode === "string" ? o.authGeneratedCode : base.authGeneratedCode,
  };
}
