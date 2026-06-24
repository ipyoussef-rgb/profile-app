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
  { key: "privacy", label: "Privatsphäre & Sicherheit", pageName: "privacy_security", icon: <IconLock /> },
  { key: "address", label: "Adresse", pageName: "addresses", icon: <IconHome /> },
  { key: "signature", label: "Signatur", pageName: "signature", icon: <IconPen /> },
];

const GENERAL: Item[] = [
  { key: "licenses", label: "Lizenzen", pageName: "licences", icon: <IconInfo /> },
  { key: "legal", label: "Rechtliche Informationen", pageName: "legal_entity", icon: <IconBank /> },
  { key: "contact", label: "Kontaktieren Sie uns", pageName: "contact_us", icon: <IconHeadset /> },
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

  // Initials: first letter of first + last name (falls back to the email).
  const initials = (name ?? email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[var(--color-kobil-surface)]">
      <h1 className="sr-only">Profil und Einstellungen</h1>

      {/* Navy brand header — colour is themeable via --color-kobil-header. */}
      <header className="relative h-[150px] bg-[var(--color-kobil-header)]">
        <p className="pt-[22px] text-center text-[15px] font-semibold uppercase tracking-[0.2em] text-white">
          Profil
        </p>
      </header>

      {/* White card overlapping the header; the avatar centre is pinned to the
          card's top edge so it sits exactly half on the navy, half on white. */}
      <section className="relative -mt-[28px] rounded-t-[30px] bg-[var(--color-kobil-surface)] px-[22px] pb-4 pt-[60px]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[5px] border-white bg-[#e6e8ee] text-3xl font-semibold text-[#7b8499]"
        >
          {initials || "K"}
        </div>

        <Link
          href="/profile"
          aria-label="Profil bearbeiten"
          className="absolute right-3 top-[30px] flex h-10 w-10 items-center justify-center rounded-xl text-[var(--color-kobil-primary)] transition-colors hover:bg-[var(--color-kobil-ghost)]"
        >
          <IconPencilEdit />
        </Link>

        <div className="text-center">
          <p className="truncate text-lg font-semibold text-[var(--color-kobil-navy)]">
            {name ?? "Angemeldet"}
          </p>
          {email && (
            <p className="mt-0.5 truncate text-sm text-[var(--color-kobil-text-muted)]">{email}</p>
          )}
        </div>

        <MenuGroup title="Einstellungen">
          {SETTINGS.map((it) => (
            <MenuRow key={it.key} item={it} onActivate={open} />
          ))}
        </MenuGroup>

        <MenuGroup title="Allgemein">
          {GENERAL.map((it) => (
            <MenuRow key={it.key} item={it} onActivate={open} />
          ))}
        </MenuGroup>

        <div className="mt-7 flex justify-center">
          <a
            href="/api/auth/logout"
            className="inline-flex min-h-[var(--tap-kobil)] items-center justify-center rounded-full border border-[var(--color-kobil-border)] bg-[var(--color-kobil-surface)] px-9 text-sm font-semibold uppercase tracking-wide text-[var(--color-kobil-navy)] transition-colors hover:bg-[var(--color-kobil-surface-muted)]"
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
      </section>
    </main>
  );
}

function MenuGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="pb-1 text-lg font-semibold text-[var(--color-kobil-navy)]">{title}</h2>
      <ul>{children}</ul>
    </section>
  );
}

function MenuRow({ item, onActivate }: { item: Item; onActivate: (i: Item) => void }) {
  return (
    <li className="border-b border-[var(--color-kobil-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => onActivate(item)}
        className="flex min-h-[var(--tap-kobil)] w-full items-center gap-[14px] py-[15px] text-left transition-colors hover:bg-[var(--color-kobil-surface-muted)]"
      >
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-kobil-border)] text-[var(--color-kobil-navy)]">
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 text-base text-[var(--color-kobil-navy)]">{item.label}</span>
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
function IconLock() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><rect {...sw} x="5" y="11" width="14" height="9" rx="2" /><path {...sw} d="M8 11V8a4 4 0 018 0v3" /><path {...sw} d="M12 15v2" /></svg>;
}
function IconHome() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M4 11l8-6 8 6" /><path {...sw} d="M6 10v9a1 1 0 001 1h10a1 1 0 001-1v-9" /></svg>;
}
function IconPen() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M4 20h4l10-10-4-4L4 16v4z" /><path {...sw} d="M13.5 6.5l4 4" /></svg>;
}
function IconInfo() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><circle {...sw} cx="12" cy="12" r="9" /><path {...sw} d="M12 11v5" /><path {...sw} d="M12 8h.01" /></svg>;
}
function IconBank() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M4 9l8-5 8 5M5 9v8m4-8v8m6-8v8m4-8v8M3 20h18" /></svg>;
}
function IconHeadset() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path {...sw} d="M5 13v-1a7 7 0 0114 0v1" /><rect {...sw} x="3" y="13" width="4" height="6" rx="1.5" /><rect {...sw} x="17" y="13" width="4" height="6" rx="1.5" /><path {...sw} d="M19 19a4 4 0 01-4 3h-2" /></svg>;
}
function IconPencilEdit() {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><path {...sw} d="M4 20h4l9.5-9.5a2.1 2.1 0 00-3-3L5 17v3z" /><path {...sw} d="M13.5 6.5l4 4" /></svg>;
}
