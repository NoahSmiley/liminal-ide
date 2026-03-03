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
          className="px-3 py-1 rounded-full border border-zinc-800/60 bg-zinc-900/50 text-[12px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          {reply}
        </button>
      ))}
    </div>
  );
}
