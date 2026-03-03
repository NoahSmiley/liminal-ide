interface TutorialSpotlightProps {
  targetRect: DOMRect | null;
  padding: number;
}

export function TutorialSpotlight({ targetRect, padding }: TutorialSpotlightProps) {
  if (!targetRect) {
    return <div className="fixed inset-0 bg-black/60" />;
  }

  const x = targetRect.x - padding;
  const y = targetRect.y - padding;
  const w = targetRect.width + padding * 2;
  const h = targetRect.height + padding * 2;

  return (
    <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
      <defs>
        <mask id="tutorial-spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} fill="black" rx="2" />
        </mask>
      </defs>
      <rect
        x="0" y="0" width="100%" height="100%"
        fill="rgba(0,0,0,0.6)"
        mask="url(#tutorial-spotlight-mask)"
      />
    </svg>
  );
}
