import { describe, expect, it } from "vitest";
import { installExtractor } from "./extractor";
import { waitForJobContent } from "./waitForContent";

function addDetail(doc: Document) {
  const detail = doc.createElement("div");
  detail.className = "detail_view";
  doc.body.append(detail);
}

describe("waitForJobContent", () => {
  it("returns immediately for an unsupported page or a page that is already a listing", async () => {
    const doc = document.implementation.createHTMLDocument("");
    await expect(
      waitForJobContent(doc, new URL("https://example.com/jobs/1"), 20),
    ).resolves.toBeUndefined();

    addDetail(doc);
    await expect(
      waitForJobContent(doc, new URL("https://internshala.com/internship/detail/role-100000"), 20),
    ).resolves.toBeUndefined();
  });

  it("waits until the listing markup appears", async () => {
    const doc = document.implementation.createHTMLDocument("");
    const pending = waitForJobContent(
      doc,
      new URL("https://internshala.com/internship/detail/role-100000"),
      500,
    );
    addDetail(doc);
    await expect(pending).resolves.toBeUndefined();
  });
});

describe("installExtractor", () => {
  it("installs the runner once", () => {
    const scope = globalThis as {
      __jcExtractorLoaded?: boolean;
      __jcRunExtraction?: () => Promise<unknown>;
    };
    expect(scope.__jcExtractorLoaded).toBe(true);
    const first = scope.__jcRunExtraction;
    installExtractor();
    expect(scope.__jcRunExtraction).toBe(first);
  });
});
