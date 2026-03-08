import { useCallback, useEffect, useRef, useState } from "react";
import type { PairingQR } from "../../hooks/use-relay";

interface PairingDialogProps {
  onGenerateQR: () => Promise<PairingQR | null>;
  onClose: () => void;
}

export function PairingDialog({ onGenerateQR, onClose }: PairingDialogProps) {
  const [qr, setQr] = useState<PairingQR | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);

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

  // Generate on mount
  useEffect(() => {
    generate();
  }, [generate]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[80px] bg-black/50">
      <div
        ref={dialogRef}
        className="bg-zinc-950 border border-zinc-800 rounded-lg w-[340px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-zinc-200">pair device</span>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-[13px]">
            &times;
          </button>
        </div>

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
            {/* QR code */}
            <div className="bg-white rounded-lg p-3 mb-4">
              <img
                src={qr.qr_data_url}
                alt="Pairing QR code"
                className="w-[200px] h-[200px]"
              />
            </div>

            {/* Connection info */}
            <p className="text-[11px] text-zinc-500 font-mono text-center mb-1">
              {qr.host}:{qr.port}
            </p>

            {/* Instructions */}
            <p className="text-[11px] text-zinc-600 text-center">
              scan with liminal companion
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
