import type { ReactNode } from "react";

interface TuiPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function TuiPanel({ title, children, className = "" }: TuiPanelProps) {
  return (
    <div className={`relative border border-zinc-800 ${className}`}>
      <div className="absolute -top-2 left-3 px-1 bg-black text-[10px] text-zinc-500 uppercase tracking-wider">
        {title}
      </div>
      <div className="p-3 pt-3">{children}</div>
    </div>
  );
}
