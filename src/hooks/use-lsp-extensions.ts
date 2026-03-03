import { useMemo } from "react";
import { autocompletion } from "@codemirror/autocomplete";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import type { LspDiagnostic } from "../types/lsp-types";
import { lspCompletionSource } from "../lib/codemirror/lsp-completion";
import { toLintDiagnostics } from "../lib/codemirror/lsp-diagnostics";

export function useLspExtensions(
  servers: string[],
  filePath: string | null,
  diagnostics: LspDiagnostic[],
): Extension[] {
  return useMemo(() => {
    if (!filePath || servers.length === 0) return [];

    const serverName = servers[0]!;
    const extensions: Extension[] = [];

    extensions.push(
      autocompletion({
        override: [lspCompletionSource(serverName, filePath)],
      }),
    );

    extensions.push(
      linter((view): Diagnostic[] => {
        return toLintDiagnostics(view.state.doc, diagnostics);
      }),
    );

    return extensions;
  }, [servers, filePath, diagnostics]);
}
