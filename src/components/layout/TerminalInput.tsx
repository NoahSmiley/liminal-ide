import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useBoardStore } from "@/stores/boardStore";
import { checkHealth, restartServer } from "@/lib/api";

interface CommandResult {
  text: string;
  type: "ok" | "err" | "info";
}

const COMMANDS = [
  "/cd dashboard",
  "/cd board",
  "/cd agents",
  "/cd chat",
  "/cd settings",
  "/cd ~",
  "/new project",
  "/new task",
  "/ls tasks",
  "/ls agents",
  "/zoom in",
  "/zoom out",
  "/zoom reset",
  "/hacker mode",
  "/hacker mode off",
  "/connect",
  "/disconnect",
  "/restart",
  "/help",
  "/clear",
];

export function TerminalInput() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const projects = useProjectStore((s) => s.projects);
  const tasks = useBoardStore((s) => s.tasks);
  const chatSendHandler = useUIStore((s) => s.chatSendHandler);
  const chatStopHandler = useUIStore((s) => s.chatStopHandler);
  const chatInputDisabled = useUIStore((s) => s.chatInputDisabled);
  const chatPlaceholder = useUIStore((s) => s.chatPlaceholder);

  const isChatMode = !!chatSendHandler;

  // Clear result after timeout
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 3000);
    return () => clearTimeout(t);
  }, [result]);

  // Autocomplete suggestion (only for commands starting with /)
  useEffect(() => {
    if (!value.trim() || !value.startsWith("/")) {
      setSuggestion("");
      return;
    }
    const lower = value.toLowerCase();
    const match = COMMANDS.find((c) => c.startsWith(lower) && c !== lower);
    setSuggestion(match ? match.slice(value.length) : "");
  }, [value]);

  const getProjectId = useCallback(() => {
    const match = location.pathname.match(/\/project\/([^/]+)/);
    return match?.[1] ?? null;
  }, [location.pathname]);

  const executeCommand = useCallback(
    (raw: string) => {
      // Strip the leading / for command parsing
      const input = raw.startsWith("/") ? raw.slice(1).trim().toLowerCase() : raw.trim().toLowerCase();
      if (!input) return;

      setResult(null);
      const projectId = getProjectId();

      // cd — navigation
      if (input.startsWith("cd ")) {
        const target = input.slice(3).trim();
        if (target === "~" || target === "home") {
          navigate("/");
          setResult({ text: "~", type: "ok" });
          return;
        }
        if (!projectId) {
          const proj = projects.find(
            (p) => p.name.toLowerCase().replace(/\s+/g, "-") === target,
          );
          if (proj) {
            navigate(`/project/${proj.id}`);
            setResult({ text: `→ ${proj.name}`, type: "ok" });
            return;
          }
          setResult({ text: "no active project — cd ~ first", type: "err" });
          return;
        }
        const routes: Record<string, string> = {
          dashboard: `/project/${projectId}`,
          board: `/project/${projectId}/board`,
          agents: `/project/${projectId}/agents`,
          chat: `/project/${projectId}/chat`,
          settings: `/project/${projectId}/settings`,
        };
        if (routes[target]) {
          navigate(routes[target]);
          setResult({ text: `→ ${target}`, type: "ok" });
        } else {
          setResult({ text: `unknown: ${target}`, type: "err" });
        }
        return;
      }

      // new project
      if (input === "new project" || input === "new proj") {
        useUIStore.getState().openModal("new-project");
        setResult({ text: "opening new project", type: "ok" });
        return;
      }

      // new task
      if (input === "new task") {
        if (!projectId) {
          setResult({ text: "no active project", type: "err" });
          return;
        }
        useUIStore.getState().openModal("new-task");
        setResult({ text: "opening new task", type: "ok" });
        return;
      }

      // ls tasks
      if (input === "ls tasks" || input === "ls task") {
        if (!projectId) {
          setResult({ text: "no active project", type: "err" });
          return;
        }
        const projectTasks = tasks.filter((t) => t.projectId === projectId);
        const byStatus = {
          backlog: projectTasks.filter((t) => t.status === "backlog").length,
          in_progress: projectTasks.filter((t) => t.status === "in_progress").length,
          in_review: projectTasks.filter((t) => t.status === "in_review").length,
          done: projectTasks.filter((t) => t.status === "done").length,
        };
        setResult({
          text: `${projectTasks.length} tasks — backlog:${byStatus.backlog} progress:${byStatus.in_progress} review:${byStatus.in_review} done:${byStatus.done}`,
          type: "info",
        });
        return;
      }

      // ls agents
      if (input === "ls agents" || input === "ls agent") {
        setResult({ text: "sage pixel atlas forge scout beacon", type: "info" });
        return;
      }

      // zoom
      if (input === "zoom in" || input === "zoom +") {
        useUIStore.getState().zoomIn();
        const z = useUIStore.getState().zoomLevel;
        setResult({ text: `zoom ${Math.round(z * 100)}%`, type: "ok" });
        return;
      }
      if (input === "zoom out" || input === "zoom -") {
        useUIStore.getState().zoomOut();
        const z = useUIStore.getState().zoomLevel;
        setResult({ text: `zoom ${Math.round(z * 100)}%`, type: "ok" });
        return;
      }
      if (input === "zoom reset" || input === "zoom 100") {
        useUIStore.getState().zoomReset();
        setResult({ text: "zoom 100%", type: "ok" });
        return;
      }

      // hacker mode
      if (input === "hacker mode") {
        const { hackerMode, toggleHackerMode } = useUIStore.getState();
        if (!hackerMode) toggleHackerMode();
        setResult({ text: "hacker mode on", type: "ok" });
        return;
      }
      if (input === "hacker mode off") {
        const { hackerMode, toggleHackerMode } = useUIStore.getState();
        if (hackerMode) toggleHackerMode();
        setResult({ text: "hacker mode off", type: "ok" });
        return;
      }

      // connect
      if (input === "connect") {
        setResult({ text: "connecting...", type: "info" });
        checkHealth()
          .then((res) => {
            if (res.ok && res.claude_available) {
              useUIStore.getState().setBackendConnected(true);
              setResult({ text: "connected to backend", type: "ok" });
            } else {
              setResult({ text: "backend up but claude unavailable", type: "err" });
            }
          })
          .catch(() => {
            setResult({ text: "backend unreachable", type: "err" });
          });
        return;
      }

      // disconnect
      if (input === "disconnect") {
        useUIStore.getState().setBackendConnected(false);
        setResult({ text: "disconnected — using mock", type: "ok" });
        return;
      }

      // restart
      if (input === "restart" || input === "restart server") {
        setResult({ text: "restarting server...", type: "info" });
        useUIStore.getState().setBackendConnected(false);
        restartServer()
          .then(() => {
            const poll = (attempt: number) => {
              if (attempt > 20) {
                setResult({ text: "server didn't come back", type: "err" });
                return;
              }
              setTimeout(() => {
                checkHealth()
                  .then((res) => {
                    if (res.ok) {
                      useUIStore.getState().setBackendConnected(true);
                      setResult({ text: "server restarted", type: "ok" });
                    } else {
                      poll(attempt + 1);
                    }
                  })
                  .catch(() => poll(attempt + 1));
              }, 500);
            };
            poll(0);
          })
          .catch(() => {
            setResult({ text: "server unreachable", type: "err" });
          });
        return;
      }

      // help
      if (input === "help" || input === "?") {
        useUIStore.getState().toggleShortcutHelp();
        setResult({ text: "showing help", type: "ok" });
        return;
      }

      // clear
      if (input === "clear") {
        setResult(null);
        return;
      }

      setResult({ text: `command not found: ${input}`, type: "err" });
    },
    [getProjectId, navigate, projects, tasks],
  );

  const handleSubmit = useCallback(() => {
    const raw = value.trim();
    if (!raw) return;

    if (raw.startsWith("/")) {
      // Always treat /prefixed input as a command
      executeCommand(raw);
    } else if (isChatMode && !chatInputDisabled) {
      // On chat page — send as chat message
      chatSendHandler!(raw);
    } else if (!isChatMode) {
      // Not on chat page — treat as command (backwards compat)
      executeCommand(raw);
    }

    setValue("");
    setSuggestion("");
  }, [value, executeCommand, isChatMode, chatSendHandler, chatInputDisabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      setValue(value + suggestion);
      setSuggestion("");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setValue("");
      setSuggestion("");
      inputRef.current?.blur();
    }
  };

  const resultColor =
    result?.type === "err"
      ? "text-red-400"
      : result?.type === "ok"
        ? "text-emerald-400"
        : "text-muted-foreground";

  const inputPlaceholder = isChatMode
    ? (focused ? "" : chatPlaceholder)
    : (focused ? "" : "type a command...");

  const isDisabled = isChatMode && chatInputDisabled;

  return (
    <div className="shrink-0 mx-2 mb-2 mt-1">
      <div className="flex items-center gap-2.5 border border-panel-border bg-secondary/40 px-3 py-2.5">
        <span className="text-sm text-foreground shrink-0">
          {isChatMode ? ">" : "$"}
        </span>
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            data-slot="terminal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            disabled={isDisabled}
            placeholder={inputPlaceholder}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
          />
          {suggestion && (
            <span className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/25">
              <span className="invisible">{value}</span>
              {suggestion}
            </span>
          )}
        </div>
        {chatStopHandler && (
          <button
            onClick={() => chatStopHandler()}
            className="shrink-0 text-[10px] font-mono px-2 py-0.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            stop
          </button>
        )}
        {result && (
          <span className={`text-xs shrink-0 ${resultColor}`}>
            {result.text}
          </span>
        )}
        {!result && !chatStopHandler && !focused && isChatMode && (
          <span className="text-[10px] text-muted-foreground/30">/ for commands</span>
        )}
        {!result && !focused && !isChatMode && (
          <kbd className="text-[10px] text-muted-foreground/30 border border-panel-border px-1 py-0">:</kbd>
        )}
      </div>
    </div>
  );
}
