import { useState } from "react";
import { TuiPanel } from "../shared/tui-panel";
import type { PluginManifest } from "../../types/plugin-types";

interface PluginPanelProps {
  plugins: PluginManifest[];
  onRunCommand: (pluginName: string, commandName: string) => Promise<string>;
  onRefresh: () => void;
  onClose: () => void;
}

export function PluginPanel({ plugins, onRunCommand, onRefresh, onClose }: PluginPanelProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun(pluginName: string, commandName: string) {
    setRunning(true);
    setOutput(null);
    try {
      const result = await onRunCommand(pluginName, commandName);
      setOutput(result);
    } catch (err) {
      setOutput(`error: ${err}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <TuiPanel
      title="plugins"
      className="mx-3 mb-2 max-h-[50vh] flex flex-col"
      dataTutorial="plugin-panel"
      actions={
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
            refresh
          </button>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
            esc
          </button>
        </div>
      }
    >
      <div className="overflow-y-auto flex-1 min-h-0">
        {plugins.length === 0 && (
          <div className="text-[10px] text-zinc-700">no plugins installed</div>
        )}
        {plugins.map((plugin) => (
          <div key={plugin.name} className="border border-zinc-800/60 p-2 mb-1">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-zinc-400 font-bold">{plugin.name}</span>
              <span className="text-zinc-700">v{plugin.version}</span>
            </div>
            <div className="text-[9px] text-zinc-600 mb-1">{plugin.description}</div>
            <div className="flex flex-wrap gap-1">
              {plugin.commands.map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => handleRun(plugin.name, cmd.name)}
                  disabled={running}
                  className="text-[9px] text-cyan-600 hover:text-cyan-400 disabled:text-zinc-700"
                  title={cmd.description}
                >
                  {cmd.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {output !== null && (
        <pre className="mt-1 p-1 border border-zinc-800/60 text-[9px] text-zinc-400 max-h-[80px] overflow-auto">
          {output}
        </pre>
      )}
    </TuiPanel>
  );
}
