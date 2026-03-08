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
      return <div key={i} className="flex gap-1.5 mt-0.5"><span className="text-zinc-600 shrink-0">·</span><span>{inline(trimmed.slice(2))}</span></div>;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        return <div key={i} className="flex gap-1.5 mt-0.5"><span className="text-zinc-600 shrink-0">{match[1]}.</span><span>{inline(match[2] ?? "")}</span></div>;
      }
    }
    if (trimmed === "") {
      return <div key={i} className="h-3" />;
    }
    return <div key={i}>{inline(line)}</div>;
  });
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  // Match bold, inline code, and URLs
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s<>)\]]+)/g;
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
      parts.push(<span key={key++} className="text-sky-400/80 bg-zinc-900/80 border border-zinc-800/60 px-1 py-0.5 rounded-[2px] text-[0.92em]">{match[4]}</span>);
    } else if (match[5]) {
      parts.push(
        <a key={key++} href={match[5]} target="_blank" rel="noopener noreferrer"
          className="text-sky-400/80 underline underline-offset-2 decoration-sky-400/30 hover:text-sky-300 hover:decoration-sky-300/50 transition-colors">
          {match[5]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}
