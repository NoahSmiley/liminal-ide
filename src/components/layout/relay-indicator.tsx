import type { RelayStatus } from "../../hooks/use-relay";

interface RelayIndicatorProps {
  status: RelayStatus | null;
  onShowPairing: () => void;
}

export function RelayIndicator({ status, onShowPairing }: RelayIndicatorProps) {
  const running = status?.running ?? false;
  const clientCount = status?.connected_clients?.length ?? 0;

  if (running && clientCount > 0) {
    return (
      <button
        onClick={onShowPairing}
        className="text-[12px] text-sky-400/80 hover:text-sky-300 tracking-wide transition-colors"
        title={`${clientCount} device${clientCount !== 1 ? "s" : ""} connected — click to pair another`}
      >
        {clientCount} device{clientCount !== 1 ? "s" : ""}
      </button>
    );
  }

  return (
    <button
      onClick={onShowPairing}
      className="text-[12px] text-zinc-600 hover:text-zinc-400 tracking-wide transition-colors"
      title="Pair a device"
    >
      pair
    </button>
  );
}
