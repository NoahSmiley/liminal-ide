import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("px-2 py-4 text-[10px] text-muted-foreground/40", className)}>
      <span>{title}</span>
      {description && <span className="ml-1">— {description}</span>}
    </div>
  );
}
