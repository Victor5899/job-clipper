/** Reads visible text and drops script, style, and form controls. Nothing is parsed as HTML. */
export function visibleText(root: ParentNode): string {
  const element = root instanceof Element ? root : root instanceof Document ? root.body : null;
  if (!element) return "";
  const clone = element.cloneNode(true) as Element;
  clone
    .querySelectorAll("script, style, noscript, template, input, textarea, select")
    .forEach((node) => node.remove());
  return (clone.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** Text that belongs to this element, not to its children. */
export function ownText(element: Element): string {
  let text = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? "";
  }
  return text.replace(/\s+/g, " ").trim();
}
