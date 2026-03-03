import type { Diagnostic } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import type { LspDiagnostic } from "../../types/lsp-types";

const SEVERITY_MAP: Record<number, Diagnostic["severity"]> = {
  1: "error",
  2: "warning",
  3: "info",
  4: "info",
};

export function toLintDiagnostics(doc: Text, lspDiags: LspDiagnostic[]): Diagnostic[] {
  return lspDiags.flatMap((d) => {
    const from = posToOffset(doc, d.range.start.line, d.range.start.character);
    const to = posToOffset(doc, d.range.end.line, d.range.end.character);
    if (from === null || to === null) return [];
    return [{
      from,
      to: Math.max(to, from + 1),
      severity: SEVERITY_MAP[d.severity ?? 1] ?? "error",
      message: d.message,
      source: d.source,
    }];
  });
}

function posToOffset(doc: Text, line: number, character: number): number | null {
  // LSP uses 0-based lines, CM uses 1-based
  const cmLine = line + 1;
  if (cmLine < 1 || cmLine > doc.lines) return null;
  const lineObj = doc.line(cmLine);
  return Math.min(lineObj.from + character, lineObj.to);
}
