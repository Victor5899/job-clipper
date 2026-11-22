const CONTROL_CHARS = /\p{Cc}/gu;

/** Single-line text: control characters removed, whitespace collapsed, length capped. */
export function cleanText(value: string, maxLength: number): string {
  return value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Notes and descriptions keep their line breaks. Other control characters are dropped. */
export function cleanMultiline(value: string, maxLength: number): string {
  let text = "";
  for (const char of value.replace(/\r\n?/g, "\n")) {
    if (char === "\n") {
      text += "\n";
      continue;
    }
    if (/\p{Cc}/u.test(char)) continue;
    text += char;
  }
  return text
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function initials(name: string): string {
  const words = cleanText(name, 200)
    .split(" ")
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  const letters = words.slice(0, 2).map((word) => [...word.replace(/[^\p{L}\p{N}]/gu, "")][0]);
  return letters.join("").toUpperCase() || "?";
}
