# Job Clipper

An offline-first Chrome extension for clipping, tracking and getting reminded about internships and entry-level jobs, with an honest check of whether each opportunity is actually open to an applicant based in India.

Built for the Bharat Space Education Research Centre (BSERC) GenAI Internship — Week 2, Project 10.

> **Current status: Phase 0 (planning) complete. No application code exists yet.**
> Every feature below is **Planned**. Nothing in this README claims implemented or tested functionality. This file is updated at the end of each phase with real results only.

## Documents

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md): full product requirements, architecture, design system, integration strategy, testing strategy and phased roadmap.
- [`prompts.md`](prompts.md): every prompt used in this project, in chronological order, verbatim.
- [`CHANGELOG.md`](CHANGELOG.md): version history.

## What it will do

- Save the job you are viewing in one click: role, company, link and deadline.
- Detect job details automatically on supported sites, and always fall back to manual entry on every other website.
- Let you edit every saved field.
- Track applications on a Kanban board: Saved, Applied, Interview, Result (outcomes: Selected, Rejected, Withdrawn, No response).
- Send real Chrome notifications before deadlines, recovering reminders after Chrome restarts and extension updates.
- Search, filter and sort applications, and export all or filtered applications to CSV.
- Classify India eligibility from evidence on the page (India on-site or hybrid, Remote — India eligible, Remote — Worldwide, Remote — Restricted region, International — Relocation required, or Unknown). A "Remote" label alone never counts as India-eligible.

It runs entirely in your browser: no backend, no login, no paid API, no cloud service.

## Status

### Mandatory BSERC features

| Feature | Status | Planned phase |
| --- | --- | --- |
| One-click save of role, company, link and deadline | Planned | 1 (manual), 4 (auto-detect) |
| Every saved field editable | Planned | 2 |
| Kanban board: Saved, Applied, Interview, Result | Planned | 3 |
| Reminder before an application deadline | Planned | 5 |
| Search and CSV export | Planned | 3 (search), 6 (CSV) |

### BSERC completion criteria

| Criterion | Status |
| --- | --- |
| Works on three different job websites | Not yet tested |
| Manual entry when details cannot be detected | Not yet tested |
| A deadline reminder actually appears | Not yet tested |
| Exported CSV opens correctly in a spreadsheet | Not yet tested |

### Additional planned features

India eligibility classification, duplicate detection, calendar view, JSON backup and import, Northline-inspired dark dashboard and popup. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for details.

## Job site support

Listed in integration priority order. A site is marked **Verified** only after its adapter has been tested on at least three real, accessible listings, with the date and Chrome version recorded in the verification log below. Manual entry works on every website regardless of this table.

The first milestone (Phase 4) is three genuinely tested sites: Internshala, LinkedIn Jobs and Naukri. If one of them can't be accessed reliably, the next site in order takes its place.

| # | Site | Tier | Status |
| --- | --- | --- | --- |
| 1 | Internshala | 1 | Planned |
| 2 | LinkedIn Jobs | 1 | Planned |
| 3 | Naukri | 1 | Planned |
| 4 | Wellfound | 1 | Planned |
| 5 | Indeed | 1 | Planned |
| 6 | Y Combinator Jobs | 1 | Planned |
| 7 | Himalayas | 2 | Planned |
| 8 | We Work Remotely | 2 | Planned |
| 9 | Unstop | 2 | Planned |
| 10 | Cutshort | 2 | Planned |
| 11 | HiringCafe | 3 | Planned |
| 12 | Glassdoor | 3 | Planned |
| 13 | ZipRecruiter | 3 | Planned |

Possible statuses: Planned, In development, Verified, Manual entry only (with a reason).

## Deadlines

- A job can be saved without a deadline. It is then shown as "No deadline provided".
- A deadline is filled in automatically only when the page shows an explicitly labelled application deadline (for example Internshala's "Apply By"). It is never guessed from listing-expiry dates or description text.
- You can add, edit or clear a deadline at any time.
- Reminders are scheduled only for jobs with a valid deadline.

## Planned permissions

| Permission | Why |
| --- | --- |
| `storage` | Save jobs and settings locally on your device. |
| `alarms` | Schedule deadline reminders that survive the background worker being suspended. |
| `notifications` | Show deadline reminder notifications. |
| `activeTab` | Read only the tab you are on, and only when you click the extension icon or press its shortcut. |
| `scripting` | Run the read-only job detector in that tab after you click. |

Deliberately **not** requested: access to all websites (`host_permissions`), `tabs`, `downloads`, `cookies`, `unlimitedStorage`. The extension makes no network requests.

## Privacy

- All data stays on your device in `chrome.storage.local`. Nothing is sent anywhere.
- No analytics, tracking or remote code.
- The extension never reads cookies, passwords, session data or form inputs on job sites, and never bypasses login walls or bot checks. It reads only what you can already see on the page you clipped.
- Uninstalling the extension deletes its data. The planned JSON backup feature lets you keep a copy first.

## Known limitations (planned behaviour)

- Most job sites don't publish an application deadline, so many jobs will show "No deadline provided" until you add one. Those jobs get no reminder.
- Reminders fire only while Chrome is running; missed reminders appear the next time Chrome starts.
- On macOS, Chrome must be allowed to show notifications (System Settings → Notifications → Google Chrome), and Focus modes can hide them.
- Site layouts change, so automatic detection can break. Manual entry always remains available.
- Local storage is limited to about 10 MB, and there is no cross-device sync.

## Tech stack (planned)

Chrome Extension Manifest V3, React, TypeScript, Vite, Tailwind CSS, `@dnd-kit`, `zod`, Vitest, Playwright. Fonts (Instrument Serif, Inter, JetBrains Mono) and icons are bundled locally so the extension works offline.

## Installation

Not available yet. Build and "Load unpacked" instructions will be added in Phase 1.

## Verification log

Real test results only, added as each phase is completed. Each entry records the date, Chrome version, macOS version, what was tested and the outcome, including failures.

_No entries yet. No testing has been performed because no code has been written._

## Design reference

The visual direction is inspired by a screenshot of the Northline website ([`docs/design-reference/northline-reference.png`](docs/design-reference/northline-reference.png)). Job Clipper adapts its design language (near-black backgrounds, lime-green glow, editorial serif headlines) but does not copy Northline's branding, logo, content or exact interface. The screenshot is a reference only and is not bundled into the extension.
