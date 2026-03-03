import { create } from "zustand";

export type MainView = "chat" | "editor";

interface PanelState {
  fileTreeOpen: boolean;
  terminalOpen: boolean;
  settingsOpen: boolean;
  searchOpen: boolean;
  gitOpen: boolean;
  todosOpen: boolean;
  snippetsOpen: boolean;
  pluginsOpen: boolean;
  debugOpen: boolean;
}

interface UiState {
  panels: PanelState;
  mainView: MainView;
  toggleFileTree: () => void;
  openFileTree: () => void;
  toggleTerminal: () => void;
  toggleSettings: () => void;
  toggleSearch: () => void;
  toggleGit: () => void;
  toggleTodos: () => void;
  toggleSnippets: () => void;
  togglePlugins: () => void;
  toggleDebug: () => void;
  closePanel: (panel: string) => void;
  setMainView: (view: MainView) => void;
  toggleMainView: () => void;
}

const toggle = (key: keyof PanelState) => (s: UiState) => ({
  panels: { ...s.panels, [key]: !s.panels[key] },
});

export const useUiStore = create<UiState>((set) => ({
  panels: {
    fileTreeOpen: false,
    terminalOpen: false,
    settingsOpen: false,
    searchOpen: false,
    gitOpen: false,
    todosOpen: false,
    snippetsOpen: false,
    pluginsOpen: false,
    debugOpen: false,
  },
  mainView: "chat",
  toggleFileTree: () => set(toggle("fileTreeOpen")),
  openFileTree: () => set((s) => ({ panels: { ...s.panels, fileTreeOpen: true } })),
  toggleTerminal: () => set(toggle("terminalOpen")),
  toggleSettings: () => set(toggle("settingsOpen")),
  toggleSearch: () => set(toggle("searchOpen")),
  toggleGit: () => set(toggle("gitOpen")),
  toggleTodos: () => set(toggle("todosOpen")),
  toggleSnippets: () => set(toggle("snippetsOpen")),
  togglePlugins: () => set(toggle("pluginsOpen")),
  toggleDebug: () => set(toggle("debugOpen")),
  closePanel: (panel) => set((s) => (panel in s.panels ? { panels: { ...s.panels, [panel]: false } } : s)),
  setMainView: (view) => set({ mainView: view }),
  toggleMainView: () =>
    set((s) => ({ mainView: s.mainView === "chat" ? "editor" : "chat" })),
}));
