import type { ReactNode } from "react";

interface SettingsSectionProps {
  label: string;
  children: ReactNode;
}

export function SettingsSection({ label, children }: SettingsSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 uppercase tracking-[0.1em]">{label}</span>
      <div>{children}</div>
    </div>
  );
}
