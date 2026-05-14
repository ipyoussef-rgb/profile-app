import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const PROFILE_VISIBILITY = ["private", "miniapps", "public"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

const isValidLocale = (s: string) => {
  try {
    new Intl.Locale(s);
    return true;
  } catch {
    return false;
  }
};

export const addressSchema = z
  .object({
    street: z.string().trim().max(120).optional(),
    locality: z.string().trim().max(80).optional(),
    postal_code: z.string().trim().max(20).optional(),
    country: z
      .string()
      .trim()
      .length(2, "country must be ISO 3166-1 alpha-2")
      .regex(/^[A-Z]{2}$/, "country must be uppercase ISO 3166-1 alpha-2")
      .optional(),
  })
  .strict();

export const notificationPrefsSchema = z
  .object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
  })
  .strict();

export const privacySettingsSchema = z
  .object({
    show_email: z.boolean().optional(),
    show_phone: z.boolean().optional(),
  })
  .strict();

// PATCH /me/profile — app-managed fields ONLY. Identity attributes (firstName,
// lastName, email, phone, address, locale, birthdate, …) flow through
// /api/me/idp/profile and the KOBIL updateProfileUser endpoint instead.
export const profileUpdateSchema = z
  .object({
    display_name: z.string().trim().max(80).optional(),
    avatar_url: z.string().url().max(2048).optional(),
    profile_visibility: z.enum(PROFILE_VISIBILITY).optional(),
    notification_preferences: notificationPrefsSchema.optional(),
    privacy_settings: privacySettingsSchema.optional(),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// IDP-managed attributes that this app proxies to KOBIL updateProfileUser.
// Validated server-side before the IDP call.
export const idpProfileUpdateSchema = z
  .object({
    first_name: z.string().trim().max(80).optional(),
    last_name: z.string().trim().max(80).optional(),
    phone: z
      .string()
      .refine((s) => isValidPhoneNumber(s), "invalid E.164 phone number")
      .optional(),
    locale: z.string().refine(isValidLocale, "invalid BCP 47 locale").optional(),
    birthdate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
      .optional(),
    address: addressSchema.optional(),
  })
  .strict();

export type IdpProfileUpdateInput = z.infer<typeof idpProfileUpdateSchema>;

// Fields the user must never edit through PATCH /me/profile.
export const FORBIDDEN_PROFILE_KEYS = [
  "email",
  "username",
  "preferred_username",
  "password",
  "roles",
  "groups",
  "email_verified",
  "mfa",
  "otp",
  "birthdate",
  "phone",
  "locale",
  "address",
  "first_name",
  "last_name",
  "firstName",
  "lastName",
] as const;

/** Parse a birthdate in either DD.MM.YYYY (KOBIL's stored format) or
 *  YYYY-MM-DD (HTML date input format) into {y, m, d}. */
function parseBirthdate(s: string): { y: number; m: number; d: number } | null {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return { y: +m[1]!, m: +m[2]!, d: +m[3]! };
  m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (m) return { y: +m[3]!, m: +m[2]!, d: +m[1]! };
  return null;
}

/** Convert KOBIL DD.MM.YYYY → ISO YYYY-MM-DD for the HTML date input. */
export function birthdateToIsoForInput(s: string | null | undefined): string | null {
  if (!s) return null;
  const p = parseBirthdate(s);
  if (!p) return null;
  return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Convert HTML date input (YYYY-MM-DD) → KOBIL DD.MM.YYYY for write. */
export function birthdateIsoToKobil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const p = parseBirthdate(iso);
  if (!p) return null;
  return `${String(p.d).padStart(2, "0")}.${String(p.m).padStart(2, "0")}.${String(p.y).padStart(4, "0")}`;
}

/** Compute age-over-N booleans from a birthdate (any supported format).
 *  Server-side derived each render — birthdate itself is never stored locally. */
export function ageOverFromBirthdate(
  birthdate: string | null | undefined,
): { over_16: boolean | null; over_18: boolean | null } {
  if (!birthdate) return { over_16: null, over_18: null };
  const p = parseBirthdate(birthdate);
  if (!p) return { over_16: null, over_18: null };
  const now = new Date();
  const age =
    now.getUTCFullYear() -
    p.y -
    (now.getUTCMonth() + 1 < p.m || (now.getUTCMonth() + 1 === p.m && now.getUTCDate() < p.d) ? 1 : 0);
  return { over_16: age >= 16, over_18: age >= 18 };
}
