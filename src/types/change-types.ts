export type ChangeType = "created" | "modified";

export interface FileChange {
  path: string;
  change_type: ChangeType;
  before: string | null;
  after: string;
}

export interface ChangeTurn {
  turn_id: string;
  session_id: string;
  changes: FileChange[];
  completed: boolean;
}
