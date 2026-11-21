# Changelog

All notable changes to Job Clipper are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Phase 1 (extension foundation, design system, dashboard shell and manual job entry) is pending approval.

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
