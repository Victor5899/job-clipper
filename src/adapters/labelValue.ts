import { ownText, visibleText } from "./domText";

/** Internshala prints the same pay once for desktop and once for mobile. Keep the copy that includes the period. */
function readableValue(node: Element): string {
  const desktop = node.querySelector(".desktop");
  const mobile = node.querySelector(".mobile");
  if (desktop && mobile) {
    const desktopText = visibleText(desktop);
    const mobileText = visibleText(mobile);
    if (
      /\/\s*(?:month|year)|\bp\.?\s*a\.?\b/i.test(mobileText) &&
      !/\/\s*(?:month|year)|\bp\.?\s*a\.?\b/i.test(desktopText)
    ) {
      return mobileText;
    }
    return desktopText;
  }
  return visibleText(node);
}

function valueBeside(label: Element): string | undefined {
  const candidates = [label.nextElementSibling, label.parentElement?.nextElementSibling];
  for (const node of candidates) {
    if (!(node instanceof Element)) continue;
    const value = readableValue(node).replace(/\s+/g, " ").trim();
    if (value && value.length <= 180) return value;
  }
  return undefined;
}

/** Finds a short label and the value next to it. The label must be the element's own text. */
export function findLabelledValue(
  root: ParentNode,
  label: RegExp,
): { label: string; value: string } | undefined {
  const nodes = root.querySelectorAll("span, div, dt, th, h3, h4, p, li, strong, label");
  for (const node of nodes) {
    const text = ownText(node);
    if (!text || text.length > 40 || !label.test(text)) continue;
    const value = valueBeside(node);
    if (value) return { label: text, value };
  }
  return undefined;
}
