import { useState, useRef, useCallback, useEffect } from "react";

interface WebPreviewPaneProps {
  url: string | null;
  onUrlChange: (url: string | null) => void;
}

export function WebPreviewPane({ url, onUrlChange }: WebPreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [inputUrl, setInputUrl] = useState(url ?? "");
  const [history, setHistory] = useState<string[]>(url ? [url] : []);
  const [historyIndex, setHistoryIndex] = useState(url ? 0 : -1);

  useEffect(() => {
    if (url && (history.length === 0 || history[history.length - 1] !== url)) {
      setHistory((h) => [...h, url]);
      setHistoryIndex((i) => i + 1);
      setInputUrl(url);
    }
  }, [url]);

  const navigate = useCallback((newUrl: string) => {
    if (!newUrl) return;
    const normalized = newUrl.startsWith("http") ? newUrl : `http://${newUrl}`;
    onUrlChange(normalized);
    setInputUrl(normalized);
    setHistory((h) => [...h.slice(0, historyIndex + 1), normalized]);
    setHistoryIndex((i) => i + 1);
  }, [historyIndex, onUrlChange]);

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1]!;
    setHistoryIndex((i) => i - 1);
    setInputUrl(prev);
    onUrlChange(prev);
  }, [history, historyIndex, onUrlChange]);

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1]!;
    setHistoryIndex((i) => i + 1);
    setInputUrl(next);
    onUrlChange(next);
  }, [history, historyIndex, onUrlChange]);

  const reload = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputUrl);
  }, [inputUrl, navigate]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/40 bg-zinc-950/50 shrink-0">
        <button
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="w-6 h-6 flex items-center justify-center text-[13px] rounded-[3px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800 disabled:cursor-default transition-colors"
          title="back"
        >
          &larr;
        </button>
        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="w-6 h-6 flex items-center justify-center text-[13px] rounded-[3px] text-zinc-500 hover:text-zinc-300 disabled:text-zinc-800 disabled:cursor-default transition-colors"
          title="forward"
        >
          &rarr;
        </button>
        <button
          onClick={reload}
          className="w-6 h-6 flex items-center justify-center text-[13px] rounded-[3px] text-zinc-500 hover:text-zinc-300 transition-colors"
          title="reload"
        >
          &#8635;
        </button>
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-[3px] px-2.5 py-1 text-[11px] font-mono text-zinc-300 outline-none focus:border-cyan-500/40 placeholder:text-zinc-700 caret-cyan-400"
            placeholder="http://localhost:3000"
            spellCheck={false}
          />
          <button
            type="submit"
            className="ml-1.5 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            go
          </button>
        </form>
      </div>

      {/* Iframe */}
      {url ? (
        <iframe
          ref={iframeRef}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          className="flex-1 w-full bg-white"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-700 text-[11px]">
          no preview url -- start a dev server or enter a URL above
        </div>
      )}
    </div>
  );
}
