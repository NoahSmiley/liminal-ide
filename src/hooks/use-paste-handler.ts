import { useCallback, useEffect, useState } from "react";
import type { ImageAttachment } from "../types/image-types";

let nextId = 0;

export function usePasteHandler() {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      e.preventDefault();
      const blob = item.getAsFile();
      if (!blob) continue;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const id = `img-${++nextId}`;
        setAttachments((prev) => [
          ...prev,
          { id, base64, mimeType: item.type, previewUrl: base64 },
        ]);
      };
      reader.readAsDataURL(blob);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => setAttachments([]), []);

  return { attachments, removeAttachment, clearAttachments };
}
