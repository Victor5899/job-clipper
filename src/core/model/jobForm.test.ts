import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import { applyJobEdits, jobToForm, validateJobForm } from "./jobForm";

const now = new Date("2026-11-22T12:00:00.000Z");

describe("validateJobForm", () => {
  it("requires a title, company and http(s) URL, and allows a missing deadline", () => {
    const values = jobToForm(makeJob());
    const cleared = {
      ...values,
      title: " ",
      url: "javascript:alert(1)",
      deadlineDate: "",
      deadlineTime: "",
    };
    const invalid = validateJobForm(cleared);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.errors.title).toBe("Enter the job title.");
    expect(invalid.errors.url).toBe("Enter a full web address starting with http:// or https://.");

    const valid = validateJobForm({ ...values, deadlineDate: "", deadlineTime: "10:00" });
    expect(valid.ok).toBe(false);
    if (!valid.ok) expect(valid.errors.deadlineTime).toMatch(/date/i);

    expect(validateJobForm({ ...values, deadlineDate: "", deadlineTime: "" }).ok).toBe(true);
  });

  it("requires a result when the status is Result", () => {
    const values = { ...jobToForm(makeJob()), status: "result", result: "" };
    const result = validateJobForm(values);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.result).toBe("Choose a result.");
  });
});

describe("applyJobEdits", () => {
  it("updates every edited field, clears a deadline, and records the status change", () => {
    const existing = makeJob({
      deadline: { date: "2026-12-01", origin: "user" },
      notes: "",
    });
    const parsed = validateJobForm({
      ...jobToForm(existing),
      title: "SQL Developer Intern",
      company: "Freshworks",
      url: "https://www.linkedin.com/jobs/view/999/?trk=x",
      source: "linkedin",
      description: "Build pipelines",
      city: "Bengaluru",
      countryCode: "in",
      eligibility: "india_hybrid",
      employmentType: "internship",
      status: "interview",
      deadlineDate: "",
      deadlineTime: "",
      notes: "Recruiter call\nTuesday",
    });
    if (!parsed.ok) throw new Error("expected a valid form");

    const next = applyJobEdits(existing, parsed.value, now);

    expect(next.id).toBe(existing.id);
    expect(next.savedAt).toBe(existing.savedAt);
    expect(next.title).toBe("SQL Developer Intern");
    expect(next.company).toBe("Freshworks");
    expect(next.canonicalUrl).toBe("https://linkedin.com/jobs/view/999");
    expect(next.sourceJobId).toBe("999");
    expect(next.location.city).toBe("Bengaluru");
    expect(next.location.countryCode).toBe("IN");
    expect(next.eligibility).toMatchObject({ value: "india_hybrid", overridden: true });
    expect(next.employmentType).toBe("internship");
    expect(next.description).toBe("Build pipelines");
    expect(next.notes).toBe("Recruiter call\nTuesday");
    expect(next.deadline).toBeNull();
    expect(next.status).toBe("interview");
    expect(next.statusHistory.map((entry) => entry.status)).toEqual(["saved", "interview"]);
    expect(next.interviewAt).toBe(now.toISOString());
    expect(next.updatedAt).toBe(now.toISOString());
  });

  it("keeps a page-labelled deadline when the date is unchanged", () => {
    const existing = makeJob({
      deadline: { date: "2026-12-01", time: "18:00", origin: "page_label", evidence: "Apply By" },
    });
    const parsed = validateJobForm(jobToForm(existing));
    if (!parsed.ok) throw new Error("expected a valid form");
    expect(applyJobEdits(existing, parsed.value, now).deadline).toEqual(existing.deadline);
  });
});
