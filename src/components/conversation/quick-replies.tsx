interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export function QuickReplies({ replies, onSelect }: QuickRepliesProps) {
  if (replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-1">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="px-3 py-1 rounded-[2px] border border-panel-border/60 bg-card/50 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 tracking-wide transition-colors"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
