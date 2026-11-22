# Changelog

All notable changes to Job Clipper are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Phase 2 (editing saved jobs) is pending approval of Phase 1.

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
