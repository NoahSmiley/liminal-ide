import { useState } from "react";
import type { PluginManifest } from "../../types/plugin-types";

interface PluginPanelProps {
  plugins: PluginManifest[];
  onRunCommand: (pluginName: string, commandName: string) => Promise<string>;
  onRefresh: () => void;
}

function PluginEntry({
  plugin,
  onRunCommand,
}: {
  plugin: PluginManifest;
  onRunCommand: (pluginName: string, commandName: string) => Promise<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);

  async function handleRun(commandName: string) {
    setRunning(commandName);
    setOutput(null);
    try {
      const result = await onRunCommand(plugin.name, commandName);
      setOutput(result);
    } catch (err) {
      setOutput(`error: ${err}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="border-b border-zinc-800/40 last:border-b-0">
      {/* Plugin header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center w-full text-left h-[22px] px-2 hover:bg-white/[0.04] group"
      >
        <span className="text-[10px] text-zinc-500 mr-1.5 w-2.5 shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="text-[10px] text-zinc-300 font-medium truncate flex-1">
          {plugin.name}
        </span>
        <span className="text-[9px] text-zinc-600 shrink-0 font-mono ml-1">
          v{plugin.version}
        </span>
      </button>

      {/* Expanded: description + commands */}
      {expanded && (
        <div className="pl-6 pr-2 pb-1.5">
          {plugin.description && (
            <div className="text-[10px] text-zinc-600 mb-1.5 leading-[1.4]">
              {plugin.description}
            </div>
          )}
          {plugin.commands.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {plugin.commands.map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => handleRun(cmd.name)}
                  disabled={running !== null}
                  title={cmd.description}
                  className="flex items-center h-[20px] text-left text-[10px] text-cyan-600 hover:text-cyan-400 disabled:text-zinc-700 disabled:cursor-not-allowed transition-colors group"
                >
                  <span className="flex-1 truncate">{cmd.name}</span>
                  {running === cmd.name && (
                    <span className="text-[9px] text-zinc-600 shrink-0">running...</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {output !== null && (
            <pre className="mt-1.5 text-[10px] text-zinc-400 leading-[1.4] bg-zinc-950/60 border border-zinc-800/40 px-2 py-1 rounded-[2px] overflow-x-auto max-h-[80px]">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function PluginPanel({ plugins, onRunCommand, onRefresh }: PluginPanelProps) {
  return (
    <div className="flex flex-col h-full" data-tutorial="plugin-panel">
      {/* Toolbar */}
      <div className="flex items-center h-[30px] px-2 border-b border-zinc-800/50 shrink-0">
        <span className="text-[10px] text-zinc-600 flex-1 select-none">
          {plugins.length} installed
        </span>
        <button
          onClick={onRefresh}
          title="refresh plugins"
          className="w-5 h-5 flex items-center justify-center rounded-[2px] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] transition-colors text-[11px]"
        >
          ↻
        </button>
      </div>

      {/* Plugin list */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {plugins.length === 0 && (
          <div className="px-2 pt-2 text-[10px] text-zinc-600 select-none">
            no plugins installed
          </div>
        )}
        {plugins.map((plugin) => (
          <PluginEntry key={plugin.name} plugin={plugin} onRunCommand={onRunCommand} />
        ))}
      </div>
    </div>
  );
}
