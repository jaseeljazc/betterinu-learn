/**
 * lib/password.ts — Cryptographically random password generator.
 * Uses Web Crypto API (available in Node 18+ and Edge runtime).
 * Excludes ambiguous characters (0/O, 1/l/I) for readability.
 */
export function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}
