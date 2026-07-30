// Option catalogs for the IDP-managed select fields, mirroring the KOBIL
// Identity `user-attributes` config for this realm.
//
// IMPORTANT: the value STORED in KOBIL is the option KEY, while the UI shows a
// locale-dependent LABEL. They differ — e.g. the key for "Dr." is "Ph.D.", and
// gender is stored as "Male". Always render through labelFor(), never the raw
// value, or the profile shows "Ph.D. Youssef" instead of "Dr. Youssef".
//
// The empty string is a real, meaningful key: for `title` the realm defines it
// as "Ich habe keinen Titel". For gender/district there is no empty option in
// the realm, so we use "" purely as the sentinel that CLEARS the attribute.

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

// Worms Ortsteile. NOTE: this list is duplicated as the `districts` catalog the
// admin manages for interests — `district` here is where the user LIVES (single
// select), the catalog is which districts they FOLLOW. Add new Ortsteile to both.
const DISTRICT_NAMES = [
  "Zentrum", "Abenheim", "Heppenheim", "Herrnsheim", "Hochheim", "Horchheim",
  "Ibersheim", "Leiselheim", "Neuhausen", "Pfeddersheim", "Pfiffligheim",
  "Rheindürkheim", "Weinsheim", "Wiesoppenheim",
] as const;

export const DISTRICT_OPTIONS: Options = DISTRICT_NAMES.map((n) => ({ key: n, de: n, en: n }));

export const TITLE_KEYS = TITLE_OPTIONS.map((o) => o.key);
export const GENDER_KEYS = GENDER_OPTIONS.map((o) => o.key);
export const DISTRICT_KEYS = DISTRICT_OPTIONS.map((o) => o.key);

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

export function countryLabel(code: string | null | undefined, locale: Locale): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
