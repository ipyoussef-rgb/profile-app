import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const PROFILE_VISIBILITY = ["private", "miniapps", "public"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

const isValidLocale = (s: string) => {
  try {
    // throws on invalid BCP 47
    new Intl.Locale(s);
    return true;
  } catch {
    return false;
  }
};

const isValidTimezone = (s: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s });
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

// PATCH /me/profile body. Strict: any unknown key → 422.
export const profileUpdateSchema = z
  .object({
    display_name: z.string().trim().max(80).optional(),
    avatar_url: z.string().url().max(2048).optional(),
    bio: z.string().trim().max(500).optional(),
    locale: z.string().refine(isValidLocale, "invalid BCP 47 locale").optional(),
    timezone: z.string().refine(isValidTimezone, "invalid IANA timezone").optional(),
    phone: z
      .string()
      .refine((s) => isValidPhoneNumber(s), "invalid E.164 phone number")
      .optional(),
    address: addressSchema.optional(),
    profile_visibility: z.enum(PROFILE_VISIBILITY).optional(),
    notification_preferences: notificationPrefsSchema.optional(),
    privacy_settings: privacySettingsSchema.optional(),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// Fields the user must never edit through this endpoint.
// They are owned by KOBIL Identity OR are verified claims.
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
  "identity_verified",
  "age_over_16",
  "age_over_18",
  "age_over_21",
  "birthdate",
] as const;
