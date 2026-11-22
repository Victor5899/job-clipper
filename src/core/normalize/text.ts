const CONTROL_CHARS = /\p{Cc}/gu;

/** Single-line text: control characters removed, whitespace collapsed, length capped. */
export function cleanText(value: string, maxLength: number): string {
  return value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function initials(name: string): string {
  const words = cleanText(name, 200)
    .split(" ")
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  const letters = words.slice(0, 2).map((word) => [...word.replace(/[^\p{L}\p{N}]/gu, "")][0]);
  return letters.join("").toUpperCase() || "?";
}
