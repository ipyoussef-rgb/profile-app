"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandFooter } from "./BrandFooter";
import { openProfileSection, bridgeDiagnostics, type ProfilePage } from "@/lib/host-bridge";

type Item = {
  key: string;
  label: string;
  pageName: ProfilePage;
  icon: React.ReactNode;
};

// Native settings screens opened via the host openProfileSection contract.
const SETTINGS: Item[] = [
  { key: "account", label: "Konto", pageName: "account", icon: <IconKey /> },
  { key: "privacy", label: "Privatsphäre & Sicherheit", pageName: "privacy_security", icon: <IconShield /> },
  { key: "signature", label: "Signatur", pageName: "signature", icon: <IconPen /> },
];

const GENERAL: Item[] = [
  { key: "licenses", label: "Lizenzen", pageName: "licences", icon: <IconBadge /> },
  { key: "legal", label: "Rechtliche Informationen", pageName: "legal_entity", icon: <IconBank /> },
  { key: "contact", label: "Kontaktieren Sie uns", pageName: "contact_us", icon: <IconMail /> },
];

export function ProfileMenu({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const [announce, setAnnounce] = useState("");
  const [debug, setDebug] = useState<ReturnType<typeof bridgeDiagnostics> | null>(null);
  const [lastAction, setLastAction] = useState("");

  // ?debug overlay: shows which host bridge endpoints were detected. Also
  // proves the client hydrated (the panel only appears once JS runs).
  useEffect(() => {
    if (typeof window !== "undefined" && /[?&]debug\b/.test(window.location.search)) {
      setDebug(bridgeDiagnostics());
    }
  }, []);

  // A settings row opens the matching native screen via the host bridge. In
  // standalone web there is no host, so we announce the intent for assistive
  // tech and as a visible hint.
  function open(item: Item) {
    const how = openProfileSection(item.pageName);
    setLastAction(`openProfileSection({ pageName: "${item.pageName}" }) → ${how}`);
    setAnnounce(`${item.label} wird in der KOBIL Super App geöffnet.`);
  }

  const initials = (name ?? email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-8 pt-7 sm:max-w-lg">
      <h1 className="sr-only">Profil und Einstellungen</h1>

      {/* Identity header */}
      <section className="flex items-center gap-4 rounded-[var(--radius-kobil)] bg-[var(--color-kobil-surface)] p-4 shadow-[var(--shadow-kobil-sm)]">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-kobil-primary)] text-base font-bold text-white"
        >
          {initials || "K"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--color-kobil-navy)]">
            {name ?? "Angemeldet"}
          </p>
          {email && (
            <p className="truncate text-sm text-[var(--color-kobil-text-muted)]">{email}</p>
          )}
        </div>
      </section>

      {/* Profil entry — the complete profile-app experience (overview, edit,
          change email/password, attributes, privacy, data & account). */}
      <Link
        href="/profile"
        className="mt-5 flex min-h-[var(--tap-kobil)] items-center gap-4 rounded-[var(--radius-kobil)] border border-[var(--color-kobil-primary)] bg-[var(--color-kobil-ghost)] p-4 text-left transition-colors hover:bg-[#dbe2ff]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-kobil-primary)] text-white">
          <IconUser />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[var(--color-kobil-navy)]">Profil</span>
          <span className="block text-sm text-[var(--color-kobil-text-muted)]">
            Profil, Daten und Einstellungen verwalten
          </span>
        </span>
        <Chevron />
      </Link>

      <MenuGroup title="Einstellungen">
        {SETTINGS.map((it) => (
          <MenuButton key={it.key} item={it} onActivate={open} />
        ))}
      </MenuGroup>

      <MenuGroup title="Allgemein">
        {GENERAL.map((it) => (
          <MenuButton key={it.key} item={it} onActivate={open} />
        ))}
      </MenuGroup>

      <div className="mt-8 flex justify-center">
        <a
          href="/api/auth/logout"
          className="inline-flex min-h-[var(--tap-kobil)] items-center justify-center rounded-full border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-8 font-semibold uppercase tracking-wide text-[var(--color-kobil-navy)] transition-colors hover:bg-[var(--color-kobil-surface-muted)]"
        >
          Ausloggen
        </a>
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {announce && (
        <p className="mt-4 text-center text-sm text-[var(--color-kobil-text-muted)]">{announce}</p>
      )}

      {debug && (
        <section className="mt-6 rounded-[var(--radius-kobil-sm)] border border-[var(--color-kobil-border)] bg-[var(--color-kobil-navy)] p-3 font-mono text-xs text-white">
          <p className="mb-1 font-semibold">Bridge-Diagnose (?debug)</p>
          <ul className="space-y-0.5">
            <li>embedded: {String(debug.embedded)}</li>
            <li>inIframe: {String(debug.inIframe)} · scopes: {debug.scopes}</li>
            <li>openProfileSection fn: {debug.openProfileSection ?? "—"}</li>
            <li>iOS handlers: {debug.ios.length ? debug.ios.join(", ") : "—"}</li>
            <li>flutter: {String(debug.flutter)} · reactNative: {String(debug.reactNative)}</li>
            <li className="break-all pt-1">letzte Aktion: {lastAction || "—"}</li>
          </ul>
        </section>
      )}

      <BrandFooter />
    </main>
  );
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-text-muted)]">
        {title}
      </h2>
      <ul className="divide-y divide-[var(--color-kobil-border)] overflow-hidden rounded-[var(--radius-kobil)] bg-[var(--color-kobil-surface)] shadow-[var(--shadow-kobil-sm)]">
        {children}
      </ul>
    </section>
  );
}

function MenuButton({ item, onActivate }: { item: Item; onActivate: (i: Item) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onActivate(item)}
        className="flex min-h-[var(--tap-kobil)] w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--color-kobil-surface-muted)]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-kobil-ghost)] text-[var(--color-kobil-primary)]">
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 font-medium text-[var(--color-kobil-navy)]">
          {item.label}
        </span>
        <Chevron />
      </button>
    </li>
  );
}

function Chevron() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-kobil-text-muted)]">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── icons (decorative) ─────────────────────────────────────────────────── */
const sw = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
function IconKey() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M15 7a3 3 0 100 6 3 3 0 000-6zm-2.5 4.5L4 20m3-3l2 2m-1-4l2 2" /></svg>;
}
function IconShield() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path {...sw} d="M9 12l2 2 4-4" /></svg>;
}
function IconPen() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M4 20h4l10-10-4-4L4 16v4z" /><path {...sw} d="M13.5 6.5l4 4" /></svg>;
}
function IconBadge() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><rect {...sw} x="4" y="4" width="16" height="16" rx="3" /><path {...sw} d="M8 9h8M8 13h5" /></svg>;
}
function IconBank() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M4 9l8-5 8 5M5 9v8m4-8v8m6-8v8m4-8v8M3 20h18" /></svg>;
}
function IconMail() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><rect {...sw} x="3" y="5" width="18" height="14" rx="2" /><path {...sw} d="M3 7l9 6 9-6" /></svg>;
}
function IconUser() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><circle {...sw} cx="12" cy="8" r="4" /><path {...sw} d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>;
}
