import emailSpellChecker from "@zootools/email-spell-checker";

/**
 * Suggest a corrected email address when the domain looks misspelled.
 *
 * Returns the full corrected address (e.g. "a@gmial.com" -> "a@gmail.com") when
 * the input appears to be a typo of a popular domain or TLD, or `null` when the
 * address looks fine or is still incomplete. Thin wrapper around
 * `@zootools/email-spell-checker` so the UI never depends on the library's shape.
 */
export function suggestEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  return emailSpellChecker.run({ email: trimmed })?.full ?? null;
}
