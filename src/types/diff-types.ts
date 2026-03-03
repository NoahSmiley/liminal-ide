export type DiffLineTag = "equal" | "insert" | "delete";

export interface DiffLine {
  tag: DiffLineTag;
  content: string;
}

export interface DiffHunk {
  old_start: number;
  new_start: number;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  hunks: DiffHunk[];
  before: string | null;
  after: string;
}

export interface StagedTurn {
  turn_id: string;
  files: FileDiff[];
}
