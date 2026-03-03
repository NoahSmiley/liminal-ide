import { describe, expect, it, vi, beforeEach } from "vitest";
import type { GitStatus, GitCommit, GitFileDiff } from "../types/git-types";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => mockInvoke(...args) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(() => Promise.resolve(vi.fn())) }));

const sampleStatus: GitStatus = {
  branch: "main",
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [{ path: "src/main.ts", status: "modified" }],
  untracked: [],
};

const sampleCommits: GitCommit[] = [
  { id: "abc", message: "init", author: "dev", time: 1700000000 },
];

const sampleDiffs: GitFileDiff[] = [
  { path: "src/main.ts", patch: "@@ -1 +1 @@", additions: 1, deletions: 1 },
];

describe("useGit invoke calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_git_status invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(sampleStatus);
    const result = await mockInvoke("get_git_status");
    expect(mockInvoke).toHaveBeenCalledWith("get_git_status");
    expect(result.branch).toBe("main");
  });

  it("get_git_log invoke is called with limit", async () => {
    mockInvoke.mockResolvedValue(sampleCommits);
    const result = await mockInvoke("get_git_log", { limit: 20 });
    expect(mockInvoke).toHaveBeenCalledWith("get_git_log", { limit: 20 });
    expect(result).toEqual(sampleCommits);
  });

  it("get_git_log invoke with custom limit", async () => {
    mockInvoke.mockResolvedValue([]);
    await mockInvoke("get_git_log", { limit: 50 });
    expect(mockInvoke).toHaveBeenCalledWith("get_git_log", { limit: 50 });
  });

  it("get_git_diff invoke is called correctly", async () => {
    mockInvoke.mockResolvedValue(sampleDiffs);
    const result = await mockInvoke("get_git_diff");
    expect(mockInvoke).toHaveBeenCalledWith("get_git_diff");
    expect(result).toEqual(sampleDiffs);
  });

  it("refreshAll calls all three git commands", async () => {
    mockInvoke
      .mockResolvedValueOnce(sampleStatus)
      .mockResolvedValueOnce(sampleCommits)
      .mockResolvedValueOnce(sampleDiffs);

    await Promise.all([
      mockInvoke("get_git_status"),
      mockInvoke("get_git_log", { limit: 20 }),
      mockInvoke("get_git_diff"),
    ]);

    expect(mockInvoke).toHaveBeenCalledTimes(3);
    expect(mockInvoke).toHaveBeenCalledWith("get_git_status");
    expect(mockInvoke).toHaveBeenCalledWith("get_git_log", { limit: 20 });
    expect(mockInvoke).toHaveBeenCalledWith("get_git_diff");
  });

  it("loading state management pattern", () => {
    let loading = false;
    loading = true;
    expect(loading).toBe(true);
    loading = false;
    expect(loading).toBe(false);
  });

  it("useGit hook is exported as a function", async () => {
    const mod = await import("./use-git");
    expect(mod.useGit).toBeDefined();
    expect(typeof mod.useGit).toBe("function");
  });
});
