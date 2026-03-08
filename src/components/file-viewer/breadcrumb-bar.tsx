interface BreadcrumbBarProps {
  path: string | null;
}

export function BreadcrumbBar({ path }: BreadcrumbBarProps) {
  if (!path) return null;

  const segments = path.split("/").filter(Boolean);

  return (
    <div className="flex items-center gap-0 px-4 py-1.5 text-[11px] border-b border-border/20 overflow-x-auto">
      {segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center shrink-0">
            {i > 0 && <span className="text-zinc-800 mx-1.5">›</span>}
            <span className={isLast ? "text-zinc-400" : "text-zinc-600"}>
              {segment}
            </span>
          </span>
        );
      })}
    </div>
  );
}
