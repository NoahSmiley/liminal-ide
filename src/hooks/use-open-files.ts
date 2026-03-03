import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileContent } from "../types/fs-types";

export interface FileBuffer {
  path: string;
  content: string;
  buffer: string;
  dirty: boolean;
}

interface OpenFilesState {
  files: Map<string, FileBuffer>;
  activeFile: string | null;
}

export function useOpenFiles() {
  const [state, setState] = useState<OpenFilesState>({ files: new Map(), activeFile: null });
  const [saving, setSaving] = useState(false);

  const openFile = useCallback(async (path: string) => {
    setState((prev) => {
      if (prev.files.has(path)) return { ...prev, activeFile: path };
      return prev;
    });
    try {
      const result = await invoke<FileContent>("read_file", { path });
      setState((prev) => {
        const files = new Map(prev.files);
        files.set(path, { path, content: result.content, buffer: result.content, dirty: false });
        return { files, activeFile: path };
      });
    } catch {
      setState((prev) => {
        const files = new Map(prev.files);
        files.set(path, { path, content: "", buffer: "error: could not read file", dirty: false });
        return { files, activeFile: path };
      });
    }
  }, []);

  const closeFile = useCallback((path: string) => {
    setState((prev) => {
      const files = new Map(prev.files);
      const fb = files.get(path);
      if (fb?.dirty && !window.confirm("Unsaved changes. Close anyway?")) return prev;
      files.delete(path);
      const paths = Array.from(files.keys());
      const activeFile = prev.activeFile === path ? (paths[paths.length - 1] ?? null) : prev.activeFile;
      return { files, activeFile };
    });
  }, []);

  const setActiveFile = useCallback((path: string) => {
    setState((prev) => (prev.files.has(path) ? { ...prev, activeFile: path } : prev));
  }, []);

  const updateBuffer = useCallback((path: string, buffer: string) => {
    setState((prev) => {
      const fb = prev.files.get(path);
      if (!fb) return prev;
      const files = new Map(prev.files);
      files.set(path, { ...fb, buffer, dirty: buffer !== fb.content });
      return { ...prev, files };
    });
  }, []);

  const saveFile = useCallback(async (path: string) => {
    const fb = state.files.get(path);
    if (!fb || !fb.dirty) return;
    setSaving(true);
    try {
      await invoke("write_file", { path, content: fb.buffer });
      setState((prev) => {
        const files = new Map(prev.files);
        const current = files.get(path);
        if (current) files.set(path, { ...current, content: current.buffer, dirty: false });
        return { ...prev, files };
      });
    } catch (err) {
      console.error("save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [state.files]);

  const createFile = useCallback(async (path: string) => {
    await invoke("write_file", { path, content: "" });
    await openFile(path);
  }, [openFile]);

  const active = state.activeFile ? state.files.get(state.activeFile) ?? null : null;
  const openPaths = Array.from(state.files.keys());

  return {
    files: state.files, active, activeFile: state.activeFile, openPaths, saving,
    openFile, closeFile, setActiveFile, updateBuffer, saveFile, createFile,
  };
}
