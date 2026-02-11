"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const AUTH_KEY = "render-auth";

interface AuthUser {
  email: string;
  name?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password?: string) => void;
  signup: (email: string, name?: string, password?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const data = JSON.parse(stored) as AuthUser;
        setState({ user: data, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {
      // ignore
    }
    setState((s) => ({ ...s, isLoading: false }));
  }, []);

  const login = useCallback((email: string, _password?: string) => {
    const user = { email, name: email.split("@")[0] };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    setState({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const signup = useCallback(
    (email: string, name?: string, _password?: string) => {
      const user = { email, name: name || email.split("@")[0] };
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      setState({ user, isAuthenticated: true, isLoading: false });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
