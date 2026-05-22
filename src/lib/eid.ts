// Helpers for the eID flow (AusweisApp + eID-Server via PAOS).
//
// The flow:
//   1. Browser POSTs /api/eid/start → we sign a short-lived JWT carrying the
//      user's sub and a nonce. We return the AusweisApp eID-Client URL
//      pointing at /api/eid/tctoken?sid=<jwt>.
//   2. Browser navigates to http://127.0.0.1:24727/eID-Client?tcTokenURL=…
//      AusweisApp fetches our TcToken endpoint.
//   3. TcToken XML carries the eID-Server's PAOS endpoint + our
//      RefreshAddress (/api/eid/refresh?sid=<jwt>).
//   4. AusweisApp ↔ eID-Server PAOS exchange; user holds the card + PIN.
//   5. eID-Server posts the verified attributes to /api/eid/result (out of
//      band) and AusweisApp redirects the browser to RefreshAddress.
//   6. /api/eid/refresh marks the session done and redirects to /profile.
//
// Without a real eID-Server (Berechtigungszertifikat), step 4–5 don't produce
// real data. Set EID_DEV_MOCK=1 to make /api/eid/dev-mock-complete fill the
// verification with test data so the UX is testable end-to-end.

import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const ISSUER = "profile-app/eid";
const TTL_SECONDS = 60 * 10; // 10 min — enough for a user to read the PIN dialog

export type EidSession = {
  sub: string; // user_id (KOBIL sub)
  nonce: string;
};

function key() {
  return new TextEncoder().encode(`eid:${env().AUTH_SECRET}`);
}

export async function signEidSession(payload: EidSession): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key());
}

export async function verifyEidSession(token: string): Promise<EidSession | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER });
    if (typeof payload.sub !== "string" || typeof payload.nonce !== "string") return null;
    return { sub: payload.sub, nonce: payload.nonce };
  } catch {
    return null;
  }
}

/** Build the AusweisApp eID-Client URL the browser should navigate to. */
export function eidClientUrl(tcTokenUrl: string): string {
  // The AusweisApp listens on 127.0.0.1:24727 on the user's machine.
  // Per https://www.ausweisapp.bund.de/sdk/commands.html the eID-Client
  // entry-point takes a tcTokenURL query parameter (URL-encoded).
  return `http://127.0.0.1:24727/eID-Client?tcTokenURL=${encodeURIComponent(tcTokenUrl)}`;
}

/** Map raw eID-Server attribute keys to our DB columns. */
export type EidResultAttributes = Partial<{
  GivenNames: string;
  FamilyNames: string;
  DateOfBirth: string; // DD.MM.YYYY
  PlaceOfBirth: string;
  PlaceOfResidence: {
    Street?: string;
    City?: string;
    ZipCode?: string;
    Country?: string;
  };
}>;

export function attributesToDbColumns(a: EidResultAttributes) {
  return {
    given_names: a.GivenNames ?? null,
    family_names: a.FamilyNames ?? null,
    date_of_birth: a.DateOfBirth ?? null,
    place_of_birth: a.PlaceOfBirth ?? null,
    street: a.PlaceOfResidence?.Street ?? null,
    city: a.PlaceOfResidence?.City ?? null,
    zip_code: a.PlaceOfResidence?.ZipCode ?? null,
    country: a.PlaceOfResidence?.Country ?? null,
  };
}
