interface StatusBarProps {
  projectName: string | null;
  claudeAvailable: boolean;
}

export function StatusBar({ projectName, claudeAvailable }: StatusBarProps) {
  const path = projectName ? `~/liminal/${projectName}` : "~/liminal";
  const status = claudeAvailable ? "◆" : "○";
  const statusColor = claudeAvailable ? "text-cyan-400" : "text-zinc-600";

  return (
    <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800 text-[11px]">
      <span className="text-zinc-500">
        {path}
        <span className="animate-blink ml-0.5 text-zinc-600">▊</span>
      </span>
      <span className={statusColor}>
        {status} claude
      </span>
    </div>
  );
}
