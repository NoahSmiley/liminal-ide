export type ContentPart =
  | { type: "text"; text: string }
  | { type: "code"; code: string; language?: string; filename?: string };

export function parseContent(raw: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const regex = /```(\w+)?\s*(?:\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index).trim();
      if (text) {
        parts.push({ type: "text", text });
      }
    }

    const code = match[2] ?? "";
    parts.push({
      type: "code",
      code: code.trimEnd(),
      language: match[1] || undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex).trim();
    if (text) {
      parts.push({ type: "text", text });
    }
  }

  if (parts.length === 0 && raw.trim()) {
    parts.push({ type: "text", text: raw });
  }

  return parts;
}
