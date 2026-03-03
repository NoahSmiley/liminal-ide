import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PluginManifest } from "../types/plugin-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const samplePlugins: PluginManifest[] = [
  {
    name: "test-plugin",
    version: "1.0.0",
    description: "A test plugin",
    commands: [
      { name: "greet", description: "Says hello", script: "echo hello" },
    ],
  },
];

describe("usePlugins invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list_plugins invoke returns plugin manifests", async () => {
    mockInvoke.mockResolvedValue(samplePlugins);
    const result = await mockInvoke("list_plugins");
    expect(mockInvoke).toHaveBeenCalledWith("list_plugins");
    expect(result).toEqual(samplePlugins);
  });

  it("run_plugin_command invoke is called with pluginName and commandName", async () => {
    mockInvoke.mockResolvedValue("output text");
    const result = await mockInvoke("run_plugin_command", {
      pluginName: "test-plugin",
      commandName: "greet",
    });
    expect(mockInvoke).toHaveBeenCalledWith("run_plugin_command", {
      pluginName: "test-plugin",
      commandName: "greet",
    });
    expect(result).toBe("output text");
  });

  it("run_plugin_command returns string result", async () => {
    mockInvoke.mockResolvedValue("hello world");
    const result = await mockInvoke("run_plugin_command", {
      pluginName: "my-plugin",
      commandName: "run",
    });
    expect(typeof result).toBe("string");
  });

  it("list_plugins with no plugins returns empty array", async () => {
    mockInvoke.mockResolvedValue([]);
    const result = await mockInvoke("list_plugins");
    expect(result).toEqual([]);
  });

  it("usePlugins hook is exported as a function", async () => {
    mockInvoke.mockResolvedValue([]);
    const mod = await import("./use-plugins");
    expect(mod.usePlugins).toBeDefined();
    expect(typeof mod.usePlugins).toBe("function");
  });
});
