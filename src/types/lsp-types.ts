export interface LspDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity?: number;
  message: string;
  source?: string;
}

export interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  insertText?: string;
}

export interface LspLocation {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export type LspEvent =
  | { kind: "ServerStarted"; name: string }
  | { kind: "ServerError"; name: string; message: string }
  | { kind: "Diagnostics"; name: string; data: { uri: string; diagnostics: LspDiagnostic[] } };
