import type { BotFaceId } from "../../types/agent-types";
import { getAgentColors } from "../../types/agent-types";

interface BotFaceProps {
  face?: string;
  color?: string;
  size?: number; // px
  active?: boolean;
}

// Each robot face is a unique SVG character drawn in a 24x24 viewBox.
// They share a consistent "head" shape but have different eyes/features.
function FaceSvg({ face, fill, accent }: { face: string; fill: string; accent: string }) {
  switch (face as BotFaceId) {
    // Visor — wide horizontal eye slit like a Cylon
    case "visor":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="4" y="3" width="16" height="18" rx="3" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="4" y="3" width="16" height="18" rx="3" fill={fill} opacity="0.08" />
          <rect x="7" y="10" width="10" height="3" rx="1.5" fill={fill} opacity="0.9" />
          <rect x="7" y="10" width="10" height="3" rx="1.5" fill={fill} opacity="0.3">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="9" y="16" width="6" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );

    // Dome — rounded head with two round eyes
    case "dome":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path d="M5 21V10a7 7 0 0 1 14 0v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <path d="M5 21V10a7 7 0 0 1 14 0v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" fill={fill} opacity="0.08" />
          <circle cx="9" cy="12" r="2" fill={fill} opacity="0.85" />
          <circle cx="15" cy="12" r="2" fill={fill} opacity="0.85" />
          <circle cx="9" cy="12" r="1" fill={accent} opacity="0.6" />
          <circle cx="15" cy="12" r="1" fill={accent} opacity="0.6" />
          <rect x="10" y="17" width="4" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );

    // Box — boxy square head with rectangular eyes
    case "box":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="3" y="4" width="18" height="16" rx="2" fill={fill} opacity="0.08" />
          <rect x="7" y="9" width="3" height="4" rx="1" fill={fill} opacity="0.85" />
          <rect x="14" y="9" width="3" height="4" rx="1" fill={fill} opacity="0.85" />
          <line x1="10" y1="1" x2="10" y2="4" stroke={fill} strokeWidth="1.5" opacity="0.4" />
          <line x1="14" y1="1" x2="14" y2="4" stroke={fill} strokeWidth="1.5" opacity="0.4" />
          <rect x="9" y="16" width="6" height="1.5" rx="0.75" fill={fill} opacity="0.3" />
        </svg>
      );

    // Mono — single large cyclops eye
    case "mono":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="4" y="4" width="16" height="16" rx="4" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="4" y="4" width="16" height="16" rx="4" fill={fill} opacity="0.08" />
          <circle cx="12" cy="11" r="4" stroke={fill} strokeWidth="1.5" opacity="0.7" />
          <circle cx="12" cy="11" r="2" fill={fill} opacity="0.9" />
          <circle cx="12" cy="11" r="2" fill={fill} opacity="0.3">
            <animate attributeName="r" values="2;2.5;2" dur="3s" repeatCount="indefinite" />
          </circle>
          <rect x="9" y="17" width="6" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );

    // Hex — hexagonal head shape with angular eyes
    case "hex":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path d="M12 2L21 7v10l-9 5-9-5V7l9-5Z" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <path d="M12 2L21 7v10l-9 5-9-5V7l9-5Z" fill={fill} opacity="0.08" />
          <path d="M7 10l2.5-1.5L12 10l2.5-1.5L17 10" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <circle cx="9" cy="11" r="1" fill={fill} opacity="0.7" />
          <circle cx="15" cy="11" r="1" fill={fill} opacity="0.7" />
          <path d="M10 15h4" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        </svg>
      );

    // Tri — triangular/pointed head
    case "tri":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <path d="M12 2L22 20H2L12 2Z" stroke={fill} strokeWidth="1.5" strokeLinejoin="round" opacity="0.6" />
          <path d="M12 2L22 20H2L12 2Z" fill={fill} opacity="0.08" />
          <circle cx="9.5" cy="14" r="1.5" fill={fill} opacity="0.85" />
          <circle cx="14.5" cy="14" r="1.5" fill={fill} opacity="0.85" />
          <rect x="10" y="17.5" width="4" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );

    // Orb — circular head with dot eyes
    case "orb":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <circle cx="12" cy="12" r="9" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <circle cx="12" cy="12" r="9" fill={fill} opacity="0.08" />
          <circle cx="9" cy="11" r="1.5" fill={fill} opacity="0.85" />
          <circle cx="15" cy="11" r="1.5" fill={fill} opacity="0.85" />
          <path d="M9.5 15.5Q12 17.5 14.5 15.5" stroke={fill} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4" />
        </svg>
      );

    // Spike — angular head with antenna spikes
    case "spike":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="5" y="6" width="14" height="14" rx="2" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="5" y="6" width="14" height="14" rx="2" fill={fill} opacity="0.08" />
          <line x1="8" y1="6" x2="6" y2="1" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="16" y1="6" x2="18" y2="1" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <polygon points="8,11 10,14 6,14" fill={fill} opacity="0.8" />
          <polygon points="16,11 18,14 14,14" fill={fill} opacity="0.8" />
          <rect x="10" y="17" width="4" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );

    // Slit — narrow slit eyes, menacing
    case "slit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="4" y="3" width="16" height="18" rx="3" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="4" y="3" width="16" height="18" rx="3" fill={fill} opacity="0.08" />
          <line x1="7" y1="11" x2="10" y2="11" stroke={fill} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <line x1="14" y1="11" x2="17" y2="11" stroke={fill} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
          <path d="M9 16h6" stroke={fill} strokeWidth="1" strokeLinecap="round" opacity="0.25" />
        </svg>
      );

    // Cross — cross/plus shaped eyes
    case "cross":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="4" y="4" width="16" height="16" rx="3" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="4" y="4" width="16" height="16" rx="3" fill={fill} opacity="0.08" />
          <line x1="8" y1="10" x2="8" y2="14" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <line x1="6" y1="12" x2="10" y2="12" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <line x1="16" y1="10" x2="16" y2="14" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <line x1="14" y1="12" x2="18" y2="12" stroke={fill} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <rect x="10" y="17" width="4" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );

    default:
      // Fallback — simple dot eyes
      return (
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <rect x="4" y="4" width="16" height="16" rx="3" stroke={fill} strokeWidth="1.5" opacity="0.6" />
          <rect x="4" y="4" width="16" height="16" rx="3" fill={fill} opacity="0.08" />
          <circle cx="9" cy="11" r="1.5" fill={fill} opacity="0.8" />
          <circle cx="15" cy="11" r="1.5" fill={fill} opacity="0.8" />
          <rect x="10" y="16" width="4" height="1" rx="0.5" fill={fill} opacity="0.3" />
        </svg>
      );
  }
}

export function BotFace({ face, color, size = 28, active }: BotFaceProps) {
  const c = getAgentColors(color);
  return (
    <div
      className={`rounded-full ${c.bg} ${c.border} border flex items-center justify-center shrink-0 select-none transition-all ${
        active ? `shadow-lg ${c.glow}` : ""
      }`}
      style={{ width: size, height: size }}
    >
      <div style={{ width: size * 0.7, height: size * 0.7 }}>
        <FaceSvg face={face ?? "box"} fill={c.fill} accent="#ffffff" />
      </div>
    </div>
  );
}
