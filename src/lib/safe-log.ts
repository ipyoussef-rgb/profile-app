// Minimal safe-logging helper. Used for server-side console events.
// Never log access tokens, full phone numbers, addresses, or free-text fields.

const REDACTED = "[REDACTED]";

const REDACT_KEYS = new Set([
  "access_token",
  "refresh_token",
  "id_token",
  "authorization",
  "password",
  "client_secret",
  "phone",
  "address",
  "bio",
  "display_name",
  "email",
  "birthdate",
]);

export function redact<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.has(k.toLowerCase())) out[k] = REDACTED;
      else out[k] = redact(v);
    }
    return out as unknown as T;
  }
  return value;
}

export function logEvent(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
) {
  const safe = meta ? redact(meta) : undefined;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...(safe ? { meta: safe } : {}),
  });
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](line);
}
