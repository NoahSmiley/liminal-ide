import { Outlet } from "react-router-dom";
import { StatusBar } from "./StatusBar";
import { TerminalInput } from "./TerminalInput";

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <StatusBar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      <TerminalInput />
    </div>
  );
}
