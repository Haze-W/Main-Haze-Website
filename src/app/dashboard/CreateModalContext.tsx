"use client";

import { createContext, useContext } from "react";

const CreateModalContext = createContext<(() => void) | null>(null);

export function CreateModalProvider({
  children,
  openCreate,
}: {
  children: React.ReactNode;
  openCreate: () => void;
}) {
  return (
    <CreateModalContext.Provider value={openCreate}>
      {children}
    </CreateModalContext.Provider>
  );
}

export function useOpenCreateModal() {
  const open = useContext(CreateModalContext);
  return open ?? (() => {});
}
