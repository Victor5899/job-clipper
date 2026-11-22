# Changelog

All notable changes to Job Clipper are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Search, filters and sorts are not implemented. Deadline reminders and CSV export have not been started.

## [0.4.0] — 2026-11-22 — Phase 4: job listing extraction

Automated checks are in the README verification log. The extension was not installed in Chrome. Internshala, LinkedIn Jobs and Naukri were read from public pages; that is not a Verified status. Fixture tests are not proof of live compatibility.

### Added

- Separate adapters for Internshala, LinkedIn Jobs and Naukri. Each is enabled for this review build and marked not verified.
- A read-only extractor injected with `chrome.scripting` after the popup opens. The popup shows an editable preview, names missing fields, and saves only when you confirm. A failed or unsupported page keeps manual entry.
- India eligibility is classified separately from work arrangement. Outcomes: India on-site, India hybrid, Remote — India eligible, Remote — worldwide, Remote — restricted region, International — relocation required, or Unknown. A Remote label by itself stays Unknown. "Work from home" stays Unknown too, including on Internshala and Naukri, unless the page has an applicant-location requirement of India, a phrase such as "Remote (India)" or "Anywhere in India", or India in the eligible-country list. You can change the suggestion before saving.
- A deadline only when the page has an explicit label such as "Apply By". `validThrough`, a start date, and a date inside a sentence are ignored.
- Parser tests with trimmed HTML fixtures, eligibility cases, merge order, messaging, injection failure, and the popup preview. The fixtures are excerpts, not a live-site certificate.

### Changed

- Extension version is 0.4.0. The manifest requests `scripting` in addition to `storage` and `activeTab`.
- Canonical links also keep the trailing id on an Internshala detail URL and a Naukri `/job-listings-…` URL.

### Not in this version

- Wellfound and Y Combinator Jobs. Both responded on 2026-11-22 and were left for later because the first three sites could be read.
- Indeed. A request returned a Cloudflare challenge and was not bypassed.
- Search, filters, deadline notifications and CSV export.

## [0.3.0] — 2026-11-22 — Phase 3: Kanban board

Automated checks pass (123 tests). Not yet manually tested in Chrome.

### Added

- Applications board with four columns: Saved, Applied, Interview and Result. Cards show the title, company, deadline (or "No deadline provided"), India eligibility and source.
- Drag and drop between columns (pointer, touch and keyboard) via `@dnd-kit/core`, with a screen-reader announcement. The Move to list, the outcome list on Result cards, and <kbd>[</kbd> / <kbd>]</kbd> on a focused card change the stage without dragging.
- Moving into Applied stores `appliedAt` when it was empty. Moving into Interview offers an optional date and still saves the stage if you skip it. Moving into Result asks for Selected, Rejected, Withdrawn or No response, and can stay "Outcome not set".
- `moveJob` and `recordInterviewDate` on the existing job repository. Invalid stage and outcome values are rejected and nothing is written. A stale move is refused the same way a stale edit is.
- Below 768 px, a stage switcher shows one column. While a card is being dragged, every column is shown so it can be dropped. From 768 px the columns scroll sideways; from 1280 px all four sit in a row.
- Tests for stage changes, invalid stages, persistence across a fresh read, board rendering, the accessible move controls, and the Overview counts after a move.

### Changed

- Extension version is 0.3.0.
- The Applications list is now the board. Opening a card still uses the existing details, editor and delete confirmation.
- Overview statistics and the pipeline bar already count jobs by `status`. A board move updates them through the same storage subscription.

### Not in this version

- Search, filters, sorts and URL-persisted filter state from the Phase 3 specification.
- Page extraction, deadline notifications and CSV export.

## [0.2.0] — 2026-11-22 — Phase 2: complete job management

Automated checks pass (101 tests). Not yet manually tested in Chrome.

### Added

- Job sheet on the dashboard: view details, edit every stored field, and delete after a confirmation that names the job.
- Applications list. The Kanban board remains Phase 3. Opening a row, or a Recently saved row, opens the sheet. `#/applications?job=<id>` reopens it, and `&edit=1` opens the editor.
- Full edit form: basics, location, manual India eligibility, employment, tracking (status, result, dates, deadline, notes) and contact. Status changes are appended to `statusHistory`. A cleared deadline is stored as `null`.
- Duplicate detection. URLs are canonicalised (lowercase host, leading `www.` removed, fragment and tracking parameters dropped, LinkedIn `/jobs/view/<id>` and Indeed `viewjob?jk=` shapes). The same canonical URL or the same source job id is an exact match. A company and title with at least 0.9 token overlap, saved within 60 days, is a probable match.
- Duplicate warning in the popup and in Add application, with Open existing, Update existing, Save anyway and Back. Save anyway writes a new job. Existing jobs are not overwritten.
- `updateJob` refuses the write when `expectedUpdatedAt` is older than the stored job, and when the new URL belongs to a different saved job.
- Migration runner. Schema version stays 1, so it does not rewrite existing data.
- Tests for canonical URLs, the duplicate matrix, form validation, edits, deletion, conflicts and the dashboard update path.

### Changed

- Extension version is 0.2.0.
- `createJob` stores the canonical URL and, when the link has one, a source job id. An exact duplicate throws `DuplicateJobError` unless `allowDuplicate` is set.
- Overview statistics, Recently saved and the applications list refresh after create, update and delete through the existing storage subscription.

## [0.1.0] — 2026-11-22 — Phase 1: foundation, design system, dashboard shell and manual entry

Automated checks pass. Not yet manually tested in Chrome (see the README checklist).

### Added

- Manifest V3 extension built with Vite 8, React 19, TypeScript 6 (strict) and Tailwind CSS 4.
  - Module service worker (`background.js`), popup and dashboard pages.
  - Toolbar shortcut <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd>.
  - Content security policy `script-src 'self'; object-src 'self'`.
  - Generated toolbar icons at 16, 32, 48 and 128 px.
- Design system: Northline-inspired tokens (`src/ui/styles/tokens.css`) and shared components (buttons, text fields, panels, dialog, status pills, empty states, stat numbers). Instrument Serif, Inter and JetBrains Mono are bundled locally.
- Core model:
  - The full `JobApplication` and `Settings` types from the specification.
  - Manual entry validation: required title, company and URL; http/https only; URLs up to 2048 characters; optional date and time.
  - URL and text normalisation, deadline formatting ("No deadline provided" when absent), and overview statistics.
- Storage:
  - Typed `chrome.storage` wrapper.
  - Job repository with `createJob`, `listJobs` and `subscribeJobs`, using per-job `job:<uuid>` keys and `crypto.randomUUID()` IDs.
  - Settings initialisation on install that preserves existing data on update.
  - Per-tab popup drafts in `chrome.storage.session`.
- Popup (380 px):
  - Manual entry with URL and title prefilled from the active tab, and a restricted-page notice.
  - Inline validation with focus on the first error, and draft restore.
  - Sticky footer with Save to Job Clipper and Open dashboard, plus a success state.
- Dashboard:
  - Hash routing for Overview, Applications, Calendar and Settings, with a responsive top navigation and mobile menu.
  - Overview hero and four real statistics.
  - Recently saved, Application overview (weekly chart and pipeline) and Upcoming deadlines (14-day timeline) panels, each with an empty state.
  - Add application dialog.
  - Live updates via `chrome.storage.onChanged`.
- Tests: 77 Vitest tests over an in-memory `chrome.*` fake (`tests/fakes/chrome.ts`), covering the repository, validation, drafts, the popup, dashboard statistics, routing and install handling.
- Tooling: ESLint flat config (bans `dangerouslySetInnerHTML`, `innerHTML` and `outerHTML`), Prettier, and an `npm run check` script.

### Changed

- Permissions: Phase 1 requests only `storage` and `activeTab`. `scripting`, `alarms` and `notifications` from the Phase 0 plan are deferred to Phases 4 and 5, where they are first used. This follows least privilege; adding them later triggers Chrome's permission prompt on update.
- `text-subtle` design token adjusted to `#82857a` so small labels meet WCAG AA contrast on the darkest surfaces.

### Deferred

- The separate content-script build config (`vite.content.config.ts`) and the notification icon arrive with the phases that need them (Phases 4 and 5).
- "Explore opportunities" scrolls to the dashboard panels until its full feature exists.

### Known gaps

- `prompts.md` entry 4 (the Phase 1 prompt) has a placeholder where the verbatim text belongs, because the exact wording could not be retrieved. It must be pasted in by the author.

## [0.0.0] — 2026-11-22 — Phase 0 planning

No application code. Planning and documentation only.

### Added

- `PROJECT_SPEC.md`: Phase 0 specification covering product requirements, user stories and journeys, functional and non-functional requirements, architecture, folder structure, data model and storage, Manifest V3 permission plan, component hierarchy, Northline-inspired design system, responsive strategy, integration strategy for all 13 job sites, India eligibility classification, Kanban design, reminder and alarm recovery strategy, search and filtering, CSV export specification, security and privacy, offline plan, testing strategy and phased roadmap.
- `prompts.md`: chronological, verbatim log of every prompt (entries 1–3).
- `README.md`: project overview with every feature marked Planned, site support table, planned permissions, privacy statement and an empty verification log.
- `docs/design-reference/northline-reference.png`: visual reference screenshot (not bundled into the extension).

### Changed (plan Revision 1, 2026-11-22)

- Integration priority fixed: Internshala, LinkedIn Jobs, Naukri, Wellfound, Indeed, Y Combinator Jobs, Himalayas, We Work Remotely, Unstop, Cutshort, HiringCafe, Glassdoor, ZipRecruiter. The three-tier structure is preserved.
- The first integration milestone is three genuinely tested sites (Internshala, LinkedIn Jobs, Naukri, with a substitution rule). Sites 4–13 move to Phase 7 and do not block the mandatory BSERC features.
- Deadlines are optional, displayed as "No deadline provided" when unknown, and never inferred. They are read only from explicitly labelled page fields or entered by the user.
- Reminders are scheduled only when a valid deadline exists.
- Manual clipping is guaranteed on every website, including sites without a verified adapter.
- Reminders (Phase 5) and CSV export (Phase 6) now come before the remaining integrations. The MVP gate at the end of Phase 6 covers all five mandatory features and all four completion criteria.
