import type { RemoteCursor } from "../../types/collab-types";

interface CollabCursorsProps {
  cursors: RemoteCursor[];
  currentFile: string | null;
}

const CURSOR_COLORS = [
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-teal-500",
];

function colorForUser(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length] ?? CURSOR_COLORS[0]!;
}

export function CollabCursors({ cursors, currentFile }: CollabCursorsProps) {
  const visible = cursors.filter((c) => c.file === currentFile);

  if (visible.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {visible.map((cursor) => (
        <div
          key={cursor.user_name}
          className="absolute"
          style={{
            top: `${(cursor.line - 1) * 16}px`,
            left: `${cursor.col * 7.2}px`,
          }}
        >
          <div className={`w-0.5 h-4 ${colorForUser(cursor.user_name)}`} />
          <span className={`text-[8px] text-white px-0.5 ${colorForUser(cursor.user_name)} rounded-sm`}>
            {cursor.user_name}
          </span>
        </div>
      ))}
    </div>
  );
}
