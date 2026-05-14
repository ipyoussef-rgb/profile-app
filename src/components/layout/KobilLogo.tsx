// Placeholder KOBIL logo. Swap this SVG with the official KOBIL brand asset.
export function KobilLogo({ className = "h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 40"
      role="img"
      aria-label="KOBIL"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="6" width="28" height="28" rx="6" fill="var(--color-kobil-primary)" />
      <text
        x="36"
        y="27"
        fontFamily="var(--font-kobil)"
        fontSize="20"
        fontWeight="700"
        fill="var(--color-kobil-primary)"
        letterSpacing="2"
      >
        KOBIL
      </text>
    </svg>
  );
}
