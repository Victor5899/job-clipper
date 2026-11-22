import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import { groupByStage } from "../model/stage";
import { applyQuery, applicationsHash, emptyQuery, queryFromParams, queryNarrows } from "./query";
import { compareJobs } from "./sort";

const now = new Date(2026, 10, 23, 12, 0, 0, 0);

function query(patch: Partial<ReturnType<typeof emptyQuery>> = {}) {
  return { ...emptyQuery(), ...patch };
}

describe("search, filters and sort", () => {
  const sql = makeJob({
    id: "sql",
    title: "SQL Analyst",
    company: "Rázorpay",
    status: "interview",
    source: "linkedin",
    employmentType: "internship",
    category: "data_analyst",
    workArrangement: "remote",
    experience: { level: "fresher", raw: "0–1 years" },
    eligibility: {
      value: "remote_india",
      confidence: "high",
      reasons: [],
      overridden: false,
      classifierVersion: 1,
    },
    location: { raw: "Bengaluru, India", city: "Bengaluru", country: "India" },
    skills: ["SQL", "Python"],
    description: "Warehouse models",
    notes: "Ask about naïve joins",
    deadline: { date: "2026-11-30", origin: "user" },
    savedAt: "2026-11-21T00:00:00.000Z",
    updatedAt: "2026-11-22T00:00:00.000Z",
    result: undefined,
  });
  const overdue = makeJob({
    id: "overdue",
    title: "Backend Intern",
    company: "Zomato",
    status: "applied",
    source: "internshala",
    result: "rejected",
    deadline: { date: "2026-11-22", origin: "user" },
    savedAt: "2026-11-18T00:00:00.000Z",
    updatedAt: "2026-11-23T00:00:00.000Z",
  });
  const undated = makeJob({
    id: "undated",
    title: "Graduate Trainee",
    company: "Acme",
    status: "saved",
    deadline: null,
    savedAt: "2026-11-23T00:00:00.000Z",
    updatedAt: "2026-11-19T00:00:00.000Z",
  });
  const jobs = [sql, overdue, undated];

  it("matches every token across the indexed fields, ignoring case and accents", () => {
    expect(applyQuery(jobs, query({ q: "sql naïve" }), now).map((job) => job.id)).toEqual(["sql"]);
    expect(applyQuery(jobs, query({ q: "razorpay bengaluru" }), now).map((job) => job.id)).toEqual([
      "sql",
    ]);
    expect(applyQuery(jobs, query({ q: "sql zomato" }), now)).toEqual([]);
  });

  it("combines facets with OR inside a facet and AND across facets", () => {
    const both = applyQuery(jobs, query({ status: ["interview", "saved"] }), now).map(
      (job) => job.id,
    );
    expect(both.sort()).toEqual(["sql", "undated"]);
    expect(
      applyQuery(jobs, query({ status: ["interview"], source: ["internshala"] }), now),
    ).toEqual([]);
    expect(applyQuery(jobs, query({ result: ["rejected"] }), now).map((job) => job.id)).toEqual([
      "overdue",
    ]);
    expect(
      applyQuery(
        jobs,
        query({
          employment: ["internship"],
          category: ["data_analyst"],
          eligibility: ["remote_india"],
          arrangement: ["remote"],
          experience: ["fresher"],
        }),
        now,
      ).map((job) => job.id),
    ).toEqual(["sql"]);
  });

  it("filters deadline ranges and never treats a missing deadline as a date range", () => {
    expect(applyQuery(jobs, query({ deadline: ["overdue"] }), now).map((job) => job.id)).toEqual([
      "overdue",
    ]);
    expect(applyQuery(jobs, query({ deadline: ["next7"] }), now).map((job) => job.id)).toEqual([
      "sql",
    ]);
    expect(applyQuery(jobs, query({ deadline: ["next30"] }), now).map((job) => job.id)).toEqual([
      "sql",
    ]);
    expect(applyQuery(jobs, query({ deadline: ["none"] }), now).map((job) => job.id)).toEqual([
      "undated",
    ]);
    expect(
      applyQuery(jobs, query({ deadline: ["overdue", "none"] }), now)
        .map((job) => job.id)
        .sort(),
    ).toEqual(["overdue", "undated"]);
    expect(
      applyQuery(
        jobs,
        query({ deadline: ["custom"], from: "2026-11-25", to: "2026-11-30" }),
        now,
      ).map((job) => job.id),
    ).toEqual(["sql"]);
    expect(
      applyQuery(
        jobs,
        query({ deadline: ["custom"], from: "2026-11-01", to: "2026-11-22" }),
        now,
      ).map((job) => job.id),
    ).toEqual(["overdue"]);
  });

  it("sorts deadline-free jobs last only for the deadline order", () => {
    const byDeadline = applyQuery(jobs, query({ sort: "deadline" }), now).map((job) => job.id);
    expect(byDeadline.at(-1)).toBe("undated");
    expect(byDeadline[0]).toBe("overdue");

    expect(applyQuery(jobs, query({ sort: "saved" }), now).map((job) => job.id)[0]).toBe("undated");
    expect(applyQuery(jobs, query({ sort: "updated" }), now).map((job) => job.id)[0]).toBe(
      "overdue",
    );
    expect(applyQuery(jobs, query({ sort: "company" }), now).map((job) => job.company)).toEqual([
      "Acme",
      "Rázorpay",
      "Zomato",
    ]);
    expect(applyQuery(jobs, query({ sort: "title" }), now).map((job) => job.id)[0]).toBe("overdue");

    const sameStage = jobs.map((job) => ({ ...job, status: "saved" as const }));
    expect(
      groupByStage(sameStage, (a, b) => compareJobs("company", a, b)).saved.map(
        (job) => job.company,
      ),
    ).toEqual(["Acme", "Rázorpay", "Zomato"]);
  });

  it("round-trips the query in the hash and drops unknown values", () => {
    const params = new URLSearchParams(
      "q=data+sql&status=interview,nope&deadline=none&sort=company&job=sql&from=2026-11-01",
    );
    const read = queryFromParams(params);
    expect(read.q).toBe("data sql");
    expect(read.status).toEqual(["interview"]);
    expect(read.deadline).toEqual(["none", "custom"]);
    expect(read.sort).toBe("company");
    expect(read.from).toBe("2026-11-01");
    expect(queryNarrows(read)).toBe(true);
    expect(queryNarrows(emptyQuery())).toBe(false);

    const hash = applicationsHash(params, read);
    expect(hash.startsWith("#/applications?")).toBe(true);
    const again = queryFromParams(new URLSearchParams(hash.slice(hash.indexOf("?") + 1)));
    expect(again.status).toEqual(["interview"]);
    expect(again.sort).toBe("company");
    expect(hash).toContain("job=sql");
    expect(applicationsHash(new URLSearchParams(), emptyQuery())).toBe("#/applications");
  });

  it("filters 2000 jobs in under 50 ms", () => {
    const many = Array.from({ length: 2000 }, (_, index) =>
      makeJob({
        id: `bulk-${index}`,
        title: index === 1500 ? "Unique Zephyr Role" : `Role ${index}`,
        company: index % 2 === 0 ? "Acme" : "Northwind",
        notes: index === 1500 ? "warehouse" : "other",
        updatedAt: `2026-11-20T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
      }),
    );
    const started = performance.now();
    const found = applyQuery(many, query({ q: "zephyr warehouse", source: ["other"] }), now);
    expect(performance.now() - started).toBeLessThan(50);
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("bulk-1500");
  });
});
