import { useState } from "react";
import { StatusBar } from "./status-bar";
import { InputBar } from "./input-bar";

export function AppShell() {
  const [projectName] = useState<string | null>(null);

  const handleInput = (input: string) => {
    console.log("input:", input);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-zinc-200 font-mono text-[13px]">
      <StatusBar projectName={projectName} claudeAvailable={false} />
      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-zinc-600 text-[12px]">
          no project open — type /new or /open to start
        </p>
      </main>
      <InputBar onSubmit={handleInput} disabled={false} />
    </div>
  );
}
