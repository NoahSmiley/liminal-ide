import type { ReactNode } from "react";

export function renderMarkdown(text: string): ReactNode[] {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trimStart();

    if (trimmed.startsWith("### ")) {
      return <div key={i} className="text-zinc-200 text-[12px] font-bold mt-2">{inline(trimmed.slice(4))}</div>;
    }
    if (trimmed.startsWith("## ")) {
      return <div key={i} className="text-zinc-200 text-[13px] font-bold mt-2">{inline(trimmed.slice(3))}</div>;
    }
    if (trimmed.startsWith("# ")) {
      return <div key={i} className="text-zinc-100 text-[14px] font-bold mt-2">{inline(trimmed.slice(2))}</div>;
    }
    if (trimmed.startsWith("---")) {
      return <hr key={i} className="border-zinc-800 my-2" />;
    }
    if (trimmed.startsWith("| ")) {
      return <div key={i} className="text-zinc-400 text-[11px] font-mono whitespace-pre">{line}</div>;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return <div key={i} className="flex gap-1"><span className="text-zinc-600 shrink-0">·</span><span>{inline(trimmed.slice(2))}</span></div>;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        return <div key={i} className="flex gap-1"><span className="text-zinc-600 shrink-0">{match[1]}.</span><span>{inline(match[2] ?? "")}</span></div>;
      }
    }
    if (trimmed === "") {
      return <div key={i} className="h-2" />;
    }
    return <div key={i}>{inline(line)}</div>;
  });
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(<span key={key++} className="text-zinc-100 font-bold">{match[2]}</span>);
    } else if (match[4]) {
      parts.push(<span key={key++} className="text-cyan-400 bg-zinc-900 px-0.5">{match[4]}</span>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}
