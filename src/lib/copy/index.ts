import { en } from "./en";
import { de } from "./de";

export type Locale = "en" | "de";

// Default locale = German. English remains as a fallback for any caller that
// explicitly asks for it.
export const DEFAULT_LOCALE: Locale = "de";

export function getCopy(locale: Locale | string | undefined) {
  return locale === "en" ? en : de;
}

export type Copy = typeof de;
