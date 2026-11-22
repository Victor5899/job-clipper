import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { makeJob } from "../../../tests/factories";
import type { JobApplication } from "../model/types";
import { csvFilename, csvHeaders, escapeCsvField, jobsToCsv } from "./toCsv";

const SPEC_HEADERS = [
  "ID",
  "Job Title",
  "Company",
  "Job URL",
  "Source",
  "Location",
  "City",
  "Country",
  "Work Arrangement",
  "Employment Type",
  "Category",
  "India Eligibility",
  "Eligibility Overridden",
  "Visa Sponsorship",
  "Experience Requirement",
  "Salary/Stipend (raw)",
  "Skills",
  "Deadline",
  "Deadline Source",
  "Status",
  "Result",
  "Date Saved",
  "Date Applied",
  "Interview Date",
  "Reminder",
  "Contact Name",
  "Contact Email",
  "Notes",
  "Description",
];

/** RFC 4180 reader used to prove a spreadsheet would see the same cells. */
function parseCsv(text: string): string[][] {
  let source = text;
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
        continue;
      }
      field += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function rowBreaksAreCrlf(csv: string): boolean {
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === "\n" && csv[index - 1] !== "\r") return false;
  }
  return true;
}

function cell(headers: string[], row: string[], header: string): string {
  const index = headers.indexOf(header);
  expect(index, header).toBeGreaterThanOrEqual(0);
  return row[index] ?? "";
}

function richJob(): JobApplication {
  return makeJob({
    id: "rich-job",
    title: 'Analyst, "India"',
    company: "राज़ोरपे",
    url: "https://internshala.com/internship/detail/data-analyst-1234567",
    canonicalUrl: "https://internshala.com/internship/detail/data-analyst-1234567",
    source: "internshala",
    sourceJobId: "1234567",
    description: "தரவு analyst. ₹ 15,000 /month 🚀",
    companyWebsite: "https://example.com",
    location: { raw: "Chennai, Tamil Nadu", city: "Chennai", country: "India", countryCode: "IN" },
    workArrangement: "remote",
    eligibleCountries: ["IN", "Worldwide"],
    eligibility: {
      value: "remote_india",
      confidence: "high",
      reasons: ["Anywhere in India"],
      overridden: true,
      classifierVersion: 1,
    },
    workAuthorization: "No sponsorship",
    visaSponsorship: "no",
    studentEligibility: "both",
    graduationYears: [2027],
    employmentType: "internship",
    experience: { raw: "4-6 Lacs P.A.", minYears: 0, maxYears: 1, level: "internship" },
    compensation: {
      raw: "₹ 15,000 /month",
      currency: "INR",
      min: 15000,
      max: 27000,
      period: "month",
      kind: "stipend",
    },
    skills: ["SQL", "Python"],
    category: "data_analyst",
    status: "result",
    result: "selected",
    statusHistory: [
      { status: "saved", at: "2026-11-20T10:00:00.000Z" },
      { status: "result", result: "selected", at: "2026-11-21T10:00:00.000Z" },
    ],
    savedAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-21T10:00:00.000Z",
    appliedAt: "2026-11-20T12:00:00.000Z",
    interviewAt: "2026-11-25T06:30:00.000Z",
    deadline: {
      date: "2026-12-18",
      time: "23:59",
      origin: "page_label",
      evidence: "Apply By 18 Dec' 26",
    },
    notes: 'Line one\r\nHe said "hello"\n🚀',
    contact: {
      name: "Ada",
      email: "ada@example.com",
      phone: "+91 90000 00000",
      profileUrl: "https://example.com/ada",
    },
    reminder: {
      enabled: true,
      mode: "default",
      leadDays: 1,
      atTime: "09:00",
      soonAt: "2026-11-22T04:30:00.000Z",
      remindAt: "2026-12-17T03:30:00.000Z",
      status: "scheduled",
      firedAt: "2026-11-01T03:30:00.000Z",
    },
    extraction: {
      adapter: "internshala",
      adapterVersion: 1,
      extractedAt: "2026-11-20T10:00:00.000Z",
      fieldSources: { title: "adapter", deadline: "adapter" },
    },
  });
}

describe("escapeCsvField", () => {
  it("quotes commas, quotes, and line breaks, and prefixes formulas", () => {
    expect(escapeCsvField("")).toBe("");
    expect(escapeCsvField("plain")).toBe("plain");
    expect(escapeCsvField("hello, there")).toBe('"hello, there"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("a\nb")).toBe('"a\nb"');
    expect(escapeCsvField("a\r\nb")).toBe('"a\r\nb"');
    expect(escapeCsvField("=SUM(1,2)")).toBe(`"'=SUM(1,2)"`);
    expect(escapeCsvField("+91 90000")).toBe("'+91 90000");
    expect(escapeCsvField("-5")).toBe("'-5");
    expect(escapeCsvField("@cmd")).toBe("'@cmd");
    expect(escapeCsvField("\t=1")).toBe("'\t=1");
    expect(escapeCsvField("\r=1")).toBe('"\'\r=1"');
    expect(escapeCsvField("total =SUM(1)")).toBe("total =SUM(1)");
    expect(escapeCsvField("₹ 15,000 /month")).toBe('"₹ 15,000 /month"');
    expect(escapeCsvField("राज़ोरपे")).toBe("राज़ोरपे");
    expect(escapeCsvField("தரவு")).toBe("தரவு");
  });
});

describe("jobsToCsv", () => {
  it("writes a spreadsheet-safe file with the spec columns first", () => {
    const job = richJob();
    const formula = makeJob({
      id: "formula-job",
      title: "=SUM(A1:A2)",
      company: "Acme",
      notes: "",
      deadline: null,
    });
    const empty = makeJob({ id: "empty-job", deadline: null, notes: "", description: undefined });
    const csv = jobsToCsv([job, formula, empty], { includeDescription: true });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(rowBreaksAreCrlf(csv)).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual(csvHeaders({ includeDescription: true }));
    expect(rows[0]?.slice(0, SPEC_HEADERS.length)).toEqual(SPEC_HEADERS);
    for (const row of rows) expect(row).toHaveLength(rows[0]!.length);

    const rich = rows[1]!;
    const headers = rows[0]!;
    expect(cell(headers, rich, "Job Title")).toBe('Analyst, "India"');
    expect(cell(headers, rich, "Company")).toBe(job.company);
    expect(cell(headers, rich, "Salary/Stipend (raw)")).toBe("₹ 15,000 /month");
    expect(cell(headers, rich, "Description")).toContain("தரவு");
    expect(cell(headers, rich, "Description")).toContain("🚀");
    expect(cell(headers, rich, "Notes")).toBe('Line one\r\nHe said "hello"\n🚀');
    expect(cell(headers, rich, "Skills")).toBe("SQL; Python");
    expect(cell(headers, rich, "Deadline")).toBe("2026-12-18 23:59");
    expect(cell(headers, rich, "Deadline Source")).toBe("Page label");
    expect(cell(headers, rich, "Deadline Evidence")).toBe("Apply By 18 Dec' 26");
    expect(cell(headers, rich, "Status")).toBe("Result");
    expect(cell(headers, rich, "Result")).toBe("Selected");
    expect(cell(headers, rich, "India Eligibility")).toBe("Remote — India eligible");
    expect(cell(headers, rich, "Work Arrangement")).toBe("Remote");
    expect(cell(headers, rich, "Employment Type")).toBe("Internship");
    expect(cell(headers, rich, "Date Applied")).toBe(job.appliedAt);
    expect(cell(headers, rich, "Interview Date")).toBe(job.interviewAt);
    expect(cell(headers, rich, "Reminder")).toBe(
      `On – ${format(new Date(job.reminder.remindAt!), "yyyy-MM-dd HH:mm")}`,
    );
    expect(cell(headers, rich, "Reminder Enabled")).toBe("Yes");
    expect(cell(headers, rich, "Reminder Lead Days")).toBe("1");
    expect(cell(headers, rich, "Remind At")).toBe(job.reminder.remindAt);
    expect(cell(headers, rich, "Contact Phone")).toBe("'+91 90000 00000");
    expect(cell(headers, rich, "Source Job ID")).toBe("1234567");
    expect(cell(headers, rich, "Field Sources")).toContain("deadline=adapter");
    expect(cell(headers, rich, "Schema Version")).toBe("1");
    expect(cell(headers, rich, "Status History")).toContain("Selected");

    const formulaRow = rows[2]!;
    expect(cell(headers, formulaRow, "Job Title")).toBe("'=SUM(A1:A2)");
    expect(cell(headers, formulaRow, "Deadline")).toBe("");
    expect(cell(headers, formulaRow, "Date Applied")).toBe("");
    expect(cell(headers, formulaRow, "Result")).toBe("");
    expect(cell(headers, formulaRow, "Description")).toBe("");

    const emptyRow = rows[3]!;
    expect(emptyRow.every((value) => value !== "undefined" && value !== "null")).toBe(true);
    expect(cell(headers, emptyRow, "Deadline")).toBe("");
    expect(cell(headers, emptyRow, "Notes")).toBe("");
  });

  it("omits only the description column when that option is off", () => {
    const job = richJob();
    const csv = jobsToCsv([job], { includeDescription: false });
    const [headers, row] = parseCsv(csv);
    expect(headers).not.toContain("Description");
    expect(headers).toContain("Notes");
    expect(headers).toContain("Canonical URL");
    expect(row).toHaveLength(headers!.length);
    expect(row?.join("\n")).not.toContain("தரவு");
    expect(csvHeaders({ includeDescription: false })).toEqual(headers);
  });

  it("exports a large file with long notes and keeps every row aligned", () => {
    const notes = `${"न".repeat(10_000)}\nline two, "quoted"`;
    const jobs = Array.from({ length: 1000 }, (_, index) =>
      makeJob({
        id: `bulk-${index}`,
        title: index === 10 ? "=HYPERLINK()" : `Role ${index}`,
        company: index === 11 ? "Acme, Inc." : `Company ${index}`,
        notes: index === 12 ? notes : "",
        description: index === 13 ? "₹ stipend" : undefined,
        deadline: index % 2 === 0 ? null : { date: "2026-12-01", origin: "user" },
      }),
    );
    const csv = jobsToCsv(jobs, { includeDescription: true });
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1001);
    const headers = rows[0]!;
    expect(rows.every((row) => row.length === headers.length)).toBe(true);
    expect(cell(headers, rows[11]!, "Job Title")).toBe("'=HYPERLINK()");
    expect(cell(headers, rows[12]!, "Company")).toBe("Acme, Inc.");
    expect(cell(headers, rows[13]!, "Notes")).toBe(notes);
    expect(cell(headers, rows[14]!, "Description")).toBe("₹ stipend");
    expect(cell(headers, rows[1]!, "Deadline")).toBe("");
    expect(cell(headers, rows[2]!, "Deadline")).toBe("2026-12-01");
    expect(rowBreaksAreCrlf(csv)).toBe(true);
  });

  it("names the file with the local export date", () => {
    expect(csvFilename(new Date(2026, 10, 22, 23, 30))).toBe("job-clipper-all-2026-11-22.csv");
    expect(csvFilename(new Date(2026, 10, 22, 23, 30), "filtered")).toBe(
      "job-clipper-filtered-2026-11-22.csv",
    );
  });
});
