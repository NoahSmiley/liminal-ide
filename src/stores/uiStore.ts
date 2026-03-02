import { create } from "zustand";
import { persist } from "zustand/middleware";

type ChatSendHandler = ((message: string) => void) | null;
type ChatStopHandler = (() => void) | null;

interface UIState {
  commandPaletteOpen: boolean;
  shortcutHelpOpen: boolean;
  activeModal: string | null;
  zoomLevel: number;
  hackerMode: boolean;
  backendConnected: boolean;
  chatSendHandler: ChatSendHandler;
  chatStopHandler: ChatStopHandler;
  chatInputDisabled: boolean;
  chatPlaceholder: string;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  toggleShortcutHelp: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  toggleHackerMode: () => void;
  setBackendConnected: (connected: boolean) => void;
  setChatSendHandler: (handler: ChatSendHandler) => void;
  setChatStopHandler: (handler: ChatStopHandler) => void;
  setChatInputDisabled: (disabled: boolean) => void;
  setChatPlaceholder: (placeholder: string) => void;
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      shortcutHelpOpen: false,
      activeModal: null,
      zoomLevel: 1,
      hackerMode: false,
      backendConnected: false,
      chatSendHandler: null,
      chatStopHandler: null,
      chatInputDisabled: false,
      chatPlaceholder: "message the team...",

      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      openShortcutHelp: () => set({ shortcutHelpOpen: true }),
      closeShortcutHelp: () => set({ shortcutHelpOpen: false }),
      toggleShortcutHelp: () =>
        set((s) => ({ shortcutHelpOpen: !s.shortcutHelpOpen })),

      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),

      zoomIn: () =>
        set((s) => ({
          zoomLevel: Math.min(ZOOM_MAX, Math.round((s.zoomLevel + ZOOM_STEP) * 10) / 10),
        })),
      zoomOut: () =>
        set((s) => ({
          zoomLevel: Math.max(ZOOM_MIN, Math.round((s.zoomLevel - ZOOM_STEP) * 10) / 10),
        })),
      zoomReset: () => set({ zoomLevel: 1 }),
      toggleHackerMode: () => set((s) => ({ hackerMode: !s.hackerMode })),
      setBackendConnected: (connected) => set({ backendConnected: connected }),
      setChatSendHandler: (handler) => set({ chatSendHandler: handler }),
      setChatStopHandler: (handler) => set({ chatStopHandler: handler }),
      setChatInputDisabled: (disabled) => set({ chatInputDisabled: disabled }),
      setChatPlaceholder: (placeholder) => set({ chatPlaceholder: placeholder }),
    }),
    {
      name: "liminal-ui",
      partialize: (s) => ({ zoomLevel: s.zoomLevel, hackerMode: s.hackerMode }),
    },
  ),
);
