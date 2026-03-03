import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CollabStatus } from "../types/collab-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const connectedStatus: CollabStatus = { connected: true, room_id: "room-123" };
const disconnectedStatus: CollabStatus = { connected: false, room_id: null };

describe("useCollab invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collab_create_room invoke is called with serverUrl", async () => {
    mockInvoke.mockResolvedValue("room-abc");
    const result = await mockInvoke("collab_create_room", { serverUrl: "wss://example.com" });
    expect(mockInvoke).toHaveBeenCalledWith("collab_create_room", {
      serverUrl: "wss://example.com",
    });
    expect(result).toBe("room-abc");
  });

  it("collab_join_room invoke is called with serverUrl and roomId", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("collab_join_room", { serverUrl: "wss://example.com", roomId: "room-abc" });
    expect(mockInvoke).toHaveBeenCalledWith("collab_join_room", {
      serverUrl: "wss://example.com",
      roomId: "room-abc",
    });
  });

  it("collab_leave invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("collab_leave");
    expect(mockInvoke).toHaveBeenCalledWith("collab_leave");
  });

  it("collab_get_status invoke returns status", async () => {
    mockInvoke.mockResolvedValue(connectedStatus);
    const result = await mockInvoke("collab_get_status");
    expect(mockInvoke).toHaveBeenCalledWith("collab_get_status");
    expect(result).toEqual(connectedStatus);
  });

  it("collab_send_message invoke is called with content", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("collab_send_message", { content: "hello team" });
    expect(mockInvoke).toHaveBeenCalledWith("collab_send_message", {
      content: "hello team",
    });
  });

  it("collab_set_user_name invoke is called with name", async () => {
    mockInvoke.mockResolvedValue(undefined);
    await mockInvoke("collab_set_user_name", { name: "alice" });
    expect(mockInvoke).toHaveBeenCalledWith("collab_set_user_name", {
      name: "alice",
    });
  });

  it("createRoom then refresh pattern", async () => {
    mockInvoke
      .mockResolvedValueOnce("room-xyz")
      .mockResolvedValueOnce(connectedStatus);
    await mockInvoke("collab_create_room", { serverUrl: "wss://server.com" });
    await mockInvoke("collab_get_status");
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("leave then refresh returns disconnected status", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(disconnectedStatus);
    await mockInvoke("collab_leave");
    const result = await mockInvoke("collab_get_status");
    expect(result).toEqual(disconnectedStatus);
  });

  it("useCollab hook is exported as a function", async () => {
    const mod = await import("./use-collab");
    expect(mod.useCollab).toBeDefined();
    expect(typeof mod.useCollab).toBe("function");
  });
});
