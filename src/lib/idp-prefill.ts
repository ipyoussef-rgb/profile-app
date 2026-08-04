// Server-side helper that loads identity attributes from KOBIL Identity
// via getUserInfo and shapes them for the Profile UI. Returns null when the
// service client isn't configured (admin-side feature) — pages should fall
// back to token-level fields in that case.

import {
  getUserFromIdp,
  KobilIdpNotConfiguredError,
  readIdpAttribute,
} from "./kobil-idp";
import { birthdateToIsoForInput } from "./schemas/profile";
import { logEvent } from "./safe-log";

export type IdpProfileSnapshot = {
  configured: boolean;
  found: boolean;
  data: {
    title: string | null;
    first_name: string | null;
    last_name: string | null;
    gender: string | null;
    username: string | null;
    email: string | null;
    email_verified: boolean | null;
    phone: string | null;
    fax: string | null;
    birthdate: string | null;
    address: {
      organization: string | null;
      street: string | null;
      supplement: string | null;
      locality: string | null;
      postal_code: string | null;
      country: string | null;
    };
  };
};

const EMPTY: IdpProfileSnapshot["data"] = {
  title: null,
  first_name: null,
  last_name: null,
  gender: null,
  username: null,
  email: null,
  email_verified: null,
  phone: null,
  fax: null,
  birthdate: null,
  address: {
    organization: null,
    street: null,
    supplement: null,
    locality: null,
    postal_code: null,
    country: null,
  },
};

/** Pass the user's email — the KOBIL v3_user endpoint is keyed by email,
 *  not by UUID sub. If `email` is empty/undefined, returns an empty snapshot. */
export async function loadIdpProfile(email: string | undefined): Promise<IdpProfileSnapshot> {
  if (!email) return { configured: true, found: false, data: EMPTY };
  try {
    const u = await getUserFromIdp(email);
    if (!u) {
      logEvent("warn", "idp_prefill_user_not_found_in_idp", { email_hint: email.slice(0, 3) + "***" });
      return { configured: true, found: false, data: EMPTY };
    }
    return {
      configured: true,
      found: true,
      data: {
        title: readIdpAttribute(u, "title") ?? null,
        first_name: u.firstName ?? readIdpAttribute(u, "firstName", "given_name") ?? null,
        last_name: u.lastName ?? readIdpAttribute(u, "lastName", "family_name") ?? null,
        gender: readIdpAttribute(u, "gender") ?? null,
        username: u.username ?? null,
        email: u.email ?? null,
        email_verified: u.emailVerified ?? null,
        phone: readIdpAttribute(u, "phone", "phone_number", "phoneNumber") ?? null,
        fax: readIdpAttribute(u, "faxNumber", "fax_number", "fax") ?? null,
        // KOBIL stores birthdate as DD.MM.YYYY — normalize to ISO so the
        // HTML <input type="date"> can prefill correctly. The age helper
        // accepts both formats.
        birthdate:
          birthdateToIsoForInput(
            readIdpAttribute(u, "birthdate", "bod", "birthDate"),
          ) ?? null,
        address: {
          organization: readIdpAttribute(u, "companyOrganizationName", "organization") ?? null,
          street: readIdpAttribute(u, "street", "street_address") ?? null,
          supplement:
            readIdpAttribute(u, "homeAddressSupplement", "home_address_supplement") ?? null,
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
