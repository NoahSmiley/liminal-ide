import { describe, expect, it } from "vitest";
import type {
  StatusEntry,
  GitStatus,
  GitCommit,
  GitFileDiff,
} from "./git-types";

describe("git-types", () => {
  it("StatusEntry conforms to the expected shape", () => {
    const entry: StatusEntry = { path: "src/main.ts", status: "modified" };
    expect(entry.path).toBe("src/main.ts");
    expect(entry.status).toBe("modified");
  });

  it("GitStatus conforms to the expected shape", () => {
    const status: GitStatus = {
      branch: "main",
      ahead: 2,
      behind: 0,
      staged: [{ path: "file.ts", status: "added" }],
      unstaged: [],
      untracked: [{ path: "new.ts", status: "?" }],
    };
    expect(status.branch).toBe("main");
    expect(status.ahead).toBe(2);
    expect(status.behind).toBe(0);
    expect(status.staged).toHaveLength(1);
    expect(status.unstaged).toHaveLength(0);
    expect(status.untracked).toHaveLength(1);
  });

  it("GitCommit conforms to the expected shape", () => {
    const commit: GitCommit = {
      id: "abc123",
      message: "initial commit",
      author: "dev",
      time: 1700000000,
    };
    expect(commit.id).toBe("abc123");
    expect(commit.message).toBe("initial commit");
    expect(commit.author).toBe("dev");
    expect(commit.time).toBe(1700000000);
  });

  it("GitFileDiff conforms to the expected shape", () => {
    const diff: GitFileDiff = {
      path: "src/lib.ts",
      patch: "@@ -1,3 +1,4 @@",
      additions: 1,
      deletions: 0,
    };
    expect(diff.path).toBe("src/lib.ts");
    expect(diff.patch).toContain("@@");
    expect(diff.additions).toBe(1);
    expect(diff.deletions).toBe(0);
  });

  it("GitStatus with empty arrays is valid", () => {
    const status: GitStatus = {
      branch: "feature",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
    };
    expect(status.staged).toEqual([]);
    expect(status.unstaged).toEqual([]);
    expect(status.untracked).toEqual([]);
  });
});
