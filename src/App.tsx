import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { KeyboardShortcutHelp } from "@/components/shared/KeyboardShortcutHelp";
import { WelcomePage } from "@/pages/WelcomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { BoardPage } from "@/pages/BoardPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { ChatPage } from "@/pages/ChatPage";
import { ProjectSettingsPage } from "@/pages/ProjectSettingsPage";
import { useHydrate } from "@/hooks/useHydrate";
import { useGlobalKeyboard } from "@/hooks/useGlobalKeyboard";
import { useUIStore } from "@/stores/uiStore";
import { checkHealth } from "@/lib/api";

export default function App() {
  useHydrate();
  useGlobalKeyboard();

  const zoomLevel = useUIStore((s) => s.zoomLevel);
  const hackerMode = useUIStore((s) => s.hackerMode);

  // Auto-connect to backend on app startup (keep retrying until connected)
  useEffect(() => {
    let cancelled = false;
    const tryConnect = () => {
      if (cancelled) return;
      checkHealth()
        .then((res) => {
          if (!cancelled && res.ok && res.claude_available) {
            useUIStore.getState().setBackendConnected(true);
          } else if (!cancelled) {
            setTimeout(tryConnect, 3000);
          }
        })
        .catch(() => {
          if (!cancelled) setTimeout(tryConnect, 3000);
        });
    };
    tryConnect();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.style.zoom = `${zoomLevel}`;
  }, [zoomLevel]);

  useEffect(() => {
    document.documentElement.classList.toggle("hacker-mode", hackerMode);
  }, [hackerMode]);

  return (
    <TooltipProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/project/:id" element={<DashboardPage />} />
          <Route path="/project/:id/board" element={<BoardPage />} />
          <Route path="/project/:id/agents" element={<AgentsPage />} />
          <Route path="/project/:id/chat" element={<ChatPage />} />
          <Route path="/project/:id/chat/:agentId" element={<ChatPage />} />
          <Route path="/project/:id/settings" element={<ProjectSettingsPage />} />
        </Route>
      </Routes>
      <CommandPalette />
      <KeyboardShortcutHelp />
      <NewProjectDialog />
      <Toaster theme="dark" />
    </TooltipProvider>
  );
}
