import { z } from "zod";

const schema = z.object({
  KOBIL_IDP_ISSUER: z.string().url(),
  KOBIL_REALM: z.string().min(1).optional(),
  KOBIL_TENANT: z.string().min(1).optional(),
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
  PROFILE_DATABASE_URL: z.string().min(1),
  PRIVACY_NOTICE_VERSION: z.string().default("2026-05-14"),
  PROFILE_EMBED_MODE: z
    .union([z.literal("1"), z.literal("")])
    .optional()
    .transform((v) => v === "1"),
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
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
