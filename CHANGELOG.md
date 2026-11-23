# Changelog

All notable changes to Job Clipper are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-23 — Phase 8: QA, security, documentation and packaging

Automated checks from the 2026-11-23 session passed. Those results are unchanged and are listed under Recorded results. The project owner's earlier manual test of Phases 1–7 is unchanged and is not a result of that session. The project owner later reported that Phase 8 manual acceptance is complete. The test date, Chrome version and macOS version for that manual pass were not supplied. v1.0.0 is not committed and is not tagged. No integration is Verified.

### Added

- Playwright tests that load the unpacked extension and use the dashboard: manual create, edit, delete, status change, search, filters, CSV export, deadlines, navigation, and axe checks. They do not cover the toolbar popup, content-script injection, or operating-system notifications.
- A 2,000-job benchmark. `npm run bench` writes `reports/performance.json`. `npm run test:e2e` writes `reports/performance-browser.json`.
- `npm run security` and `npm run package`. The package command rebuilds and writes `release/job-clipper-1.0.0.zip`.
- A VoiceOver checklist and a v1.0.0 checklist in the README. The project owner later reported the VoiceOver checklist completed. Exact announcements were not supplied. The release checklist still has the git commit and the `v1.0.0` tag outstanding. Verified-site evidence was not supplied.

### Changed

- Runtime messages are accepted only from this extension's own pages, so a content script cannot drive the background worker.
- Extraction is refused when the tab URL is visible and is not `http` or `https`. Opening a saved listing checks the same rule again.
- A Kanban column with more than 40 cards shows the first 40 and a Show more control. The heading still counts the whole column.
- Deadline ordering uses a small cache. Company and title ordering share one collator. A burst of job writes runs one reminder reconciliation, then a follow-up if those writes changed reminders, instead of a full pass per write.
- Extension version is 1.0.0. No permission was added.

### Recorded results

- `npm run check`: passed. Vitest 41 files, 334 tests.
- `npm run test:e2e`: 5 passed.
- `npm run security`: 18 passed, 0 failed.
- `npm run package`: `release/job-clipper-1.0.0.zip`, 619,135 bytes, 38 files.
- The timings are in the README Phase 8 automated log. That log is the automated session. VoiceOver was not run in that session. The owner's test date, Chrome version and listing counts were not supplied.
- The project owner's manual Chrome test of Phases 1–7 remains the earlier installed-extension record. Indeed, HiringCafe, Glassdoor and ZipRecruiter stay manual-entry only.

### Manual acceptance reported later

Reported by the project owner. This is not part of the 2026-11-23 automated session. The test date, Chrome version and macOS version were not supplied. The README verification log is the full record.

- Clean Chrome profile installation: passed.
- Manual regression testing: passed.
- macOS VoiceOver checklist: completed. [Placeholder: what VoiceOver announced on each checklist row.]
- Backup and restore: tested. Step-by-step observations were not supplied.
- Delete-all: tested. Step-by-step observations were not supplied.
- CSV compatibility: tested in the applications the project owner used. [Placeholder: name each spreadsheet application.] Apple Numbers remains the earlier recorded result. Google Sheets, LibreOffice and Excel are not claimed.
- Chrome notification testing: completed. No screenshot was supplied.
- Phase 8 manual acceptance testing: completed.

The git commit and the `v1.0.0` tag have not been performed.

## [0.7.0] — 2026-11-23 — Phase 7: additional job-site adapters

Public job pages were inspected on 2026-11-23. Six adapters were added and left enabled so they can be tried in the popup. The extension was not installed, so none of these sites are Verified. Fixture tests are a separate record from that inspection. Indeed, HiringCafe, Glassdoor and ZipRecruiter stay on manual entry.

### Added

- Adapters for Wellfound, Y Combinator Jobs, Himalayas, We Work Remotely, Unstop and Cutshort. Each one fills the existing editable preview. Missing fields stay missing. Nothing is saved until you press Save.
- A deadline is stored only when the page evidence starts with Apply by, Apply before, Application deadline, Registration deadline, Last date to apply, or Deadline. "Posted on", a date in a sentence, and JSON-LD `validThrough` are still ignored. A month-first date such as "Dec 10, 2026" or "Dec 2th, 2026" is accepted only after one of those labels.
- A structured country list is used as eligibility evidence. India in the list still wins. A recognised country list that does not include India is Remote — restricted region. "Anywhere in the World" is worldwide. "NA" and an unrecognised token are not countries. A bare Remote or "Work from home" label, with no India evidence, stays Unknown.
- Placeholder pay is ignored: a JSON-LD salary of "Unpaid" or "Not Disclosed", and a USD salary whose minimum and maximum are both 1. Skills can be read from a JSON-LD string or a list of names.
- Canonical links for the six new sites, so the same listing with a tracking parameter or a company-prefixed Wellfound path matches an existing save.
- Parser fixtures for every new adapter: missing fields, a page that is not a listing, an empty heading, URL ids, eligibility, and a deadline that must not be invented. Indeed, HiringCafe, Glassdoor and ZipRecruiter stay unsupported in those tests.

### Changed

- Extension version is 0.7.0. No permission was added.

### Not in this version

- An installed-extension check of any Phase 7 adapter. The Phase 7 checklist in the README is not recorded.
- Indeed. `in.indeed.com` returned a Cloudflare challenge on 2026-11-22 and again on 2026-11-23. It was not bypassed.
- HiringCafe, Glassdoor and ZipRecruiter. The inspection was time-boxed. HiringCafe did not show a job detail, Glassdoor's direct listing returned a "Humans only" block, and ZipRecruiter did not show an India job detail. None of those blocks were bypassed.
- `workatastartup.com`. It returned HTTP 406 and is not part of the Y Combinator adapter.
- Phase 8.

## [0.6.0] — 2026-11-23 — Phase 6: CSV export and data management

Automated checks pass (301 tests). That session did not install the extension and did not open a CSV in a spreadsheet. A later manual check confirmed Phases 1–5, and another confirmed the Phase 6 workflows in the README verification log, including search, filters, sorting, filtered and full CSV downloads, and a CSV opened in Apple Numbers with the data and columns displaying correctly. The test date, Chrome version and macOS version were not recorded. Those manual checks are separate from the automated tests. Backup, restore and delete-all were not part of them.

### Added

- Search across title, company, location, city, country, skills, description and notes. Every word must match, ignoring case and accents. Filters for status, result, source, employment, category, India eligibility, work arrangement, experience and deadline. Values inside one filter match with OR. Filters combine with AND. A date range does not include a job that has no deadline.
- Sort by recently saved, deadline approaching, recently updated, company A–Z or job title A–Z. Deadline approaching is the default, and jobs with no deadline go last only for that sort. The search, filters and sort are stored in the Applications hash. Clear all resets them. `/` or Ctrl/Cmd+K focuses search.
- CSV export of every saved application from Settings and the top bar, named `job-clipper-all-YYYY-MM-DD.csv`. From Applications, a filtered board downloads `job-clipper-filtered-YYYY-MM-DD.csv` containing the jobs on screen. The file is UTF-8 with a BOM and CRLF rows. A deadline cell is empty when the job has none. Cells that start with `=`, `+`, `-`, `@`, a tab or a return are prefixed with `'`.
- The specification's columns come first. Further columns carry the remaining stored fields, including the canonical link, compensation parts, status history, reminder settings and extraction evidence. The description column is off unless you turn it on. The page says whether it was included.
- A JSON backup of every application and the reminder, profile and CSV settings (`job-clipper-backup-YYYY-MM-DD.json`). Restore can merge or replace. Merge keeps applications that exist only on this device, and you choose whether a matching id or link is skipped or overwritten. Replace removes every application on the device and uses the file's settings. Both ask you to confirm. Replace requires the typed word REPLACE.
- Backup files are checked before anything is written. A file over 5 MB, malformed JSON, an unknown field, a bad URL, a duplicate id, or a schema version other than 1 is refused, and the data already saved stays. New jobs and a journal are written together. Old keys are removed after that. If the removal fails, the journal finishes on the next launch. After a successful import or a full delete, reminder alarms are reconciled with the jobs that remain.
- A storage meter against the 10 MB local quota, with a warning past 70%. Delete all data requires the typed word DELETE, then clears applications, resets settings and clears unsaved popup drafts.

### Changed

- Extension version is 0.6.0. No permission was added.
- The description column starts off. A CSV preference that was never saved is recorded as off once. A choice you already saved is kept.
- The Overview line for jobs with no deadline opens the Applications filter for that case.

### Not in this version

- Google Sheets, LibreOffice and Excel. Apple Numbers was later confirmed in the installed extension: the CSV opened, and the data and columns displayed correctly. The test date, Chrome version and macOS version were not recorded.
- A reported manual check of backup, restore or delete-all. Those controls are implemented. The manual report confirmed the Settings and data-management interface and did not include those actions.
- `zod`. Backup checks are written in this project. Schema version is still 1, so an older backup shape does not exist to import. An older-schema migration is not supported and was not verified.
- Phase 7 job sites. Those adapters were added in 0.7.0. This 0.6.0 release did not include them.

## [0.5.0] — 2026-11-22 — Phase 5: deadline reminders and calendar

Automated checks pass (269 tests). That session did not install the extension, so it did not show a notification and no screenshot is recorded. A later manual check confirmed deadline reminders and notifications in the installed extension; the test date, Chrome version and macOS version were not recorded.

### Added

- Deadline reminders through `chrome.alarms` and `chrome.notifications`. A reminder is created only for a valid deadline that is still ahead, with the reminder turned on. The default is 1 day before at 09:00. A job can use same day, 1, 2, 3 or 7 days before, or a time that is before the deadline.
- Adding a deadline schedules the reminder. Clearing the deadline, turning the reminder off, or deleting the job removes the alarm. Editing the deadline or the default lead time replaces the existing alarm instead of adding a second one.
- Reconciliation when the extension is installed, when Chrome starts, when a job or the settings change, and every hour. A reminder that comes due while Chrome is closed is shown as missed on the next launch if the deadline has not passed, and marked expired if it has.
- If the chosen reminder time is already past and the deadline is not, the alarm is set about one minute ahead and the notification says the deadline is soon.
- "Remind me in 1 minute" on a job that has a future deadline. That notification does not replace the saved reminder; the previous reminder is scheduled again if it is still due. "Send test notification" in Settings, which is not a job reminder.
- Calendar month grid for deadlines, interviews and reminders. Jobs with no deadline are listed under "No deadline provided" and are not placed on a day. A narrow window shows an agenda. Overview deadline rows open the job, and the no-deadline line opens the calendar.
- Clicking a reminder opens `dashboard.html#/job/<id>`.
- Tests for scheduling, rescheduling, cancellation, missing and impossible dates, duplicate alarms, missed and on-time notifications, local date boundaries, restoring the saved reminder after "Remind me in 1 minute", a missed notification after alarms are wiped, deleting a job whose alarm has already fired, and topping up the 400-alarm cap.

### Fixed

- Deleting a job clears its notification even when the alarm has already fired. A reminder past the 400-alarm cap does not keep a stale alarm, and the next free slot arms the following reminder.

### Changed

- Extension version is 0.5.0. The manifest requests `alarms` and `notifications` in addition to `storage`, `activeTab` and `scripting`.
- New applications take the Settings choice for whether reminders start on. Jobs already saved keep their own reminder switch.

### Not in this version

- A notification screenshot. Deadline notifications were later confirmed in the installed extension. The test date, Chrome version and macOS version were not recorded, and no screenshot was provided.
- Search, filters, sorts and CSV export.

## [0.4.0] — 2026-11-22 — Phase 4: job listing extraction

Automated checks are in the README verification log. That session did not install the extension. Internshala, LinkedIn Jobs and Naukri were read from public pages. A later manual check confirmed those three extraction workflows in the installed extension. The test date, Chrome version and listing count were not recorded, so the sites are not marked Verified. Fixture tests are not that manual check.

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

Automated checks pass (123 tests). That session did not test the installed extension. A later manual check confirmed the four-stage Kanban board and application management. The test date, Chrome version and macOS version were not recorded. That manual check is separate from these automated tests.

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

Automated checks pass (101 tests). That session did not test the installed extension. A later manual check confirmed editing saved application fields. The test date, Chrome version and macOS version were not recorded. That manual check is separate from these automated tests.

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

Automated checks pass. That session did not test the installed extension. A later manual check confirmed one-click job saving and the manual-entry fallback. The test date, Chrome version and macOS version were not recorded. See the README verification log. That manual check is separate from these automated tests.

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
