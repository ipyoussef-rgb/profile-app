"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KobilLogo } from "./KobilLogo";
import { openAdminMenu } from "@/lib/host-bridge";

const LONG_PRESS_MS = 700;

/** Footer under the logout button: "Powered by" + the KOBIL logo.
 *  Long-pressing the logo opens the host's admin menu — a deliberately hidden
 *  gesture, so it is not advertised anywhere in the UI. */
export function BrandFooter() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [announce, setAnnounce] = useState("");

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Always clear on unmount so a pending timer can't fire against a gone tree.
  useEffect(() => clear, [clear]);

  const start = useCallback(() => {
    clear();
    timer.current = setTimeout(() => {
      timer.current = null;
      const how = openAdminMenu();
      // Only confirm when a host actually took the call; in a plain browser the
      // gesture stays silent so it gives nothing away.
      if (how !== "none" && how !== "error") {
        setAnnounce("Admin-Menü wird in der KOBIL Super App geöffnet.");
      }
    }, LONG_PRESS_MS);
  }, [clear]);

  return (
    <footer className="mt-10 flex flex-col items-center gap-2 text-center">
      <p className="text-xs text-[var(--color-kobil-text-muted)]">Powered by</p>

      <button
        type="button"
        // The gesture is the whole point, so a plain click does nothing. Keyboard
        // users get the same affordance by holding Enter/Space.
        onPointerDown={start}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={clear}
        onBlur={clear}
        // Long-press on touch otherwise raises the selection / context menu.
        onContextMenu={(e) => e.preventDefault()}
        aria-label="KOBIL — lange drücken für das Admin-Menü"
        className="select-none rounded-lg p-1 [touch-action:manipulation] [-webkit-touch-callout:none]"
      >
        <KobilLogo className="h-8" />
      </button>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </footer>
  );
}
