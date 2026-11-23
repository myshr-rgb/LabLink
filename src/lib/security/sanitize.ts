/** Normalize free-text fields when their route schema requests it. */
export function sanitizeText(value: string): string {
  return Array.from(value)
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join("")
    .trim();
}
