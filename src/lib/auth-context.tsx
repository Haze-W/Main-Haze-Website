"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  onboardingCompleted?: boolean;
  preferredRuntime?: string | null;
  preferredLanguage?: string | null;
}

const GUEST_USER: AuthUser = {
  id: "guest",
  email: "",
  name: "Guest",
  image: null,
  onboardingCompleted: true,
  preferredRuntime: "tauri",
  preferredLanguage: "typescript",
};

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
  signInWithGoogle: (callbackURL?: string) => Promise<{ error?: { message: string } }>;
  signInWithGithub: (callbackURL?: string) => Promise<{ error?: { message: string } }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const user: AuthUser | null = GUEST_USER;
  const isAuthenticated = true;
  const isLoading = false;

  const login = useCallback(
    async (_email: string, _password: string): Promise<{ error?: { message: string } }> => {
      return {};
    },
    []
  );

  const signup = useCallback(
    async (_email: string, _name?: string, _password?: string): Promise<{ error?: { message: string } }> => {
      return {};
    },
    []
  );

  const signInWithGoogle = useCallback(
    async (callbackURL = "/dashboard"): Promise<{ error?: { message: string } }> => {
      router.push(callbackURL);
      return {};
    },
    [router]
  );

  const signInWithGithub = useCallback(
    async (callbackURL = "/dashboard"): Promise<{ error?: { message: string } }> => {
      router.push(callbackURL);
      return {};
    },
    [router]
  );

  const logout = useCallback(async () => {
    router.push("/login");
  }, [router]);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      signup,
      signInWithGoogle,
      signInWithGithub,
      logout,
    }),
    [user, isAuthenticated, isLoading, login, signup, signInWithGoogle, signInWithGithub, logout]
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
