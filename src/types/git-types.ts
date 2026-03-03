export interface StatusEntry {
  path: string;
  status: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: StatusEntry[];
  unstaged: StatusEntry[];
  untracked: StatusEntry[];
}

export interface GitCommit {
  id: string;
  message: string;
  author: string;
  time: number;
}

export interface GitFileDiff {
  path: string;
  patch: string;
  additions: number;
  deletions: number;
}
