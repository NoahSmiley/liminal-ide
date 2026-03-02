export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface FileContent {
  path: string;
  content: string;
}

export type FsEvent =
  | { kind: "FileCreated"; path: string; content: string }
  | { kind: "FileModified"; path: string; content: string }
  | { kind: "FileDeleted"; path: string }
  | { kind: "TreeUpdated"; root: string };
