import { z } from "zod";

const schema = z.object({
  KOBIL_IDP_ISSUER: z.string().url(),
  // KOBIL Identity realm (a.k.a. tenant — the same value in this setup).
  KOBIL_REALM: z.string().min(1).optional(),
  KOBIL_MINIAPP_CLIENT_ID: z.string().min(1),
  KOBIL_MINIAPP_CLIENT_SECRET: z.string().min(1),
  KOBIL_ADMIN_CLIENT_ID: z.string().min(1).optional(),
  KOBIL_ADMIN_CLIENT_SECRET: z.string().min(1).optional(),
  KOBIL_SERVICE_CLIENT_ID: z.string().min(1).optional(),
  KOBIL_SERVICE_CLIENT_SECRET: z.string().min(1).optional(),
  KOBIL_IDP_USERS_API: z.string().url().optional(),
  KOBIL_ADMIN_ROLE: z.string().default("profile_admin"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  APP_BASE_URL: z.string().url(),
  // Post-logout target for the profile (user) logout. Empty => app root.
  // Set to the KOBIL Super-App deep link; must be registered in the login
  // client's Valid Post Logout Redirect URIs.
  OIDC_POST_LOGOUT_REDIRECT_URI: z.string().optional(),
  PROFILE_DATABASE_URL: z.string().min(1),
  PRIVACY_NOTICE_VERSION: z.string().default("2026-05-14"),
  PROFILE_EMBED_MODE: z
    .union([z.literal("1"), z.literal("")])
    .optional()
    .transform((v) => v === "1"),
  // Brand colours, overridable from the Helm chart's `theme.*` values without a
  // rebuild. Empty/unset → the app's built-in defaults in globals.css. Injected
  // as CSS custom properties by the root layout (validated as CSS colours there).
  THEME_HEADER_COLOR: z.string().optional(),
  THEME_PRIMARY_COLOR: z.string().optional(),
  THEME_NAVY_COLOR: z.string().optional(),
  // Grace periods before returning to a backgrounded WebView resets the view to
  // the start page (see components/layout/ResumeToStart.tsx). Kept as strings so
  // a typo in the chart falls back to the defaults instead of refusing to boot.
  PROFILE_RESUME_RESET_SECONDS: z.string().optional(),
  PROFILE_RESUME_RESET_DIRTY_SECONDS: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

// KOBIL deploys this app via a generic ks-chart-template-common Helm chart
// whose envFromConfigmap/Secret uses OIDC_* names. Map those aliases onto our
// KOBIL_* names before validation so the same code runs on Vercel (KOBIL_*)
// and in the KOBIL cluster (OIDC_*) without duplicating config.
const KOBIL_ALIASES: Record<string, string> = {
  KOBIL_IDP_ISSUER: "OIDC_DISCOVERY_URL",
  KOBIL_MINIAPP_CLIENT_ID: "OIDC_CLIENT_ID",
  KOBIL_MINIAPP_CLIENT_SECRET: "OIDC_CLIENT_SECRET",
};

function applyKobilAliases() {
  for (const [primary, alias] of Object.entries(KOBIL_ALIASES)) {
    if (!process.env[primary] && process.env[alias]) {
      process.env[primary] = process.env[alias];
    }
  }
}

export function env() {
  if (cached) return cached;
  applyKobilAliases();
  // The Helm chart carries EVERY config key (incl. optional ones) so they show
  // up in values.yaml, defaulting them to "". But our optional fields are
  // `z.string().min(1).optional()`, which reject "" (only `undefined` passes).
  // Treat an empty-string env var as "unset" so an empty chart default doesn't
  // crash the app on boot. Required fields still fail (now as "Required").
  const raw: Record<string, string | undefined> = { ...process.env };
  for (const k of Object.keys(raw)) {
    if (raw[k] === "") raw[k] = undefined;
  }
  // KOBIL_IDP_ISSUER must be the BARE realm issuer — the app appends
  // /.well-known/openid-configuration (discovery), /protocol/openid-connect/token
  // (service-client token), and /v3_user (Users API) itself. The chart field is
  // called OIDC_DISCOVERY_URL, so deployers naturally paste the full discovery
  // URL; strip that suffix (and trailing slashes) so every consumer gets the
  // issuer and the service-token / getUserInfo calls don't 404.
  if (raw.KOBIL_IDP_ISSUER) {
    raw.KOBIL_IDP_ISSUER = raw.KOBIL_IDP_ISSUER
      .replace(/\/+\.well-known\/openid-configuration\/?$/i, "")
      .replace(/\/+$/, "");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

function seconds(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

/** How long the mini-app may sit in the background before a return resets the
 *  view to the start page. Two periods, because the cost of resetting is not the
 *  same in both cases: with nothing typed there is nothing to lose, while a
 *  half-filled form should survive a short detour to look something up.
 *  Both tunable from the chart without an app rebuild; 0/0 disables the reset. */
export function resumeResetGrace(): { pristine: number; dirty: number } {
  const e = env();
  return {
    pristine: seconds(e.PROFILE_RESUME_RESET_SECONDS, 30),
    dirty: seconds(e.PROFILE_RESUME_RESET_DIRTY_SECONDS, 180),
  };
}
