import type { Variable } from "../../types/debug-types";

interface VariablesPanelProps {
  variables: Variable[];
}

function kindColor(kind: string): string {
  switch (kind) {
    case "string": return "text-green-400";
    case "number": return "text-cyan-400";
    case "boolean": return "text-amber-400";
    default: return "text-zinc-400";
  }
}

export function VariablesPanel({ variables }: VariablesPanelProps) {
  if (variables.length === 0) {
    return <div className="text-[9px] text-zinc-700 p-2">no variables</div>;
  }

  return (
    <div className="overflow-y-auto max-h-[120px]">
      {variables.map((v, i) => (
        <div key={`${v.name}-${i}`} className="flex items-center gap-2 px-2 py-0.5 text-[10px] hover:bg-zinc-900/50">
          <span className="text-purple-400 shrink-0">{v.name}</span>
          <span className="text-zinc-700">=</span>
          <span className={`${kindColor(v.kind)} truncate`}>{v.value}</span>
          <span className="text-zinc-800 text-[8px] ml-auto">{v.kind}</span>
        </div>
      ))}
    </div>
  );
}
