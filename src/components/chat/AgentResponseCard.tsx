import { cn } from "@/lib/utils";

interface AgentResponseCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function AgentResponseCard({ title, children, className }: AgentResponseCardProps) {
  return (
    <div className={cn("border-l-2 border-border bg-card px-3 py-2", className)}>
      <h4 className="mb-1.5 text-xs font-medium text-foreground">{title}</h4>
      {children}
    </div>
  );
}
