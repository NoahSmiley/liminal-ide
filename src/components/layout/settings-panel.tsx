import { TuiPanel } from "../shared/tui-panel";
import { SettingsSection } from "./settings-section";
import type { Settings } from "../../types/settings-types";
import {
  MODEL_OPTIONS,
  THEME_OPTIONS,
  KEYBINDING_OPTIONS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from "../../types/settings-types";

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (partial: Partial<Settings>) => void;
  onReset: () => void;
  onClose: () => void;
}

function SelectField<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] px-2 py-0.5 outline-none"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function SettingsPanel({ settings, onUpdate, onReset, onClose }: SettingsPanelProps) {
  return (
    <TuiPanel
      title="settings"
      className="mx-3 mb-2"
      dataTutorial="settings-panel"
      actions={
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-[11px]">
          esc
        </button>
      }
    >
      <div className="flex flex-col gap-1 py-1">
        <SettingsSection label="model">
          <SelectField value={settings.model} options={MODEL_OPTIONS} onChange={(v) => onUpdate({ model: v })} />
        </SettingsSection>

        <SettingsSection label="theme">
          <SelectField value={settings.theme} options={THEME_OPTIONS} onChange={(v) => onUpdate({ theme: v })} />
        </SettingsSection>

        <SettingsSection label="font size">
          <input
            type="range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            value={settings.font_size}
            onChange={(e) => onUpdate({ font_size: Number(e.target.value) })}
            className="w-20 accent-cyan-600"
          />
          <span className="text-[11px] text-zinc-400 w-5 text-right">{settings.font_size}</span>
        </SettingsSection>

        <SettingsSection label="keybindings">
          <SelectField
            value={settings.keybinding_preset}
            options={KEYBINDING_OPTIONS}
            onChange={(v) => onUpdate({ keybinding_preset: v })}
          />
        </SettingsSection>

        <div className="flex justify-end pt-2 border-t border-zinc-800/40">
          <button
            onClick={onReset}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-wider"
          >
            reset defaults
          </button>
        </div>
      </div>
    </TuiPanel>
  );
}
