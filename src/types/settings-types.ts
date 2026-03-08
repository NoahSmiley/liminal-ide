export type Theme = "dark" | "light" | "system";
export type KeybindingPreset = "default" | "vim" | "emacs";
export type PermissionMode = "full" | "default" | "plan";

export interface Settings {
  model: string;
  theme: Theme;
  font_size: number;
  keybinding_preset: KeybindingPreset;
  personality: string;
  permission_mode: PermissionMode;
}

export const MODEL_OPTIONS = ["sonnet", "opus", "haiku"] as const;
export const THEME_OPTIONS: Theme[] = ["dark", "light", "system"];
export const KEYBINDING_OPTIONS: KeybindingPreset[] = ["default", "vim", "emacs"];
export const PERMISSION_MODE_OPTIONS: { value: PermissionMode; label: string; description: string }[] = [
  { value: "full", label: "full auto", description: "no confirmations — edits, writes, bash all run freely" },
  { value: "default", label: "ask first", description: "asks before file edits and shell commands" },
  { value: "plan", label: "plan only", description: "read-only — can explore code but can't make changes" },
];
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 20;
