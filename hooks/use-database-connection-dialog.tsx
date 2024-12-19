import { create } from "zustand";

interface DatabaseConnectionDialogState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useDatabaseConnectionDialog =
  create<DatabaseConnectionDialogState>((set) => ({
    isOpen: false,
    setIsOpen: (isOpen) => set({ isOpen }),
  }));
