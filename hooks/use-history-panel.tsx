import { create } from "zustand";

interface HistoryPanelState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useHistoryPanel = create<HistoryPanelState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
