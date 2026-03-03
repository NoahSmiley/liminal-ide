import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ErrorInterpretOpts {
  sessionId: string | null;
  addUserMessage: (content: string) => void;
  markPending: () => void;
}

export function useErrorInterpret({ sessionId, addUserMessage, markPending }: ErrorInterpretOpts) {
  const [pendingError, setPendingError] = useState<string | null>(null);

  const offerInterpretation = useCallback((output: string, exitCode: number) => {
    if (exitCode === 0) return;
    const lastLines = output.split("\n").slice(-50).join("\n");
    setPendingError(lastLines);
  }, []);

  const acceptInterpretation = useCallback(async () => {
    if (!pendingError || !sessionId) return;
    const prompt = [
      "A command just failed. Interpret this error and suggest a fix:\n",
      "```",
      pendingError,
      "```",
    ].join("\n");
    addUserMessage(prompt);
    markPending();
    setPendingError(null);
    await invoke("send_message", { sessionId, content: prompt }).catch(
      (err: unknown) => addUserMessage(`error: ${String(err)}`),
    );
  }, [pendingError, sessionId, addUserMessage, markPending]);

  const dismissError = useCallback(() => {
    setPendingError(null);
  }, []);

  return { pendingError, offerInterpretation, acceptInterpretation, dismissError };
}
