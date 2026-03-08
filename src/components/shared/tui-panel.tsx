import type { ReactNode } from "react";

interface TuiPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  actions?: ReactNode;
  dataTutorial?: string;
}

export function TuiPanel({ title, children, className = "", contentClassName = "p-3", actions, dataTutorial }: TuiPanelProps) {
  return (
    <div data-tutorial={dataTutorial} className={`relative border border-panel-border/70 rounded-[2px] flex flex-col ${className}`}>
      <div className="absolute -top-2 left-3 px-1 bg-background text-[10px] text-zinc-600 uppercase tracking-widest">
        {title}
      </div>
      {actions && (
        <div className="absolute -top-2 right-3 px-1 bg-background text-[10px] text-zinc-600">
          {actions}
        </div>
      )}
      <div className={`min-h-0 ${contentClassName}`}>{children}</div>
    </div>
  );
}
