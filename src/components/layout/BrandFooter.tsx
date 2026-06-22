// KOBIL brand footer: tagline + "Engineered in Germany" tag (subordinate to
// the logo, per the brand guideline).
export function BrandFooter() {
  return (
    <footer className="mt-10 flex flex-col items-center gap-2 text-center">
      <p className="text-sm font-semibold tracking-wide text-[var(--color-kobil-primary)]">
        Shift. Thrive. Win.
      </p>
      <p className="flex items-center gap-2 text-xs text-[var(--color-kobil-text-muted)]">
        <span aria-hidden="true" className="inline-flex h-3 w-5 overflow-hidden rounded-[2px] border border-[var(--color-kobil-border)]">
          <span className="h-full w-1/3 bg-black" />
          <span className="h-full w-1/3 bg-[#dd0000]" />
          <span className="h-full w-1/3 bg-[#ffce00]" />
        </span>
        Engineered in Germany
      </p>
    </footer>
  );
}
