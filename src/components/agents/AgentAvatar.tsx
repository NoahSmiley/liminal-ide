import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AgentAvatarProps {
  agentId: string;
  color: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 24,
  md: 40,
  lg: 64,
  xl: 128,
};

// Sage — PM: Rounded square head, horizontal bar eyes, antenna
function SageAvatar({ color }: { color: string }) {
  return (
    <>
      {/* Antenna */}
      <line x1="32" y1="8" x2="32" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="6" r="3" fill={color} />
      {/* Head — rounded square */}
      <rect x="14" y="16" width="36" height="36" rx="8" stroke={color} strokeWidth="2.5" fill="none" />
      {/* Eyes — horizontal bars */}
      <rect x="21" y="29" width="8" height="3" rx="1.5" fill={color} />
      <rect x="35" y="29" width="8" height="3" rx="1.5" fill={color} />
      {/* Mouth */}
      <rect x="26" y="40" width="12" height="2" rx="1" fill={color} opacity="0.5" />
    </>
  );
}

// Pixel — Designer: Circle head, large visor eye, pixel-grid accent
function PixelAvatar({ color }: { color: string }) {
  return (
    <>
      {/* Head — circle */}
      <circle cx="32" cy="32" r="20" stroke={color} strokeWidth="2.5" fill="none" />
      {/* Visor */}
      <rect x="18" y="26" width="28" height="8" rx="4" fill={color} opacity="0.8" />
      {/* Pixel accents */}
      <rect x="20" y="44" width="3" height="3" fill={color} opacity="0.4" />
      <rect x="26" y="44" width="3" height="3" fill={color} opacity="0.4" />
      <rect x="32" y="44" width="3" height="3" fill={color} opacity="0.4" />
      <rect x="38" y="44" width="3" height="3" fill={color} opacity="0.4" />
    </>
  );
}

// Atlas — Architect: Hexagon head, triangular eyes, blueprint lines
function AtlasAvatar({ color }: { color: string }) {
  return (
    <>
      {/* Head — hexagon */}
      <polygon
        points="32,10 52,22 52,42 32,54 12,42 12,22"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
      />
      {/* Eyes — triangles */}
      <polygon points="22,28 28,28 25,33" fill={color} />
      <polygon points="36,28 42,28 39,33" fill={color} />
      {/* Blueprint lines */}
      <line x1="22" y1="40" x2="42" y2="40" stroke={color} strokeWidth="1.5" opacity="0.4" strokeDasharray="3 2" />
      <line x1="25" y1="44" x2="39" y2="44" stroke={color} strokeWidth="1.5" opacity="0.3" strokeDasharray="3 2" />
    </>
  );
}

// Forge — Developer: Square head with cut corners, square eyes, gear earpieces
function ForgeAvatar({ color }: { color: string }) {
  return (
    <>
      {/* Head — square with cut corners */}
      <polygon
        points="20,14 44,14 52,22 52,46 44,54 20,54 12,46 12,22"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
      />
      {/* Square eyes */}
      <rect x="20" y="27" width="7" height="7" fill={color} />
      <rect x="37" y="27" width="7" height="7" fill={color} />
      {/* Gear earpieces */}
      <circle cx="10" cy="34" r="4" stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx="54" cy="34" r="4" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Mouth — code bracket */}
      <path d="M26 43 L30 46 L26 49" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38 43 L34 46 L38 49" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  );
}

// Scout — QA: Oval head, one large lens + one small, magnifying glass accent
function ScoutAvatar({ color }: { color: string }) {
  return (
    <>
      {/* Head — oval */}
      <ellipse cx="32" cy="34" rx="18" ry="22" stroke={color} strokeWidth="2.5" fill="none" />
      {/* Large lens eye */}
      <circle cx="26" cy="30" r="6" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="26" cy="30" r="2" fill={color} />
      {/* Small eye */}
      <circle cx="40" cy="30" r="3" fill={color} />
      {/* Magnifying glass accent */}
      <circle cx="50" cy="16" r="6" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
      <line x1="46" y1="21" x2="42" y2="25" stroke={color} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
    </>
  );
}

// Beacon — DevOps: Diamond head, circular eyes, signal wave lines
function BeaconAvatar({ color }: { color: string }) {
  return (
    <>
      {/* Head — diamond */}
      <polygon
        points="32,8 54,32 32,56 10,32"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
      />
      {/* Circular eyes */}
      <circle cx="26" cy="30" r="4" fill={color} />
      <circle cx="38" cy="30" r="4" fill={color} />
      {/* Signal waves */}
      <path d="M18 18 Q14 14 18 10" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M14 20 Q8 14 14 8" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M46 18 Q50 14 46 10" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M50 20 Q56 14 50 8" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
      {/* Mouth */}
      <line x1="28" y1="40" x2="36" y2="40" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

const AVATAR_COMPONENTS: Record<string, React.FC<{ color: string }>> = {
  sage: SageAvatar,
  pixel: PixelAvatar,
  atlas: AtlasAvatar,
  forge: ForgeAvatar,
  scout: ScoutAvatar,
  beacon: BeaconAvatar,
};

export function AgentAvatar({ agentId, color, size = "md", className }: AgentAvatarProps) {
  const px = SIZE_MAP[size];
  const AvatarSvg = AVATAR_COMPONENTS[agentId];

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      fill="none"
      className={cn("shrink-0", className)}
    >
      {AvatarSvg ? <AvatarSvg color={color} /> : (
        <circle cx="32" cy="32" r="20" stroke={color} strokeWidth="2.5" fill="none" />
      )}
    </svg>
  );
}
