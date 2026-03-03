export type TodoKind = "TODO" | "FIXME" | "HACK" | "XXX";

export interface TodoItem {
  path: string;
  line_number: number;
  kind: TodoKind;
  text: string;
}
