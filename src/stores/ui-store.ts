import { create } from "zustand";

interface PanelState {
  fileTreeOpen: boolean;
  terminalOpen: boolean;
}

interface UiState {
  panels: PanelState;
  inputFocused: boolean;
  toggleFileTree: () => void;
  toggleTerminal: () => void;
  setInputFocused: (focused: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  panels: {
    fileTreeOpen: false,
    terminalOpen: false,
  },
  inputFocused: true,
  toggleFileTree: () =>
    set((s) => ({
      panels: { ...s.panels, fileTreeOpen: !s.panels.fileTreeOpen },
    })),
  toggleTerminal: () =>
    set((s) => ({
      panels: { ...s.panels, terminalOpen: !s.panels.terminalOpen },
    })),
  setInputFocused: (focused) => set({ inputFocused: focused }),
}));
