"use client";

import { useFigmaPasteListener } from "@/lib/figma/paste-listener";

export function FigmaPasteProvider({ children }: { children: React.ReactNode }) {
  useFigmaPasteListener();
  return <>{children}</>;
}
