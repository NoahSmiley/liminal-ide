export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: number | null;
}

/** Simple line-by-line diff. No external dependencies. */
export function computeLineDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  const result: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      result.push({ type: "unchanged", content: newLine!, lineNumber: i + 1 });
    } else {
      if (oldLine !== undefined) {
        result.push({ type: "removed", content: oldLine, lineNumber: null });
      }
      if (newLine !== undefined) {
        result.push({ type: "added", content: newLine, lineNumber: i + 1 });
      }
    }
  }
  return result;
}
