import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function token(name: string, css: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Missing hex token --color-${name}`);
  return match[1];
}

function channel(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
}

function linear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const red = linear(channel(hex, 1));
  const green = linear(channel(hex, 3));
  const blue = linear(channel(hex, 5));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("design token contrast", () => {
  it("keeps text and accent ink at WCAG AA on the surfaces they sit on", () => {
    const css = readFileSync(join(process.cwd(), "src/ui/styles/tokens.css"), "utf8");
    const text = token("text", css);
    const muted = token("text-muted", css);
    const subtle = token("text-subtle", css);
    const accent = token("accent", css);
    const ink = token("accent-ink", css);
    const danger = token("danger", css);
    const warn = token("warn", css);
    const backgrounds = ["#080908", "#0e100e", "#141714"];

    for (const background of backgrounds) {
      expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(subtle, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(danger, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(warn, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(ink, accent)).toBeGreaterThanOrEqual(4.5);
  });
});
