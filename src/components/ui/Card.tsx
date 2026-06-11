import { HTMLAttributes, ReactNode } from "react";

/**
 * Canonical form-control class. 16px text (no iOS zoom) + a 48px min height
 * so fields are easy to tap and type into inside the mobile mini-app. Import
 * this everywhere instead of redefining per-form.
 */
export const inputClass =
  "w-full min-h-[var(--tap-kobil)] rounded-[var(--radius-kobil-sm)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-4 py-3 text-base text-[var(--color-kobil-text)] placeholder:text-[var(--color-kobil-text-muted)] transition-colors focus:border-[var(--color-kobil-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-kobil-primary)]/25 disabled:cursor-not-allowed disabled:bg-[var(--color-kobil-surface-muted)] disabled:opacity-70";

export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...rest}
      className={`rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] p-5 shadow-[var(--shadow-kobil-sm)] transition-shadow hover:shadow-[var(--shadow-kobil-md)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-1 text-xl font-semibold tracking-tight text-[var(--color-kobil-text)] sm:text-2xl">
      {children}
    </h2>
  );
}

export function CardDescription({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[15px] leading-relaxed text-[var(--color-kobil-text-muted)]">
      {children}
    </p>
  );
}

/** Page-level heading (h1). Every screen should render exactly one so the
 *  heading order (h1 → Card h2) is valid for screen readers. */
export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-1">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-kobil-text)] sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-kobil-text-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <div className="mb-1.5 text-[15px] font-medium text-[var(--color-kobil-text)]">{label}</div>
      {children}
      {helper ? (
        <div className="mt-1.5 text-[13px] text-[var(--color-kobil-text-muted)]">{helper}</div>
      ) : null}
    </label>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  // min-h 48px + generous padding = comfortable thumb target on mobile.
  const base =
    "inline-flex min-h-[var(--tap-kobil)] items-center justify-center gap-2 rounded-[var(--radius-kobil-sm)] px-5 py-3 text-base font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-kobil-ring)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";
  const styles = {
    primary:
      "bg-[var(--color-kobil-primary)] text-white shadow-[var(--shadow-kobil-sm)] hover:bg-[var(--color-kobil-primary-hover)] hover:shadow-[var(--shadow-kobil-md)]",
    secondary:
      "border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] text-[var(--color-kobil-text)] hover:border-[var(--color-kobil-primary)] hover:bg-[var(--color-kobil-surface-muted)]",
    danger: "bg-[var(--color-kobil-danger)] text-white hover:opacity-90",
  }[variant];
  return (
    <button {...rest} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "primary";
}) {
  const styles = {
    // text (not muted) on the muted surface clears 4.5:1; muted failed (~2.8:1).
    neutral:
      "bg-[var(--color-kobil-surface-muted)] text-[var(--color-kobil-text)] ring-1 ring-inset ring-[var(--color-kobil-border)]",
    primary:
      "bg-[var(--color-kobil-primary-tint)] text-[var(--color-kobil-primary)] ring-1 ring-inset ring-[var(--color-kobil-primary)]/15",
    success:
      "bg-[var(--color-kobil-success-tint)] text-[var(--color-kobil-success)] ring-1 ring-inset ring-[var(--color-kobil-success)]/20",
    danger:
      "bg-[var(--color-kobil-danger-tint)] text-[var(--color-kobil-danger)] ring-1 ring-inset ring-[var(--color-kobil-danger)]/20",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium ${styles}`}
    >
      {children}
    </span>
  );
}
