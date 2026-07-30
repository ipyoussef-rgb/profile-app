// Option catalogs for the IDP-managed select fields, mirroring the KOBIL
// Identity `user-attributes` config for this realm.
//
// IMPORTANT: the value STORED in KOBIL is the option KEY, while the UI shows a
// locale-dependent LABEL. They differ — e.g. the key for "Dr." is "Ph.D.", and
// gender is stored as "Male". Always render through labelFor(), never the raw
// value, or the profile shows "Ph.D. Youssef" instead of "Dr. Youssef".
//
// The empty string is a real, meaningful key: for `title` the realm defines it
// as "Ich habe keinen Titel". For gender there is no empty option in
// the realm, so we use "" purely as the sentinel that CLEARS the attribute.

import { getCountries, getCountryCallingCode, parsePhoneNumber } from "libphonenumber-js";

import type { Locale } from "./copy";

type Options = readonly { readonly key: string; readonly de: string; readonly en: string }[];

export const TITLE_OPTIONS: Options = [
  { key: "Ph.D.", de: "Dr.", en: "Ph.D." },
  { key: "Prof.", de: "Prof.", en: "Prof." },
  { key: "", de: "Ich habe keinen Titel", en: "I don't have a title" },
];

export const GENDER_OPTIONS: Options = [
  { key: "Male", de: "Männlich", en: "Male" },
  { key: "Female", de: "Weiblich", en: "Female" },
  { key: "Diverse", de: "Divers", en: "Diverse" },
  { key: "Prefer not to say", de: "Keine Angabe", en: "Prefer not to say" },
];

// NOTE: Worms districts are deliberately NOT here. They are managed as the
// `districts` interest catalog in the profile admin, not as an IDP identity
// attribute.

export const TITLE_KEYS = TITLE_OPTIONS.map((o) => o.key);
export const GENDER_KEYS = GENDER_OPTIONS.map((o) => o.key);

/** Localised label for a stored key. Falls back to the key itself so an
 *  unexpected value from the IDP is still shown rather than silently dropped. */
export function labelFor(options: Options, key: string | null | undefined, locale: Locale): string | null {
  if (key === null || key === undefined || key === "") return null;
  const hit = options.find((o) => o.key === key);
  return hit ? (locale === "de" ? hit.de : hit.en) : key;
}

export function optionsFor(options: Options, locale: Locale): { key: string; label: string }[] {
  return options.map((o) => ({ key: o.key, label: locale === "de" ? o.de : o.en }));
}

// ISO 3166-1 alpha-2, officially assigned. Names are resolved at runtime via
// Intl.DisplayNames so we don't hand-maintain 249 translations per locale.
const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ " +
  "BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY " +
  "HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY " +
  "MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM " +
  "PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ " +
  "TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ " +
  "VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

export const COUNTRY_KEYS = COUNTRY_CODES;

/** All countries sorted by localised name, with Germany pinned to the top
 *  (the realm marks it as the preferred option for this tenant). */
export function countryOptions(locale: Locale): { key: string; label: string }[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    names = null; // very old runtime without full ICU — fall back to codes
  }
  const list = COUNTRY_CODES.map((key) => ({ key, label: names?.of(key) ?? key }));
  list.sort((a, b) => a.label.localeCompare(b.label, locale));
  const i = list.findIndex((c) => c.key === "DE");
  if (i > 0) list.unshift(list.splice(i, 1)[0]);
  return list;
}

/** Dial codes for the phone/fax prefix picker — the code alone ("+49"), with no
 *  country name, matching the native app. Codes are therefore deduplicated
 *  (many countries share one, e.g. +1) and sorted numerically, with +49 pinned
 *  first for this tenant. The stored value is the bare code, so no country
 *  lookup is needed when recombining into E.164. */
export const DEFAULT_DIAL_CODE = "49";

export function dialCodeOptions(): { key: string; label: string }[] {
  const codes = new Set<string>();
  for (const country of getCountries()) {
    try {
      codes.add(getCountryCallingCode(country));
    } catch {
      /* no known calling code — skip */
    }
  }
  const list = [...codes].sort((a, b) => Number(a) - Number(b));
  const i = list.indexOf(DEFAULT_DIAL_CODE);
  if (i > 0) list.unshift(list.splice(i, 1)[0]);
  return list.map((code) => ({ key: code, label: `+${code}` }));
}

/** Split a stored E.164 number into the dial code to preselect and the national
 *  part to show in the text field. Falls back to the default code plus the raw
 *  digits so a malformed stored value stays editable instead of vanishing. */
export function splitPhone(
  e164: string | null | undefined,
): { code: string; national: string } {
  if (!e164) return { code: DEFAULT_DIAL_CODE, national: "" };
  try {
    const p = parsePhoneNumber(e164);
    if (p?.countryCallingCode) {
      return { code: String(p.countryCallingCode), national: String(p.nationalNumber) };
    }
  } catch {
    /* not parseable — fall through */
  }
  return { code: DEFAULT_DIAL_CODE, national: e164.replace(/^\+/, "").replace(/\D/g, "") };
}

export function countryLabel(code: string | null | undefined, locale: Locale): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
