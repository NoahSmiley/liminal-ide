interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
    >
      {/* Hexagonal shape */}
      <path
        d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Inner hexagon cells */}
      <path
        d="M32 16L44 23V37L32 44L20 37V23L32 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Center dot */}
      <circle cx="32" cy="30" r="4" fill="currentColor" />
    </svg>
  );
}
