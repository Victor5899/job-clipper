import { describe, expect, it } from "vitest";
import { createJobFromManualEntry, SCHEMA_VERSION } from "./defaults";

const now = new Date("2026-11-22T05:30:00.000Z");

describe("createJobFromManualEntry", () => {
  it("builds a complete saved job with honest unknown defaults", () => {
    const job = createJobFromManualEntry(
      {
        title: "SQL Developer Intern",
        company: "Razorpay",
        url: "https://www.linkedin.com/jobs/view/123/",
        deadline: null,
      },
      { id: "abc", now },
    );

    expect(job).toMatchObject({
      id: "abc",
      schemaVersion: SCHEMA_VERSION,
      title: "SQL Developer Intern",
      company: "Razorpay",
      url: "https://www.linkedin.com/jobs/view/123/",
      source: "linkedin",
      status: "saved",
      statusHistory: [{ status: "saved", at: now.toISOString() }],
      savedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      deadline: null,
      workArrangement: "unknown",
      employmentType: "unknown",
      eligibility: { value: "unknown", overridden: false },
      reminder: { status: "none" },
      notes: "",
    });
    expect(job.extraction).toBeUndefined();
  });

  it("records a user-entered deadline with origin 'user'", () => {
    const job = createJobFromManualEntry(
      {
        title: "Analyst",
        company: "Acme",
        url: "https://example.com/",
        deadline: { date: "2026-12-01", time: "17:00" },
      },
      { id: "x", now },
    );
    expect(job.deadline).toEqual({ date: "2026-12-01", time: "17:00", origin: "user" });
  });

  it("refuses an unvalidated non-http URL", () => {
    expect(() =>
      createJobFromManualEntry(
        { title: "a", company: "b", url: "javascript:alert(1)", deadline: null },
        { id: "x", now },
      ),
    ).toThrow();
  });
});
