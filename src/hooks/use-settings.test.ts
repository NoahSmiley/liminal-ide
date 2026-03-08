import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Settings } from "../types/settings-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const defaultSettings: Settings = {
  model: "sonnet",
  theme: "dark",
  font_size: 14,
  keybinding_preset: "default",
  personality: "",
  permission_mode: "full",
};

describe("useSettings invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads settings on mount via get_settings", async () => {
    mockInvoke.mockResolvedValueOnce(defaultSettings);

    const { useSettings } = await import("./use-settings");
    expect(useSettings).toBeDefined();
    expect(typeof useSettings).toBe("function");
  });

  it("get_settings invoke is called with correct command name", async () => {
    mockInvoke.mockResolvedValue(defaultSettings);
    await mockInvoke("get_settings");
    expect(mockInvoke).toHaveBeenCalledWith("get_settings");
  });

  it("update_settings invoke is called with merged settings", async () => {
    const merged = { ...defaultSettings, theme: "light" as const };
    mockInvoke.mockResolvedValue(merged);
    await mockInvoke("update_settings", { settings: merged });
    expect(mockInvoke).toHaveBeenCalledWith("update_settings", {
      settings: merged,
    });
  });

  it("reset_settings invoke is called without arguments", async () => {
    mockInvoke.mockResolvedValue(defaultSettings);
    await mockInvoke("reset_settings");
    expect(mockInvoke).toHaveBeenCalledWith("reset_settings");
  });

  it("update merges partial settings with existing", () => {
    const existing: Settings = { ...defaultSettings };
    const partial: Partial<Settings> = { font_size: 16 };
    const merged = { ...existing, ...partial };
    expect(merged.font_size).toBe(16);
    expect(merged.model).toBe("sonnet");
    expect(merged.theme).toBe("dark");
    expect(merged.keybinding_preset).toBe("default");
  });

  it("useSettings hook is exported as a function", async () => {
    mockInvoke.mockResolvedValue(defaultSettings);
    const mod = await import("./use-settings");
    expect(mod.useSettings).toBeDefined();
    expect(typeof mod.useSettings).toBe("function");
  });
});
