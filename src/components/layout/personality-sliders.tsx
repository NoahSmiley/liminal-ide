import { useMemo, useCallback } from "react";

interface Trait {
  key: string;
  label: string;
  low: string;
  high: string;
  default: number;
}

const TRAITS: Trait[] = [
  { key: "humor", label: "humor", low: "serious", high: "witty", default: 30 },
  { key: "sarcasm", label: "sarcasm", low: "straight", high: "dry", default: 15 },
  { key: "formality", label: "formality", low: "casual", high: "formal", default: 50 },
  { key: "verbosity", label: "verbosity", low: "terse", high: "detailed", default: 40 },
  { key: "confidence", label: "confidence", low: "cautious", high: "assertive", default: 60 },
];

function parsePersonality(raw: string): Record<string, number> {
  const values: Record<string, number> = {};
  if (!raw) return values;
  for (const part of raw.split(",")) {
    const [key, val] = part.split(":");
    if (key && val) values[key.trim()] = Number(val);
  }
  return values;
}

function serializePersonality(values: Record<string, number>): string {
  return Object.entries(values)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

interface PersonalitySlidersProps {
  personality: string;
  onChange: (personality: string) => void;
}

export function PersonalitySliders({ personality, onChange }: PersonalitySlidersProps) {
  const values = useMemo(() => {
    const parsed = parsePersonality(personality);
    const result: Record<string, number> = {};
    for (const t of TRAITS) {
      result[t.key] = parsed[t.key] ?? t.default;
    }
    return result;
  }, [personality]);

  const handleChange = useCallback(
    (key: string, val: number) => {
      const next = { ...values, [key]: val };
      onChange(serializePersonality(next));
    },
    [values, onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      {TRAITS.map((trait) => (
        <div key={trait.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.1em] select-none">
              {trait.label}
            </span>
            <span className="text-[10px] text-zinc-600 tabular-nums select-none">
              {values[trait.key]}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-700 w-[42px] text-right shrink-0 select-none">
              {trait.low}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={values[trait.key]}
              onChange={(e) => handleChange(trait.key, Number(e.target.value))}
              className="flex-1 h-[3px] accent-cyan-500 cursor-pointer"
            />
            <span className="text-[9px] text-zinc-700 w-[42px] shrink-0 select-none">
              {trait.high}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
