import { describe, expect, it } from "vitest";
import {
  THEME_OPTIONS,
  KEYBINDING_OPTIONS,
  MODEL_OPTIONS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from "./settings-types";
import type { Theme, KeybindingPreset, Settings } from "./settings-types";

describe("settings-types constants", () => {
  it("THEME_OPTIONS has exactly 3 entries", () => {
    expect(THEME_OPTIONS).toHaveLength(3);
  });

  it("THEME_OPTIONS contains dark, light, system", () => {
    expect(THEME_OPTIONS).toContain("dark");
    expect(THEME_OPTIONS).toContain("light");
    expect(THEME_OPTIONS).toContain("system");
  });

  it("KEYBINDING_OPTIONS has exactly 3 entries", () => {
    expect(KEYBINDING_OPTIONS).toHaveLength(3);
  });

  it("KEYBINDING_OPTIONS contains default, vim, emacs", () => {
    expect(KEYBINDING_OPTIONS).toContain("default");
    expect(KEYBINDING_OPTIONS).toContain("vim");
    expect(KEYBINDING_OPTIONS).toContain("emacs");
  });

  it("MODEL_OPTIONS has exactly 3 entries", () => {
    expect(MODEL_OPTIONS).toHaveLength(3);
  });

  it("MODEL_OPTIONS contains sonnet, opus, haiku", () => {
    expect(MODEL_OPTIONS).toContain("sonnet");
    expect(MODEL_OPTIONS).toContain("opus");
    expect(MODEL_OPTIONS).toContain("haiku");
  });

  it("FONT_SIZE_MIN is 10", () => {
    expect(FONT_SIZE_MIN).toBe(10);
  });

  it("FONT_SIZE_MAX is 20", () => {
    expect(FONT_SIZE_MAX).toBe(20);
  });

  it("FONT_SIZE_MIN is less than FONT_SIZE_MAX", () => {
    expect(FONT_SIZE_MIN).toBeLessThan(FONT_SIZE_MAX);
  });

  it("a valid Settings object satisfies the interface shape", () => {
    const settings: Settings = {
      model: "sonnet",
      theme: "dark",
      font_size: 14,
      keybinding_preset: "vim",
      personality: "",
      permission_mode: "full",
    };
    expect(settings.model).toBe("sonnet");
    expect(settings.theme).toBe("dark");
    expect(settings.font_size).toBe(14);
    expect(settings.keybinding_preset).toBe("vim");
  });

  it("Theme type accepts all THEME_OPTIONS values", () => {
    const themes: Theme[] = [...THEME_OPTIONS];
    expect(themes).toEqual(THEME_OPTIONS);
  });

  it("KeybindingPreset type accepts all KEYBINDING_OPTIONS values", () => {
    const presets: KeybindingPreset[] = [...KEYBINDING_OPTIONS];
    expect(presets).toEqual(KEYBINDING_OPTIONS);
  });
});
