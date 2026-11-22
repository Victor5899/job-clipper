import type { JobApplication } from "../model/types";
import { columnsFor } from "./columns";

/** Prefix cells Excel would treat as formulas. Applied before quoting. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * RFC 4180 field. Quotes when the value contains a comma, quote, CR or LF.
 * Embedded quotes are doubled. A leading formula character is prefixed with `'`.
 */
export function escapeCsvField(value: string): string {
  const guarded = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

export interface CsvOptions {
  includeDescription: boolean;
}

/** Header row, in export order. Description is omitted when the option is off. */
export function csvHeaders(options: CsvOptions): string[] {
  return columnsFor(options.includeDescription).map((column) => column.header);
}

/**
 * UTF-8 CSV with a leading BOM and CRLF row endings, including after the last row.
 * Pass jobs in the order they should appear. Null deadlines become empty cells.
 */
export function jobsToCsv(jobs: readonly JobApplication[], options: CsvOptions): string {
  const columns = columnsFor(options.includeDescription);
  const lines = [
    columns.map((column) => escapeCsvField(column.header)).join(","),
    ...jobs.map((job) => columns.map((column) => escapeCsvField(column.cell(job))).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Local calendar date, so the filename matches the day the user exported. */
export function csvFilename(date: Date, scope: "all" | "filtered" = "all"): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `job-clipper-${scope}-${date.getFullYear()}-${month}-${day}.csv`;
}
