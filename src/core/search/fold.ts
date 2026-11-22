/** Lowercase, with combining marks removed, so " naïve " matches "naive". */
export function foldSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
