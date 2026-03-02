import { useLocation } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { checkHealth } from "@/lib/api";

const ROUTE_LABELS: Record<string, string> = {
  "": "dashboard",
  board: "board",
  agents: "agents",
  chat: "chat",
  settings: "settings",
};

const ROUTE_HINTS: Record<string, string> = {
  "": "[j/k]nav [enter]open",
  board: "[n]ew [m]ove [j/k]nav [←→]cols",
  agents: "[j/k]nav [enter]chat",
  chat: "[/]focus",
  settings: "[⌘s]save",
};

export function StatusBar() {
  const location = useLocation();
  const projects = useProjectStore((s) => s.projects);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const zoomLevel = useUIStore((s) => s.zoomLevel);
  const hackerMode = useUIStore((s) => s.hackerMode);
  const backendConnected = useUIStore((s) => s.backendConnected);

  const match = location.pathname.match(/\/project\/([^/]+)/);
  const projectId = match?.[1] ?? null;
  const activeProject = projects.find((p) => p.id === projectId);

  const segments = location.pathname.split("/").filter(Boolean);
  const currentRoute = segments[segments.length - 1] ?? "";
  const routeLabel = ROUTE_LABELS[currentRoute] ?? "";

  const projectSlug = activeProject
    ? activeProject.name.toLowerCase().replace(/\s+/g, "-")
    : null;

  const path = projectSlug
    ? `~/liminal/${projectSlug}${routeLabel && currentRoute !== projectId ? `/${routeLabel}` : ""}`
    : "~/liminal";

  const hint = projectId ? ROUTE_HINTS[routeLabel] ?? "" : "";

  return (
    <header className="flex h-7 shrink-0 items-center justify-between border-b border-panel-border bg-background px-3">
      <span className="text-[10px] text-muted-foreground">
        {path}
        <span className="animate-blink ml-1">_</span>
      </span>
      <div className="flex items-center gap-3">
        {backendConnected && (
          <span className="text-[10px] text-emerald-400" title="backend connected">●</span>
        )}
        {!backendConnected && (
          <button
            onClick={() => {
              checkHealth()
                .then((res) => {
                  if (res.ok && res.claude_available) {
                    useUIStore.getState().setBackendConnected(true);
                  }
                })
                .catch(() => {});
            }}
            className="text-[10px] text-red-400 hover:text-red-300"
            title="backend disconnected — click to reconnect"
          >
            ○
          </button>
        )}
        {hackerMode && (
          <span className="text-[10px] text-emerald-400">[HACKER]</span>
        )}
        {hint && (
          <span className="text-[10px] text-muted-foreground/30">{hint}</span>
        )}
        {zoomLevel !== 1 && (
          <span className="text-[10px] text-muted-foreground/40">
            {Math.round(zoomLevel * 100)}%
          </span>
        )}
        <button
          onClick={openCommandPalette}
          className="text-[10px] text-muted-foreground border border-panel-border px-1 py-0"
        >
          ⌘K
        </button>
      </div>
    </header>
  );
}
