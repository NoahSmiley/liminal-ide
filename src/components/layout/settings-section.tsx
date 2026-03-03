import type { ReactNode } from "react";

interface SettingsSectionProps {
  label: string;
  children: ReactNode;
}

export function SettingsSection({ label, children }: SettingsSectionProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
