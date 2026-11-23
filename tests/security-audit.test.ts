import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("security audit", () => {
  it("finds no forbidden permissions, HTML injection or network calls", () => {
    const output = execFileSync(process.execPath, ["scripts/security-audit.mjs"], {
      encoding: "utf8",
    });
    expect(output).toContain("0 failed");
  });
});
