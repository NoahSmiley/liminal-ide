interface TutorialCardProps {
  sectionIndex: number;
  totalSections: number;
  sectionName: string;
  stepIndex: number;
  totalSteps: number;
  title: string;
  body: string;
  ascii?: string;
  hint?: string;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  style?: React.CSSProperties;
}

export function TutorialCard({
  sectionIndex, totalSections, sectionName,
  stepIndex, totalSteps, title, body,
  ascii, hint, isFirst, isLast,
  onPrev, onNext, style,
}: TutorialCardProps) {
  return (
    <div
      className="relative border border-zinc-800/60 bg-black w-[320px] flex flex-col"
      style={style}
    >
      <div className="absolute -top-2 left-3 px-1 bg-black text-[10px] text-zinc-600 uppercase tracking-wider">
        tutorial
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-cyan-600 uppercase tracking-wider">
            section {sectionIndex + 1} / {totalSections} &middot; {sectionName}
          </span>
          <span className="text-[9px] text-zinc-700">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        <div className="text-[12px] text-zinc-300">{title}</div>
        <div className="text-[11px] text-zinc-500 font-mono leading-relaxed">{body}</div>

        {ascii && (
          <pre className="text-[10px] text-zinc-600 font-mono leading-snug border border-zinc-800/40 p-2 overflow-x-auto">
            {ascii}
          </pre>
        )}

        {hint && (
          <div className="text-[10px] text-cyan-600 font-mono">{hint}</div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 disabled:text-zinc-800 disabled:cursor-default"
          >
            &larr; prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`w-1 h-1 rounded-full ${i === stepIndex ? "bg-cyan-400" : "bg-zinc-800"}`}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            className="text-[10px] text-zinc-600 hover:text-zinc-400"
          >
            {isLast ? "done" : "next \u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}
