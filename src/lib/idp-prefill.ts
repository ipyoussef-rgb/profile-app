// Server-side helper that loads identity attributes from KOBIL Identity
// via getUserInfo and shapes them for the Profile UI. Returns null when the
// service client isn't configured (admin-side feature) — pages should fall
// back to token-level fields in that case.

import {
  getUserFromIdp,
  KobilIdpNotConfiguredError,
  readIdpAttribute,
} from "./kobil-idp";
import { logEvent } from "./safe-log";

export type IdpProfileSnapshot = {
  configured: boolean;
  found: boolean;
  data: {
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    email: string | null;
    email_verified: boolean | null;
    phone: string | null;
    locale: string | null;
    birthdate: string | null;
    address: {
      street: string | null;
      locality: string | null;
      postal_code: string | null;
      country: string | null;
    };
  };
};

const EMPTY: IdpProfileSnapshot["data"] = {
  first_name: null,
  last_name: null,
  username: null,
  email: null,
  email_verified: null,
  phone: null,
  locale: null,
  birthdate: null,
  address: { street: null, locality: null, postal_code: null, country: null },
};

export async function loadIdpProfile(sub: string): Promise<IdpProfileSnapshot> {
  try {
    const u = await getUserFromIdp(sub);
    if (!u) return { configured: true, found: false, data: EMPTY };
    return {
      configured: true,
      found: true,
      data: {
        first_name: u.firstName ?? readIdpAttribute(u, "firstName", "given_name") ?? null,
        last_name: u.lastName ?? readIdpAttribute(u, "lastName", "family_name") ?? null,
        username: u.username ?? null,
        email: u.email ?? null,
        email_verified: u.emailVerified ?? null,
        phone: readIdpAttribute(u, "phone", "phone_number", "phoneNumber") ?? null,
        locale: readIdpAttribute(u, "locale") ?? null,
        birthdate: readIdpAttribute(u, "birthdate", "bod", "birthDate") ?? null,
        address: {
          street: readIdpAttribute(u, "street", "street_address") ?? null,
          locality: readIdpAttribute(u, "locality", "city") ?? null,
          postal_code: readIdpAttribute(u, "postal_code", "postalCode") ?? null,
          country: readIdpAttribute(u, "country", "country_code") ?? null,
        },
      },
    };
  } catch (e) {
    if (e instanceof KobilIdpNotConfiguredError) {
      return { configured: false, found: false, data: EMPTY };
    }
    logEvent("warn", "idp_prefill_failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return { configured: true, found: false, data: EMPTY };
  }
}
