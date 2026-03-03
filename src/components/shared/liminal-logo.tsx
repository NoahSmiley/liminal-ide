import logoSrc from "../../assets/lightbrain.png";

interface LiminalLogoProps {
  size?: number;
  className?: string;
}

export function LiminalLogo({ size = 48, className = "" }: LiminalLogoProps) {
  return (
    <img
      src={logoSrc}
      alt="liminal"
      width={size}
      height={size}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
