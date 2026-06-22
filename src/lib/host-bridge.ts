// KOBIL Super App WebView bridge (client-side only).
//
// This profile-app variant uses the bridge ONLY to open native settings
// screens — profile data comes from the authenticated server session, not the
// bridge. Confirmed host contract:
//
//   openProfileSection({ pageName }) → opens a native screen, returns void.
//     pageName ∈ account | privacy_security | addresses | signature |
//     contact_us | legal_entity | licences.
//
// The host may attach this in several ways and the mini-app may run in an
// iframe (bridge on window.parent / window.top), so we probe across scopes AND
// invocation conventions: direct global fn, named namespace, Android
// addJavascriptInterface (string arg), iOS WKWebView messageHandlers, Flutter
// callHandler, React Native postMessage, and finally a postMessage to the
// parent frame. Everything is a no-op in a plain browser (by design).

type AnyObj = Record<string, unknown>;

export type ProfilePage =
  | "account"
  | "privacy_security"
  | "addresses"
  | "signature"
  | "contact_us"
  | "legal_entity"
  | "licences";

const NAMESPACES = ["kobil", "KOBIL", "KobilSuperApp", "SuperApp", "kobilBridge", "KobilBridge"];
const ANDROID_NAMES = ["AndroidBridge", "Android", "NativeBridge"];

/** Window-like scopes to search: current frame, parent, top. Cross-origin
 *  access throws, so each is guarded. */
function windows(): { w: Window; label: string }[] {
  if (typeof window === "undefined") return [];
  const out: { w: Window; label: string }[] = [{ w: window, label: "window" }];
  for (const [label, get] of [
    ["parent", () => window.parent] as const,
    ["top", () => window.top] as const,
  ]) {
    try {
      const w = get();
      if (w && w !== window && !out.some((o) => o.w === w)) out.push({ w, label });
    } catch {
      /* cross-origin — skip */
    }
  }
  return out;
}

type FnHit = { fn: (...a: unknown[]) => unknown; android: boolean; where: string };

function findFn(name: string): FnHit | null {
  for (const { w, label } of windows()) {
    const wo = w as unknown as AnyObj;
    if (typeof wo[name] === "function") {
      return { fn: (wo[name] as (...a: unknown[]) => unknown).bind(wo), android: false, where: label };
    }
    for (const ns of NAMESPACES.concat(ANDROID_NAMES)) {
      const obj = wo[ns] as AnyObj | undefined;
      if (obj && typeof obj[name] === "function") {
        return {
          fn: (obj[name] as (...a: unknown[]) => unknown).bind(obj),
          android: ANDROID_NAMES.includes(ns),
          where: `${label}.${ns}`,
        };
      }
    }
  }
  return null;
}

function iosHandler(name: string): { postMessage: (m: unknown) => void } | null {
  for (const { w } of windows()) {
    const wk = (w as unknown as AnyObj).webkit as AnyObj | undefined;
    const h = (wk?.messageHandlers as AnyObj | undefined)?.[name] as
      | { postMessage?: (m: unknown) => void }
      | undefined;
    if (h && typeof h.postMessage === "function") return h as { postMessage: (m: unknown) => void };
  }
  return null;
}

function flutter(): ((name: string, ...a: unknown[]) => Promise<unknown>) | null {
  for (const { w } of windows()) {
    const f = (w as unknown as AnyObj).flutter_inappwebview as AnyObj | undefined;
    if (f && typeof f.callHandler === "function") {
      return (f.callHandler as (name: string, ...a: unknown[]) => Promise<unknown>).bind(f);
    }
  }
  return null;
}

function reactNative(): { postMessage: (m: string) => void } | null {
  const rn = (window as unknown as AnyObj | undefined)?.ReactNativeWebView as
    | { postMessage?: (m: string) => void }
    | undefined;
  return rn && typeof rn.postMessage === "function" ? (rn as { postMessage: (m: string) => void }) : null;
}

/** True if any recognizable host bridge is present (i.e. we're embedded). */
export function isEmbedded(): boolean {
  return Boolean(
    findFn("openProfileSection") ||
      findFn("getUserInfo") ||
      iosHandler("openProfileSection") ||
      flutter() ||
      reactNative(),
  );
}

/** Open a native Super App screen. Returns a short description of HOW it was
 *  dispatched (for diagnostics); "none" when no bridge was reachable. */
export function openProfileSection(pageName: ProfilePage): string {
  const obj = { pageName };
  const str = JSON.stringify(obj);
  try {
    const hit = findFn("openProfileSection");
    if (hit) {
      hit.fn(hit.android ? str : obj);
      return `fn:${hit.where}${hit.android ? "(str)" : "(obj)"}`;
    }
    const ios = iosHandler("openProfileSection");
    if (ios) {
      ios.postMessage(obj);
      return "ios";
    }
    const fl = flutter();
    if (fl) {
      fl("openProfileSection", obj);
      return "flutter";
    }
    const rn = reactNative();
    if (rn) {
      rn.postMessage(JSON.stringify({ handler: "openProfileSection", ...obj }));
      return "reactNative";
    }
    let posted = false;
    for (const { w } of windows()) {
      if (w !== window) {
        w.postMessage({ type: "openProfileSection", ...obj }, "*");
        posted = true;
      }
    }
    return posted ? "postMessage:parent" : "none";
  } catch {
    return "error";
  }
}

/** Snapshot of which bridge endpoints are detected — powers the ?debug overlay
 *  so integration issues are visible instead of silent. */
export function bridgeDiagnostics(): {
  embedded: boolean;
  inIframe: boolean;
  scopes: number;
  openProfileSection: string | null;
  ios: string[];
  flutter: boolean;
  reactNative: boolean;
} {
  let inIframe = false;
  try {
    inIframe = typeof window !== "undefined" && window.parent !== window;
  } catch {
    inIframe = true;
  }
  const ops = findFn("openProfileSection");
  const ios: string[] = [];
  if (iosHandler("openProfileSection")) ios.push("openProfileSection");
  return {
    embedded: isEmbedded(),
    inIframe,
    scopes: windows().length,
    openProfileSection: ops ? ops.where : null,
    ios,
    flutter: Boolean(flutter()),
    reactNative: Boolean(reactNative()),
  };
}
