export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: TreeNode[] | null;
}

export type FsEvent =
  | { kind: "FileCreated"; path: string; content: string }
  | { kind: "FileModified"; path: string; content: string }
  | { kind: "FileDeleted"; path: string }
  | { kind: "FileChangeDetected"; path: string; before: string | null; after: string; turn_id: string }
  | { kind: "TreeUpdated"; root: string };
