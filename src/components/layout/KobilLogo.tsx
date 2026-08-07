/* eslint-disable @next/next/no-img-element */
// KOBIL logo — the approved asset, not a redraw.
//
// public/assets/kobil-logo.png is the official lockup (wordmark + signal mark) with the
// white background converted to alpha and the surrounding whitespace trimmed, so
// it sits correctly on any surface. public/kobil-mark.png is the signal mark on
// its own for tight contexts. The brand guideline forbids recreating the logo
// from type, so keep using these files rather than redrawing them.
//
// Plain <img> instead of next/image on purpose: a static two-colour logo gains
// nothing from the optimizer, and it avoids requiring `sharp` in the standalone
// runtime. Intrinsic width/height are declared so the browser reserves the right
// box and nothing shifts while loading; `w-auto` keeps the aspect ratio while
// the caller controls the height via `className`.
//
// `variant="reversed"` renders the white version for dark/blue backgrounds, as
// the guideline requires: the filter drives every opaque pixel to white and
// leaves the transparent area untouched.

const LOGO = { src: "/assets/kobil-logo.png", w: 548, h: 176 };
const MARK = { src: "/assets/kobil-mark.png", w: 192, h: 176 };

const REVERSED = "[filter:brightness(0)_invert(1)]";

export function KobilLogo({
  className = "h-7",
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "reversed";
}) {
  return (
    <img
      src={LOGO.src}
      alt="KOBIL"
      width={LOGO.w}
      height={LOGO.h}
      className={`${className} w-auto ${variant === "reversed" ? REVERSED : ""}`}
    />
  );
}

/** Signal-mark-only icon for tight contexts (app icon, favicon, corner mark). */
export function KobilMark({
  className = "h-6",
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "reversed";
}) {
  return (
    <img
      src={MARK.src}
      alt="KOBIL"
      width={MARK.w}
      height={MARK.h}
      className={`${className} w-auto ${variant === "reversed" ? REVERSED : ""}`}
    />
  );
}
