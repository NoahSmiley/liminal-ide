export type PinnedContext =
  | { kind: "File"; id: string; path: string }
  | { kind: "Text"; id: string; label: string; content: string };
