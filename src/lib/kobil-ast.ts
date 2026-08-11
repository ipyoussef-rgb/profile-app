import type { KobilIdpUser } from "./kobil-idp";

/* The AST (KOBIL app/device) clients a user has linked are not exposed as an
 * attribute VALUE anywhere. KOBIL Identity records each link as an attribute
 * whose KEY carries the client id and whose value is the link timestamp:
 *
 *   "AST_CLIENT_ID_01KXK8BEV12Q9A4ZVBHTBXCBTX_LINKED_TIMESTAMP": ["1786…"]
 *                  └────────── the client id ──────────┘
 *
 * So the id has to be parsed out of the key — reading values gets you the
 * timestamps only. A user can have several linked clients (one per device /
 * reinstall), which is why this returns a list, newest first.
 */
const AST_LINK_KEY = /^AST_CLIENT_ID_(.+?)_LINKED_TIMESTAMP$/i;

export type AstClientLink = {
  /** The AST client id, e.g. "01KXK8BEV12Q9A4ZVBHTBXCBTX" (a ULID). */
  clientId: string;
  /** Epoch millis from the attribute value, or null when unparseable. KOBIL has
   *  been seen writing both seconds and millis, so seconds are scaled up. */
  linkedAt: number | null;
};

function firstValue(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].length > 0) return v[0];
  return undefined;
}

function toEpochMillis(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  // A 10-digit value is seconds; anything longer is already millis.
  return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
}

/** Every AST client linked to this user, newest link first. Links without a
 *  usable timestamp sort last — present but undatable. */
export function astClientLinks(user: KobilIdpUser): AstClientLink[] {
  const attrs = user.attributes ?? {};
  const links: AstClientLink[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    const m = AST_LINK_KEY.exec(key);
    if (!m?.[1]) continue;
    links.push({ clientId: m[1], linkedAt: toEpochMillis(firstValue(value)) });
  }
  return links.sort((a, b) => (b.linkedAt ?? -1) - (a.linkedAt ?? -1));
}

/** The AST client id to present to KOBIL Identity: the most recently linked one,
 *  which is the device the user is realistically holding. */
export function newestAstClientId(user: KobilIdpUser): string | null {
  return astClientLinks(user)[0]?.clientId ?? null;
}
