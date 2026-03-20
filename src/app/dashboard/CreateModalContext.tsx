"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface CreateModalContextValue {
  openCreate: (folderId: string) => void;
  folderId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateModalContext = createContext<CreateModalContextValue | null>(null);

export function CreateModalProvider({
  children,
  openCreate,
  createOpen,
  onCreateOpenChange,
}: {
  children: React.ReactNode;
  openCreate: (open: boolean) => void;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  const [folderId, setFolderId] = useState<string | null>(null);

  const openCreateWithFolder = useCallback(
    (fid: string) => {
      setFolderId(fid);
      openCreate(true);
    },
    [openCreate]
  );

  return (
    <CreateModalContext.Provider
      value={{
        openCreate: openCreateWithFolder,
        folderId,
        isOpen: createOpen,
        onOpenChange: onCreateOpenChange,
      }}
    >
      {children}
    </CreateModalContext.Provider>
  );
}

export function useOpenCreateModal() {
  const ctx = useContext(CreateModalContext);
  return ctx?.openCreate ?? (() => {});
}

export function useCreateModalContext() {
  const ctx = useContext(CreateModalContext);
  return ctx;
}
