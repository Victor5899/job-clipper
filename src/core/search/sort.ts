import { compareForBoard } from "../model/stage";
import type { JobApplication } from "../model/types";

export const SORTS = ["saved", "deadline", "updated", "company", "title"] as const;
export type SortId = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortId, string> = {
  saved: "Recently saved",
  deadline: "Deadline approaching",
  updated: "Recently updated",
  company: "Company A–Z",
  title: "Job title A–Z",
};

export function isSortId(value: string): value is SortId {
  return (SORTS as readonly string[]).includes(value);
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Deadline approaching puts jobs with no deadline last. The other orders do not. */
export function compareJobs(sort: SortId, a: JobApplication, b: JobApplication): number {
  switch (sort) {
    case "deadline":
      return compareForBoard(a, b);
    case "updated":
      return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
    case "company":
      return byText(a.company, b.company) || byText(a.title, b.title) || a.id.localeCompare(b.id);
    case "title":
      return byText(a.title, b.title) || byText(a.company, b.company) || a.id.localeCompare(b.id);
    case "saved":
      return b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id);
  }
}
