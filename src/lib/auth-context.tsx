"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string
  ) => Promise<{ error?: { message: string } }>;
  signup: (
    email: string,
    name?: string,
    password?: string
  ) => Promise<{ error?: { message: string } }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const user: AuthUser | null = useMemo(() => {
    if (!session?.user) return null;
    const u = session.user;
    return {
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? null,
      image: u.image ?? null,
    };
  }, [session?.user]);

  const isAuthenticated = !!session?.user;

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: { message: string } }> => {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });
      if (result.error) {
        return { error: { message: result.error.message ?? "Sign in failed" } };
      }
      return {};
    },
    []
  );

  const signup = useCallback(
    async (
      email: string,
      name?: string,
      password?: string
    ): Promise<{ error?: { message: string } }> => {
      const result = await authClient.signUp.email({
        email,
        password: password ?? "",
        name: name ?? "",
        callbackURL: "/dashboard",
      });
      if (result.error) {
        return { error: { message: result.error.message ?? "Sign up failed" } };
      }
      return {};
    },
    []
  );

  const logout = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading: isPending,
      login,
      signup,
      logout,
    }),
    [user, isAuthenticated, isPending, login, signup, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
