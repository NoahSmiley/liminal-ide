import { cn } from "@/lib/utils";

interface TuiPanelProps {
  title?: string;
  accent?: string;
  className?: string;
  children: React.ReactNode;
}

export function TuiPanel({ title, accent, className, children }: TuiPanelProps) {
  return (
    <div className={cn("tui-panel", className)}>
      {title && (
        <span
          className="tui-panel-title"
          style={accent ? { color: accent } : undefined}
        >
          {title}
        </span>
      )}
      {children}
    </div>
  );
}
