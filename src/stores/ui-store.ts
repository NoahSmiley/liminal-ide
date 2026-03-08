import { create } from "zustand";

export type MainView = "chat" | "editor" | "terminal" | "settings" | "preview" | "pair" | "guided";

export type SidebarTab =
  | "files"
  | "search"
  | "git"
  | "plugins";

interface PanelState {
  quickSwitchOpen: boolean;
  skillPaletteOpen: boolean;
}

interface UiState {
  panels: PanelState;
  sidebarTab: SidebarTab | null;
  mainView: MainView;
  previewUrl: string | null;
  previewLive: boolean;
  guidedEnabled: boolean;
  setPreviewLive: (live: boolean) => void;
  toggleSidebarTab: (tab: SidebarTab) => void;
  openSidebar: (tab: SidebarTab) => void;
  toggleTerminal: () => void;
  toggleSettings: () => void;
  togglePreview: () => void;
  togglePair: () => void;
  toggleGuided: () => void;
  setGuidedEnabled: (enabled: boolean) => void;
  setPreviewUrl: (url: string | null) => void;
  toggleQuickSwitch: () => void;
  toggleSkillPalette: () => void;
  closePanel: (panel: string) => void;
  setMainView: (view: MainView) => void;
  toggleMainView: () => void;
  // Backward-compat wrappers
  toggleFileTree: () => void;
  openFileTree: () => void;
  toggleSearch: () => void;
  toggleGit: () => void;
  toggleDebug: () => void;
  toggleTodos: () => void;
  toggleSnippets: () => void;
  togglePlugins: () => void;
}

const PANEL_KEY_TO_TAB: Record<string, SidebarTab> = {
  fileTreeOpen: "files",
  searchOpen: "search",
  gitOpen: "git",
  pluginsOpen: "plugins",
};

export const useUiStore = create<UiState>((set) => ({
  panels: {
    quickSwitchOpen: false,
    skillPaletteOpen: false,
  },
  sidebarTab: null,
  mainView: "chat",
  previewUrl: null,
  previewLive: false,
  guidedEnabled: false,
  setPreviewLive: (live) => set({ previewLive: live }),

  toggleSidebarTab: (tab) =>
    set((s) => ({
      sidebarTab: s.sidebarTab === tab ? null : tab,
      mainView: (s.mainView === "settings" || s.mainView === "terminal" || s.mainView === "pair") ? "chat" : s.mainView,
    })),
  openSidebar: (tab) => set({ sidebarTab: tab }),

  toggleTerminal: () =>
    set((s) => ({ mainView: s.mainView === "terminal" ? "chat" : "terminal" })),
  toggleSettings: () =>
    set((s) => ({ mainView: s.mainView === "settings" ? "chat" : "settings" })),
  togglePreview: () =>
    set((s) => ({ mainView: s.mainView === "preview" ? "chat" : "preview" })),
  togglePair: () =>
    set((s) => ({ mainView: s.mainView === "pair" ? "chat" : "pair" })),
  toggleGuided: () =>
    set((s) => ({ guidedEnabled: !s.guidedEnabled })),
  setGuidedEnabled: (enabled) => set({ guidedEnabled: enabled }),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  toggleQuickSwitch: () =>
    set((s) => ({ panels: { ...s.panels, quickSwitchOpen: !s.panels.quickSwitchOpen } })),
  toggleSkillPalette: () =>
    set((s) => ({ panels: { ...s.panels, skillPaletteOpen: !s.panels.skillPaletteOpen } })),

  closePanel: (panel) =>
    set((s) => {
      if (panel === "terminalOpen") return { mainView: "chat" };
      if (panel === "quickSwitchOpen") return { panels: { ...s.panels, quickSwitchOpen: false } };
      if (panel === "skillPaletteOpen") return { panels: { ...s.panels, skillPaletteOpen: false } };
      const tab = PANEL_KEY_TO_TAB[panel];
      if (tab && s.sidebarTab === tab) return { sidebarTab: null };
      return s;
    }),

  setMainView: (view) => set({ mainView: view }),
  toggleMainView: () =>
    set((s) => ({ mainView: s.mainView === "chat" ? "editor" : s.mainView === "editor" ? "chat" : "chat" })),

  // Backward-compat wrappers
  toggleFileTree: () => set((s) => ({ sidebarTab: s.sidebarTab === "files" ? null : "files" })),
  openFileTree: () => set({ sidebarTab: "files" }),
  toggleSearch: () => set((s) => ({ sidebarTab: s.sidebarTab === "search" ? null : "search" })),
  toggleGit: () => set((s) => ({ sidebarTab: s.sidebarTab === "git" ? null : "git" })),
  toggleDebug: () => set((s) => ({ sidebarTab: s.sidebarTab === "search" ? null : "search" })),
  toggleTodos: () => {},
  toggleSnippets: () => {},
  togglePlugins: () => set((s) => ({ sidebarTab: s.sidebarTab === "plugins" ? null : "plugins" })),
}));
