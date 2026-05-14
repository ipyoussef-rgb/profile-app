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

/** Compute age-over-N booleans from a YYYY-MM-DD birthdate, server-side.
 *  We never store the birthdate locally — this runs each render off the
 *  IDP getUserInfo response. */
export function ageOverFromBirthdate(
  birthdate: string | null | undefined,
): { over_16: boolean | null; over_18: boolean | null } {
  if (!birthdate || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    return { over_16: null, over_18: null };
  }
  const [y, m, d] = birthdate.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return { over_16: null, over_18: null };
  const now = new Date();
  const age =
    now.getUTCFullYear() -
    y -
    (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d) ? 1 : 0);
  return { over_16: age >= 16, over_18: age >= 18 };
}
