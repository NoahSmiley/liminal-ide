import { useEffect, useRef } from "react";

// Patterns that contain a full URL in capture group 1
const URL_PATTERNS = [
  /Local:\s+(https?:\/\/localhost:\d+)/,
  /listening on\s+(https?:\/\/localhost:\d+)/i,
  /running at\s+(https?:\/\/localhost:\d+)/i,
  /ready on\s+(https?:\/\/localhost:\d+)/i,
  /started at\s+(https?:\/\/localhost:\d+)/i,
  /available at\s+(https?:\/\/localhost:\d+)/i,
  /server at\s+(https?:\/\/localhost:\d+)/i,
  /(https?:\/\/localhost:\d+)/,
  /(https?:\/\/127\.0\.0\.1:\d+)/,
];

// Patterns that contain just a port number — we construct http://localhost:PORT
const PORT_PATTERNS = [
  /Serving HTTP on\s+(?:::|\S+)\s+port\s+(\d+)/i,
  /listening on port\s+(\d+)/i,
  /started on port\s+(\d+)/i,
  /server on port\s+(\d+)/i,
  /port\s+(\d{4,5})\b/i,
];

function extractUrl(text: string): string | null {
  for (const pattern of URL_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  for (const pattern of PORT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return `http://localhost:${match[1]}`;
  }
  return null;
}

interface UseDevServerDetectOptions {
  terminalOutputs: string[];
  conversationTexts: string[];
  currentPreviewUrl: string | null;
  onDetect: (url: string) => void;
}

export function useDevServerDetect({
  terminalOutputs,
  conversationTexts,
  currentPreviewUrl,
  onDetect,
}: UseDevServerDetectOptions) {
  const lastDetectedRef = useRef<string | null>(null);

  useEffect(() => {
    // Scan terminal outputs (last 500 chars each)
    for (const output of terminalOutputs) {
      const tail = output.slice(-500);
      const url = extractUrl(tail);
      if (url && url !== lastDetectedRef.current && url !== currentPreviewUrl) {
        lastDetectedRef.current = url;
        onDetect(url);
        return;
      }
    }

    // Scan recent conversation tool results (last 3 bash results)
    for (const text of conversationTexts) {
      const url = extractUrl(text);
      if (url && url !== lastDetectedRef.current && url !== currentPreviewUrl) {
        lastDetectedRef.current = url;
        onDetect(url);
        return;
      }
    }
  }, [terminalOutputs, conversationTexts, currentPreviewUrl, onDetect]);
}
