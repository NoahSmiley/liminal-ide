import { useState } from "react";

interface CodeBlockProps {
  code: string;
  filename?: string;
}

export function CodeBlock({ code, filename }: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-zinc-800 my-2">
      <div
        className="flex items-center justify-between px-3 py-1 bg-zinc-950 text-[10px] text-zinc-500 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{filename ?? "code"}</span>
        <span>{collapsed ? "+" : "-"}</span>
      </div>
      {!collapsed && (
        <pre className="px-3 py-2 text-[12px] text-zinc-300 overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
