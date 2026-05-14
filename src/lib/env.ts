import { z } from "zod";

const schema = z.object({
  KOBIL_IDP_ISSUER: z.string().url(),
  KOBIL_REALM: z.string().min(1).optional(),
  KOBIL_TENANT: z.string().min(1).optional(),
  KOBIL_MINIAPP_CLIENT_ID: z.string().min(1),
  KOBIL_MINIAPP_CLIENT_SECRET: z.string().min(1),
  KOBIL_SERVICE_CLIENT_ID: z.string().min(1).optional(),
  KOBIL_SERVICE_CLIENT_SECRET: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  APP_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  PRIVACY_NOTICE_VERSION: z.string().default("2026-05-14"),
  PROFILE_EMBED_MODE: z
    .union([z.literal("1"), z.literal("")])
    .optional()
    .transform((v) => v === "1"),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
