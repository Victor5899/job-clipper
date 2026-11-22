import { describe, expect, it } from "vitest";
import { mergeExtractions } from "./merge";

describe("mergeExtractions", () => {
  it("lets the adapter win, then JSON-LD, then meta, then a heading", () => {
    const merged = mergeExtractions([
      { source: "adapter", fields: { title: "Adapter title", company: "Adapter Co" } },
      { source: "jsonld", fields: { title: "JSON title", description: "From JSON-LD" } },
      { source: "meta", fields: { title: "Meta title" } },
      { source: "heuristic", fields: { title: "Heading" } },
    ]);
    expect(merged.fields.title).toBe("Adapter title");
    expect(merged.fields.description).toBe("From JSON-LD");
    expect(merged.fieldSources.title).toBe("adapter");
    expect(merged.fieldSources.description).toBe("jsonld");
  });

  it("can prefer JSON-LD for title while still keeping only an adapter deadline", () => {
    const merged = mergeExtractions(
      [
        {
          source: "adapter",
          fields: {
            title: "Short",
            deadline: { date: "2026-12-18", evidence: "APPLY BY 18 Dec 26" },
          },
        },
        {
          source: "jsonld",
          fields: {
            title: "Full title",
            deadline: { date: "2027-01-01", evidence: "validThrough" },
          },
        },
      ],
      { preferJsonLd: true },
    );
    expect(merged.fields.title).toBe("Full title");
    expect(merged.fields.deadline).toEqual({ date: "2026-12-18", evidence: "APPLY BY 18 Dec 26" });
    expect(merged.fieldSources.deadline).toBe("adapter");
  });

  it("drops a deadline that did not come from the adapter", () => {
    const merged = mergeExtractions([
      {
        source: "jsonld",
        fields: { deadline: { date: "2026-12-18", evidence: "Deadline: 2026-12-18" } },
      },
      {
        source: "heuristic",
        fields: { deadline: { date: "2026-12-01", evidence: "Apply by 1 Dec 2026" } },
      },
    ]);
    expect(merged.fields.deadline).toBeUndefined();
  });
});
