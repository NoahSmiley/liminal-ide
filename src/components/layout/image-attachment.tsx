import type { ImageAttachment } from "../../types/image-types";

interface ImageAttachmentBarProps {
  attachments: ImageAttachment[];
  onRemove: (id: string) => void;
}

export function ImageAttachmentBar({ attachments, onRemove }: ImageAttachmentBarProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 border-t border-zinc-800/40">
      {attachments.map((a) => (
        <div key={a.id} className="relative group">
          <img
            src={a.previewUrl}
            alt="attachment"
            className="h-10 w-10 object-cover border border-zinc-700"
          />
          <button
            onClick={() => onRemove(a.id)}
            className="absolute -top-1 -right-1 bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-zinc-300 text-[8px] w-3 h-3 flex items-center justify-center hidden group-hover:flex"
          >
            x
          </button>
        </div>
      ))}
      <span className="text-[10px] text-zinc-600">{attachments.length} image{attachments.length > 1 ? "s" : ""}</span>
    </div>
  );
}
