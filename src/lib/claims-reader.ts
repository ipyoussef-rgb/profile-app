// Defensive reader for KOBIL Identity claim payloads, which may emit attributes
// either flat or wrapped under `attributes.{key}[0]` (Keycloak admin shape).
// See: memory `reference_kobil_oidc_setup.md`.

export function readClaim(raw: Record<string, unknown>, ...names: string[]): string | undefined {
  const attrs = (raw["attributes"] ?? {}) as Record<string, unknown>;
  for (const name of names) {
    for (const v of [raw[name], attrs[name]]) {
      if (typeof v === "string" && v.length > 0) return v;
      if (Array.isArray(v) && typeof v[0] === "string" && v[0].length > 0) return v[0];
    }
  }
  return undefined;
}
