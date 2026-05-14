import { en } from "./en";
import { de } from "./de";

export type Locale = "en" | "de";

export function getCopy(locale: Locale | string | undefined) {
  return locale === "de" ? de : en;
}

export type Copy = typeof en;
