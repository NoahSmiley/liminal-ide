import { describe, expect, it } from "vitest";
import type {
  DiffLineTag,
  DiffLine,
  DiffHunk,
  FileDiff,
  StagedTurn,
} from "./diff-types";

describe("diff-types", () => {
  it("DiffLine conforms to the expected shape", () => {
    const line: DiffLine = { tag: "equal", content: "hello" };
    expect(line.tag).toBe("equal");
    expect(line.content).toBe("hello");
  });

  it("DiffLineTag accepts insert, delete, equal", () => {
    const tags: DiffLineTag[] = ["equal", "insert", "delete"];
    expect(tags).toHaveLength(3);
  });

  it("DiffHunk conforms to the expected shape", () => {
    const hunk: DiffHunk = {
      old_start: 1,
      new_start: 1,
      lines: [{ tag: "insert", content: "new line" }],
    };
    expect(hunk.old_start).toBe(1);
    expect(hunk.new_start).toBe(1);
    expect(hunk.lines).toHaveLength(1);
  });

  it("FileDiff conforms to the expected shape", () => {
    const diff: FileDiff = {
      path: "src/main.ts",
      hunks: [],
      before: null,
      after: "content",
    };
    expect(diff.path).toBe("src/main.ts");
    expect(diff.hunks).toEqual([]);
    expect(diff.before).toBeNull();
    expect(diff.after).toBe("content");
  });

  it("FileDiff allows non-null before", () => {
    const diff: FileDiff = {
      path: "file.ts",
      hunks: [],
      before: "old content",
      after: "new content",
    };
    expect(diff.before).toBe("old content");
  });

  it("StagedTurn conforms to the expected shape", () => {
    const turn: StagedTurn = {
      turn_id: "abc-123",
      files: [],
    };
    expect(turn.turn_id).toBe("abc-123");
    expect(turn.files).toEqual([]);
  });

  it("StagedTurn with nested FileDiff data", () => {
    const turn: StagedTurn = {
      turn_id: "xyz",
      files: [
        {
          path: "index.ts",
          hunks: [
            {
              old_start: 10,
              new_start: 10,
              lines: [
                { tag: "delete", content: "old" },
                { tag: "insert", content: "new" },
              ],
            },
          ],
          before: "old",
          after: "new",
        },
      ],
    };
    expect(turn.files).toHaveLength(1);
    expect(turn.files[0]?.hunks[0]?.lines).toHaveLength(2);
  });
});
