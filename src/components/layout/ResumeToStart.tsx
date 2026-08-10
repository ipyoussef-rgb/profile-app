"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/* Send the mini-app back to its start page when the user returns after leaving.
 *
 * In the KOBIL Super App this app lives in a WebView the host does not throw
 * away when the user switches to something else, so the page they left is the
 * page they come back to — after a detour they'd find "Profil bearbeiten" open
 * instead of the menu. There is no inbound host-bridge channel that tells us we
 * were re-opened (src/lib/host-bridge.ts only dispatches outwards), so we infer
 * it from one quantity: wall-clock milliseconds during which we were not on
 * screen. `aliveAt` is the last moment we know we were, and only a drawn frame
 * advances it. Three layers feed the same check, and none of them can suppress
 * another — an event may only ever TRIGGER a check:
 *
 *  1. COLD DOCUMENT. Android WebView.saveState() keeps only the back/forward
 *     list, and iOS terminates the WKWebView content process after a while in
 *     the background. Either way the host re-fetches the last URL and we get a
 *     brand-new document with NO event of any kind on the way back. The only
 *     witness is a timestamp that outlived the document, hence localStorage
 *     (sessionStorage is scoped to the browsing context and dies with it).
 *  2. FRAME CLOCK. requestAnimationFrame stops while the WebView is not being
 *     drawn, so a gap between frames IS the measurement — no event needed.
 *     Deliberately not setInterval: Android WebView may keep timers running
 *     while hidden, which would keep the stamp fresh and hide the absence.
 *  3. LIFECYCLE EVENTS where the host provides them — the fast path, so the
 *     reset lands sooner. visibilitychange is host-dependent in Android WebView
 *     (it follows View visibility, not app foreground state) and unreliable in
 *     WKWebView, and pageshow.persisted is never true in Android WebView, so
 *     these are a bonus, never the mechanism.
 *
 * Every layer fails toward "show the start page", which is the wanted behaviour
 * anyway. Elapsed time is measured with Date.now() throughout, never with the
 * rAF timestamp: the performance.now() clock is not guaranteed to advance while
 * the process is suspended, which is precisely the interval we need to measure.
 *
 * The real fix belongs one level down: the host loading the mini-app's entry URL
 * on resume instead of restoring the saved back/forward list. This is the
 * web-side mitigation for as long as it does not.
 */

const LAST_SEEN_KEY = "kobil.profile.lastSeenAt";
const DETOUR_KEY = "kobil.profile.detourAt";
const DISCARDED_KEY = "kobil.profile.changesDiscarded";

/** How often the frame pulse persists `aliveAt`. Cheap, and far below any
 *  sensible grace period — it bounds how much of the absence we can miss. */
const HEARTBEAT_MS = 4_000;

/** A deliberate detour (the headless Keycloak round trip) is honoured for this
 *  long. Bounded so a marker can never get stuck and disable the reset for good
 *  — the WebView cookie jar taught us that lesson (see /api/auth/reset). */
const DETOUR_TTL_MS = 15 * 60 * 1_000;

// WKWebView with a non-persistent data store exposes localStorage and throws on
// write, so probe once and degrade quietly to "no memory across documents".
let probed: Storage | null | undefined;
function storage(): Storage | null {
  if (probed !== undefined) return probed;
  try {
    const s = window.localStorage;
    s.setItem("kobil.probe", "1");
    s.removeItem("kobil.probe");
    probed = s;
  } catch {
    probed = null;
  }
  return probed;
}

function write(key: string, value: string) {
  try {
    storage()?.setItem(key, value);
  } catch {
    /* quota / private mode — the guard just loses its cross-document memory */
  }
}

function clear(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readAt(key: string): number | null {
  const raw = storage()?.getItem(key);
  if (!raw) return null;
  const n = Number(raw.split(":")[0]);
  return Number.isFinite(n) ? n : null;
}

/** The last-seen stamp carries the unsaved-work bit with it (`<epoch>` or
 *  `<epoch>:d`) so the two can never drift apart: every write sets both. */
function readLastSeen(): { at: number; dirty: boolean } | null {
  const raw = storage()?.getItem(LAST_SEEN_KEY);
  if (!raw) return null;
  const [at, flag] = raw.split(":");
  const n = Number(at);
  return Number.isFinite(n) ? { at: n, dirty: flag === "d" } : null;
}

// Module scope, not component state: the edit form has to reach these from
// outside, and the guard is never mounted twice at once (the start page and
// /profile/* are different route segments).

/** Set by any keystroke: there is unsaved work, so grant the longer grace. */
let dirty = false;

/** Non-zero while a save is in flight. */
let busy = 0;

/** The cold-document check runs once per document, not on every route change.
 *  Without this, a soft navigation in from a surface that runs no heartbeat
 *  (/access-denied links straight to /profile) would read a stamp that is
 *  minutes old and bounce the user out of the page they just opened. */
let coldChecked = false;

/** Memoised so React's dev double-invoke of effects cannot swallow the notice. */
let discardSeen: boolean | null = null;

/** A save succeeded, so the form is no longer unsaved work. Without this a later
 *  reset would tell the user their changes were discarded when they were saved. */
export function markSaved() {
  dirty = false;
}

/** Hold the reset off while a Server Action is in flight — navigating away
 *  aborts the transition, and the user would get neither result. Always call the
 *  `false` side from a `finally` so this cannot latch on. */
export function setBusy(value: boolean) {
  busy = Math.max(0, busy + (value ? 1 : -1));
}

/** Called from the change-email / change-password links: the user is about to
 *  leave for KOBIL Identity on purpose and will be gone a while, so returning
 *  must NOT wipe the form they were filling. */
export function markDeliberateDetour() {
  write(DETOUR_KEY, String(Date.now()));
}

/** True exactly once per document, when a reset discarded unsaved edits — so the
 *  start page can say so instead of losing the input silently. */
export function consumeDiscardedFlag(): boolean {
  if (discardSeen !== null) return discardSeen;
  discardSeen = readAt(DISCARDED_KEY) !== null;
  if (discardSeen) clear(DISCARDED_KEY);
  return discardSeen;
}

export function ResumeToStart({
  pristineSeconds,
  dirtySeconds,
  startPath = "/",
}: {
  /** Grace period when nothing has been typed — there is nothing to lose. */
  pristineSeconds: number;
  /** Grace period once the form is dirty, so stepping out to look up a postcode
   *  doesn't cost the user everything they typed. */
  dirtySeconds: number;
  startPath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (pristineSeconds <= 0 && dirtySeconds <= 0) return; // disabled via chart
    // Mounted on the start page too, purely to keep the pulse running while the
    // user is there — otherwise the stamp would go stale and opening /profile
    // from the menu would look like a return from a long absence.
    const isStartPage = pathname === startPath;

    let done = false;
    let raf = 0;
    let hidden = false;
    let aliveAt = Date.now(); // last moment we know we were on screen
    let persistedAt = 0;

    const graceMs = () => (dirty ? dirtySeconds : pristineSeconds) * 1_000;

    function persist() {
      persistedAt = Date.now();
      write(LAST_SEEN_KEY, `${persistedAt}${dirty ? ":d" : ""}`);
    }

    function reset(lostInput: boolean) {
      if (done || isStartPage) return;
      // A save is in flight: navigating now would abort the transition and the
      // user would never learn whether it worked. aria-busy is already on both
      // save buttons, which covers the attribute picker too without coupling.
      if (busy > 0 || document.querySelector('[aria-busy="true"]')) return;
      const detour = readAt(DETOUR_KEY);
      if (detour !== null && Date.now() - detour < DETOUR_TTL_MS) {
        clear(DETOUR_KEY); // honoured once, then it is spent
        aliveAt = Date.now();
        persist();
        return;
      }
      done = true;
      if (lostInput) write(DISCARDED_KEY, String(Date.now()));
      persist();
      setResetting(true);
      // replace, not push: the Android back gesture must not walk straight back
      // into the page we just left behind.
      router.replace(startPath);
    }

    /** The single decision point. Reached from all three layers. */
    function check() {
      if (Date.now() - aliveAt >= graceMs()) reset(dirty);
    }

    // (1) Cold document — measure from the stamp the previous document left.
    if (!coldChecked) {
      coldChecked = true;
      const prev = readLastSeen();
      // A stamp from the future means the clock jumped; treat it as no evidence.
      if (prev && prev.at <= Date.now()) {
        // The typed input died with the document, so the persisted dirty bit
        // only decides whether to admit the loss — never the grace period.
        if (Date.now() - prev.at >= pristineSeconds * 1_000) reset(prev.dirty);
      }
    }
    aliveAt = Date.now();
    persist();

    // (2) Frame clock — the pulse that defines "on screen".
    const tick = () => {
      if (!hidden) {
        check();
        aliveAt = Date.now();
        if (Date.now() - persistedAt >= HEARTBEAT_MS) persist();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // (3) Lifecycle events. The back side checks BEFORE advancing `aliveAt`, so
    //     it can only ever bring the reset forward, never mask a real gap.
    const onHidden = () => {
      hidden = true;
      persist(); // documented last reliable callback before teardown
    };
    const onVisible = () => {
      hidden = false;
      check();
      aliveAt = Date.now();
    };
    const onVisibilityChange = () =>
      document.visibilityState === "hidden" ? onHidden() : onVisible();

    // A keystroke anywhere means there is unsaved work: grant the longer grace.
    const onEdit = () => {
      dirty = true;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    window.addEventListener("pagehide", onHidden);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus", onVisible);
    // Chromium-only; free to register, never depended on.
    document.addEventListener("freeze", onHidden);
    document.addEventListener("resume", onVisible);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
      window.removeEventListener("pagehide", onHidden);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("freeze", onHidden);
      document.removeEventListener("resume", onVisible);
    };
  }, [dirtySeconds, pristineSeconds, pathname, router, startPath]);

  // Cover the stale page while the navigation lands, so the screen the user came
  // back to isn't the one they're about to leave.
  if (!resetting) return null;
  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-kobil-surface)]">
      <p aria-live="polite" className="sr-only">
        Die Startseite wird geladen.
      </p>
    </div>
  );
}
