import { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...rest}
      className={`rounded-[var(--radius-kobil)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 text-lg font-semibold text-[var(--color-kobil-text)]">{children}</h2>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm text-[var(--color-kobil-text-muted)]">{children}</p>;
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
      <div className="mb-1 text-sm font-medium text-[var(--color-kobil-text)]">{label}</div>
      {children}
      {helper ? (
        <div className="mt-1 text-xs text-[var(--color-kobil-text-muted)]">{helper}</div>
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
  const base =
    "inline-flex items-center justify-center rounded-[var(--radius-kobil)] px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles = {
    primary:
      "bg-[var(--color-kobil-primary)] text-white hover:bg-[var(--color-kobil-primary-hover)]",
    secondary:
      "border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] text-[var(--color-kobil-text)] hover:bg-[var(--color-kobil-surface-muted)]",
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
  tone?: "neutral" | "success" | "danger";
}) {
  const styles = {
    neutral: "bg-[var(--color-kobil-surface-muted)] text-[var(--color-kobil-text-muted)]",
    success: "bg-emerald-50 text-emerald-800",
    danger: "bg-red-50 text-red-800",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}
