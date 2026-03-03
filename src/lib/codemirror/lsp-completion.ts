import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { invoke } from "@tauri-apps/api/core";

interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  insertText?: string;
}

export function lspCompletionSource(serverName: string, filePath: string) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    if (!context.explicit && !context.matchBefore(/\w+$/)) return null;

    const pos = context.pos;
    const line = context.state.doc.lineAt(pos);
    const lineNumber = line.number - 1; // LSP uses 0-based
    const character = pos - line.from;

    try {
      const result = await invoke<{ items?: LspCompletionItem[]; isIncomplete?: boolean } | null>(
        "lsp_request_completion",
        { serverName, path: filePath, line: lineNumber, character },
      );

      if (!result) return null;
      const items = Array.isArray(result) ? result : (result.items ?? []);
      if (items.length === 0) return null;

      const word = context.matchBefore(/\w*/);
      return {
        from: word?.from ?? pos,
        options: items.map((item: LspCompletionItem) => ({
          label: item.label,
          detail: item.detail,
          apply: item.insertText ?? item.label,
        })),
      };
    } catch {
      return null;
    }
  };
}
