// KOBIL logo: wordmark + signal mark (three vertical bars of increasing
// height). Placeholder built from the brand guideline — swap with the official
// asset when available. `variant="reversed"` for dark/blue backgrounds.
export function KobilLogo({
  className = "h-7",
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "reversed";
}) {
  const fill = variant === "reversed" ? "#ffffff" : "var(--color-kobil-primary)";
  const word = variant === "reversed" ? "#ffffff" : "var(--color-kobil-navy)";
  return (
    <svg
      viewBox="0 0 168 40"
      role="img"
      aria-label="KOBIL"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="29"
        fontFamily="var(--font-kobil)"
        fontSize="26"
        fontWeight="800"
        fill={word}
        letterSpacing="1"
      >
        KOBIL
      </text>
      {/* signal mark — three rising bars */}
      <rect x="118" y="22" width="8" height="12" rx="2" fill={fill} />
      <rect x="130" y="14" width="8" height="20" rx="2" fill={fill} />
      <rect x="142" y="6" width="8" height="28" rx="2" fill={fill} />
    </svg>
  );
}

/** Compact signal-mark-only icon for tight contexts. */
export function KobilMark({
  className = "h-6",
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "reversed";
}) {
  const fill = variant === "reversed" ? "#ffffff" : "var(--color-kobil-primary)";
  return (
    <svg viewBox="0 0 40 40" role="img" aria-label="KOBIL" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="22" width="9" height="14" rx="2.5" fill={fill} />
      <rect x="15" y="12" width="9" height="24" rx="2.5" fill={fill} />
      <rect x="28" y="4" width="9" height="32" rx="2.5" fill={fill} />
    </svg>
  );
}
