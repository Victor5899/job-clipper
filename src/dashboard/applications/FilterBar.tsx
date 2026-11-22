import { useEffect, useId, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  ELIGIBILITY_LABELS,
  EMPLOYMENT_LABELS,
  EXPERIENCE_LABELS,
  JOB_CATEGORIES,
  JOB_STATUSES,
  RESULT_LABELS,
  RESULT_OUTCOMES,
  SOURCE_LABELS,
  STATUS_LABELS,
  WORK_ARRANGEMENT_LABELS,
  WORK_ARRANGEMENTS,
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  INDIA_ELIGIBILITY,
  type SourceId,
} from "../../core/model/enums";
import { DEADLINE_FILTERS, DEADLINE_FILTER_LABELS, type BoardQuery } from "../../core/search/query";
import { SORTS, SORT_LABELS, type SortId } from "../../core/search/sort";

const SOURCE_IDS = Object.keys(SOURCE_LABELS) as SourceId[];

type FacetId =
  | "status"
  | "result"
  | "source"
  | "employment"
  | "category"
  | "eligibility"
  | "arrangement"
  | "experience"
  | "deadline";

const FACETS: { id: FacetId; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "result", label: "Result" },
  { id: "source", label: "Source" },
  { id: "employment", label: "Employment" },
  { id: "category", label: "Category" },
  { id: "eligibility", label: "India eligibility" },
  { id: "arrangement", label: "Work arrangement" },
  { id: "experience", label: "Experience" },
  { id: "deadline", label: "Deadline" },
];

function optionsFor(id: FacetId): { value: string; label: string }[] {
  switch (id) {
    case "status":
      return JOB_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));
    case "result":
      return RESULT_OUTCOMES.map((value) => ({ value, label: RESULT_LABELS[value] }));
    case "source":
      return SOURCE_IDS.map((value) => ({ value, label: SOURCE_LABELS[value] }));
    case "employment":
      return EMPLOYMENT_TYPES.map((value) => ({ value, label: EMPLOYMENT_LABELS[value] }));
    case "category":
      return JOB_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));
    case "eligibility":
      return INDIA_ELIGIBILITY.map((value) => ({ value, label: ELIGIBILITY_LABELS[value] }));
    case "arrangement":
      return WORK_ARRANGEMENTS.map((value) => ({ value, label: WORK_ARRANGEMENT_LABELS[value] }));
    case "experience":
      return EXPERIENCE_LEVELS.map((value) => ({ value, label: EXPERIENCE_LABELS[value] }));
    case "deadline":
      return DEADLINE_FILTERS.map((value) => ({ value, label: DEADLINE_FILTER_LABELS[value] }));
  }
}

function selectedCount(query: BoardQuery, id: FacetId): number {
  return query[id].length;
}

function toggleValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

interface FilterBarProps {
  query: BoardQuery;
  onSearch: (value: string) => void;
  onChange: (query: BoardQuery) => void;
}

export function FilterBar({ query, onSearch, onChange }: FilterBarProps) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<FacetId | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");
      const shortcut =
        event.key === "/" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k");
      if (!shortcut || event.altKey || event.shiftKey) return;
      if (event.key === "/" && typing) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const setFacet = (id: FacetId, values: string[]) => {
    onChange({ ...query, [id]: values });
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <label htmlFor={searchId} className="sr-only">
            Search applications
          </label>
          <input
            ref={searchRef}
            id={searchId}
            type="search"
            value={query.q}
            placeholder="Search title, company, location, skills, notes"
            onChange={(event) => onSearch(event.target.value)}
            className="h-10 w-full min-w-0 rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm text-text placeholder:text-text-subtle"
          />
        </div>
        <div className="flex items-center gap-2 text-[13px] text-text-muted">
          <span id={`${searchId}-sort`} className="shrink-0">
            Sort
          </span>
          <select
            aria-labelledby={`${searchId}-sort`}
            value={query.sort}
            onChange={(event) => onChange({ ...query, sort: event.target.value as SortId })}
            className="h-10 min-w-0 rounded-[10px] border border-border-strong bg-surface-1 px-3 text-sm text-text"
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FACETS.map((facet) => {
          const count = selectedCount(query, facet.id);
          const panelId = `${searchId}-${facet.id}`;
          return (
            <div key={facet.id} className="relative">
              <button
                type="button"
                aria-expanded={open === facet.id}
                aria-controls={panelId}
                onClick={() => setOpen((current) => (current === facet.id ? null : facet.id))}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-strong px-3 text-[13px] text-text hover:bg-surface-2/60"
              >
                {facet.label}
                {count > 0 && (
                  <span className="font-mono text-[11px] text-accent tabular-nums">{count}</span>
                )}
              </button>
              {open === facet.id && (
                <div
                  id={panelId}
                  role="group"
                  aria-label={facet.label}
                  className="absolute left-0 z-20 mt-1 max-h-64 w-64 overflow-auto rounded-[12px] border border-border-strong bg-surface-1 p-2 shadow-[0_16px_40px_rgb(0_0_0/0.35)]"
                >
                  {optionsFor(facet.id).map((option) => {
                    const checked = (query[facet.id] as readonly string[]).includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[13px] text-text hover:bg-surface-2/70"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-accent"
                          checked={checked}
                          onChange={() =>
                            setFacet(
                              facet.id,
                              toggleValue(query[facet.id] as string[], option.value),
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                  {facet.id === "deadline" && query.deadline.includes("custom") && (
                    <div className="mt-1 flex flex-col gap-2 border-t border-border px-2 pt-2">
                      <label className="flex flex-col gap-1 text-[12px] text-text-muted">
                        From
                        <input
                          type="date"
                          value={query.from}
                          onChange={(event) => onChange({ ...query, from: event.target.value })}
                          className="h-9 rounded-[8px] border border-border-strong bg-bg px-2 text-sm text-text"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] text-text-muted">
                        To
                        <input
                          type="date"
                          value={query.to}
                          onChange={(event) => onChange({ ...query, to: event.target.value })}
                          className="h-9 rounded-[8px] border border-border-strong bg-bg px-2 text-sm text-text"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
