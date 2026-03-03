export type Theme = "dark" | "light" | "system";
export type KeybindingPreset = "default" | "vim" | "emacs";

export interface Settings {
  model: string;
  theme: Theme;
  font_size: number;
  keybinding_preset: KeybindingPreset;
}

export const MODEL_OPTIONS = ["sonnet", "opus", "haiku"] as const;
export const THEME_OPTIONS: Theme[] = ["dark", "light", "system"];
export const KEYBINDING_OPTIONS: KeybindingPreset[] = ["default", "vim", "emacs"];
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 20;
