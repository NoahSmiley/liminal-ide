import { describe, expect, it } from "vitest";
import type { CollabStatus, RemoteCursor } from "./collab-types";

describe("collab-types", () => {
  it("CollabStatus conforms to the expected shape when disconnected", () => {
    const status: CollabStatus = { connected: false, room_id: null };
    expect(status.connected).toBe(false);
    expect(status.room_id).toBeNull();
  });

  it("CollabStatus conforms to the expected shape when connected", () => {
    const status: CollabStatus = { connected: true, room_id: "room-abc" };
    expect(status.connected).toBe(true);
    expect(status.room_id).toBe("room-abc");
  });

  it("RemoteCursor conforms to the expected shape", () => {
    const cursor: RemoteCursor = {
      user_name: "alice",
      file: "src/main.ts",
      line: 10,
      col: 5,
    };
    expect(cursor.user_name).toBe("alice");
    expect(cursor.file).toBe("src/main.ts");
    expect(cursor.line).toBe(10);
    expect(cursor.col).toBe(5);
  });

  it("RemoteCursor line and col are zero-indexed capable", () => {
    const cursor: RemoteCursor = {
      user_name: "bob",
      file: "index.ts",
      line: 0,
      col: 0,
    };
    expect(cursor.line).toBe(0);
    expect(cursor.col).toBe(0);
  });
});
