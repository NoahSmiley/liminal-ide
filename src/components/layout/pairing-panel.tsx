import { useCallback, useEffect, useState } from "react";
import type { PairingQR } from "../../hooks/use-relay";

interface PairingPanelProps {
  onGenerateQR: () => Promise<PairingQR | null>;
}

export function PairingPanel({ onGenerateQR }: PairingPanelProps) {
  const [qr, setQr] = useState<PairingQR | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onGenerateQR();
      if (result) {
        setQr(result);
      } else {
        setError("Failed to generate QR code");
      }
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }, [onGenerateQR]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-[320px]">
        <h2 className="text-[13px] text-zinc-300 mb-6 text-center">pair device</h2>

        {loading && !qr ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[12px] text-zinc-600">generating...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-[12px] text-red-400 mb-3">{error}</p>
            <button
              onClick={generate}
              className="text-[12px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded px-3 py-1.5"
            >
              retry
            </button>
          </div>
        ) : qr ? (
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-lg p-3 mb-4">
              <img
                src={qr.qr_data_url}
                alt="Pairing QR code"
                className="w-[200px] h-[200px]"
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono text-center mb-1">
              {qr.host}:{qr.port}
            </p>
            <p className="text-[11px] text-zinc-600 text-center">
              scan with liminal companion
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
