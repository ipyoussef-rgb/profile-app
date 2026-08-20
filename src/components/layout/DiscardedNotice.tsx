"use client";

import { useEffect, useState } from "react";
import { consumeDiscardedFlag } from "./ResumeToStart";

/** Shown once when the resume guard discarded unsaved edits on the way back to
 *  the start page. The edit form is uncontrolled, so a reset really does drop
 *  typed input — losing it silently would be worse than the detour that caused
 *  it. This is the one piece of the removed settings menu that had to survive:
 *  the guard writes the flag and lands the user here expecting it to be read. */
export function DiscardedNotice() {
  const [discarded, setDiscarded] = useState(false);

  useEffect(() => {
    setDiscarded(consumeDiscardedFlag());
  }, []);

  if (!discarded) return null;
  return (
    <p
      role="status"
      className="rounded-[var(--radius-kobil-sm)] bg-[var(--color-kobil-surface)] px-3 py-2 text-[13px] text-[var(--color-kobil-text-muted)]"
    >
      Nicht gespeicherte Änderungen wurden verworfen, weil die App im Hintergrund
      war.
    </p>
  );
}
