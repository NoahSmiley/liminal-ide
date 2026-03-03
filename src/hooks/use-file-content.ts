import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileContent } from "../types/fs-types";

export function useFileContent() {
  const [file, setFile] = useState<FileContent | null>(null);
  const [buffer, setBuffer] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const openFile = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await invoke<FileContent>("read_file", { path });
      setFile(result);
      setBuffer(result.content);
      setDirty(false);
    } catch {
      const fallback = { path, content: "error: could not read file" };
      setFile(fallback);
      setBuffer(fallback.content);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeFile = useCallback(() => {
    setFile(null);
    setBuffer("");
    setDirty(false);
  }, []);

  const updateBuffer = useCallback(
    (content: string) => {
      setBuffer(content);
      setDirty(content !== (file?.content ?? ""));
    },
    [file],
  );

  const createFile = useCallback(async (path: string) => {
    await invoke("write_file", { path, content: "" });
    await openFile(path);
  }, [openFile]);

  const saveFile = useCallback(async () => {
    if (!file || !dirty) return;
    setSaving(true);
    try {
      await invoke("write_file", { path: file.path, content: buffer });
      setFile({ path: file.path, content: buffer });
      setDirty(false);
    } catch (err) {
      console.error("save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [file, buffer, dirty]);

  return { file, buffer, dirty, loading, saving, openFile, closeFile, updateBuffer, saveFile, createFile };
}
