import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Mein Profil — KOBIL",
  description:
    "Verwalten Sie Ihr Profil, Datenschutzeinstellungen und persönliche Daten.",
};

// viewport-fit=cover is required for env(safe-area-inset-*) to resolve to the
// real notch / status-bar insets inside a device WebView (Pixel 9 / iPhone 16);
// without it the header renders under the status bar. themeColor tints the
// status bar to match the navy header.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1b3a87",
};

// Accept only hex / rgb(a) / hsl(a) / a bare CSS named colour — nothing that
// could break out of the custom-property value. Values come from the trusted
// Helm chart, but we validate as defence-in-depth and to ignore typos.
function safeColor(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  if (/^(?:rgb|rgba|hsl|hsla)\([0-9.,%/\s]+\)$/.test(s)) return s;
  if (/^[a-zA-Z]{1,24}$/.test(s)) return s;
  return undefined;
}

// Build CSS-variable overrides from the chart's theme.* values. React sets them
// as a style object (escaping the values), and custom properties inherit, so
// they cascade to every component below <html>. Empty/invalid → CSS defaults.
function themeStyle(): CSSProperties | undefined {
  let e: ReturnType<typeof env> | null = null;
  try {
    e = env();
  } catch {
    return undefined; // env not ready (e.g. at build time) — use CSS defaults
  }
  const vars: Record<string, string> = {};
  const header = safeColor(e.THEME_HEADER_COLOR);
  if (header) vars["--color-kobil-header"] = header;
  const primary = safeColor(e.THEME_PRIMARY_COLOR);
  if (primary) vars["--color-kobil-primary"] = primary;
  const navy = safeColor(e.THEME_NAVY_COLOR);
  if (navy) vars["--color-kobil-navy"] = navy;
  return Object.keys(vars).length ? (vars as CSSProperties) : undefined;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" style={themeStyle()}>
      <body>{children}</body>
    </html>
  );
}
