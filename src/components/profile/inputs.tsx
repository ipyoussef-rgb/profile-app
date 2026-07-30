"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/Card";
import { dialCodeOptions, splitPhone } from "@/lib/idp-options";

/** Phone / fax entry: the dial code is PICKED, never typed, so the user cannot
 *  produce a malformed prefix. Submits two fields — `<name>_code` (bare dial
 *  code) and `<name>_national` (digits only) — which the server action
 *  recombines into E.164. The text field strips everything that isn't a digit,
 *  so pasting "+49 (0)6241 / 123-45" still yields a clean national part. */
export function PhoneField({
  name,
  value,
  disabled,
}: {
  name: string;
  value: string | null;
  disabled?: boolean;
}) {
  const initial = splitPhone(value);
  const [code, setCode] = useState(initial.code);
  const [national, setNational] = useState(initial.national);
  const options = dialCodeOptions();

  return (
    <div className="flex w-full min-w-0 gap-2">
      {/* The width sits on this wrapper, not on the <select>: inputClass already
          carries `w-full`, and two competing width utilities in one class string
          resolve by stylesheet order rather than the order written — which had
          the select swallow the whole row and squash the number field. */}
      {/* Narrower now that only "+49" is shown, leaving more room for digits. */}
      <div className="w-24 shrink-0">
        <select
          name={`${name}_code`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={disabled}
          aria-label="Telefonvorwahl"
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1">
        <input
          name={`${name}_national`}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={national}
          onChange={(e) => setNational(e.target.value.replace(/\D/g, ""))}
          disabled={disabled}
          className={inputClass}
        />
      </div>
    </div>
  );
}

/** Birthdate as TT.MM.JJJJ with the dots inserted while typing: after the day
 *  and after the month a separator appears on its own, and the year ends the
 *  input with no trailing character. Deleting works because the value is
 *  rebuilt from the digits on every keystroke rather than patched in place. */
export function BirthdateField({
  name,
  value,
  disabled,
}: {
  name: string;
  value: string | null;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value ?? "");

  function format(raw: string): string {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
  }

  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="TT.MM.JJJJ"
      maxLength={10}
      value={text}
      onChange={(e) => setText(format(e.target.value))}
      disabled={disabled}
      className={inputClass}
    />
  );
}
