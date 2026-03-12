"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
    >
      {children}
    </NextThemeProvider>
  );
}
