# Job Clipper

An offline-first Chrome extension for clipping, tracking and getting reminded about internships and entry-level jobs, with an honest check of whether each opportunity is actually open to an applicant based in India.

Built for the Bharat Space Education Research Centre (BSERC) GenAI Internship — Week 2, Project 10.

> **Current status: Phase 2 (complete job management) implemented, awaiting review.**
> Automated checks pass (type checking, ESLint, Prettier, 101 Vitest tests, production build). The extension has **not yet been manually tested in Chrome**; see the [Phase 1](#manual-verification-checklist-phase-1) and [Phase 2](#manual-verification-checklist-phase-2) checklists. Features from later phases are still **Planned**. This file is updated at the end of each phase with real results only.

## Documents

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md): full product requirements, architecture, design system, integration strategy, testing strategy and phased roadmap.
- [`prompts.md`](prompts.md): every prompt used in this project, in chronological order, verbatim.
- [`CHANGELOG.md`](CHANGELOG.md): version history.

## What works now (Phase 1)

- **Popup** (toolbar icon or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd>): a manual entry form for job title, company, job URL and an optional deadline (date, plus an optional time). The URL and page title are prefilled from the current tab. On browser pages that aren't regular websites (for example `chrome://` pages) nothing is prefilled, and the form still works.
- **Validation:** title, company and URL are required. Only `http://` and `https://` links are accepted. Errors appear next to each field, and focus moves to the first problem.
- **Drafts:** whatever you type in the popup is kept in `chrome.storage.session` for that tab. If the popup closes before you save, reopening it restores the entry. The draft is cleared on save, and session storage is wiped when Chrome quits.
- **No deadline is fine:** a job without a deadline is saved with `deadline: null` and shown as "No deadline provided". Deadlines are never guessed.
- **Dashboard** (opens automatically on first install, or via "Open dashboard"): hash-routed pages for Overview, Applications, Calendar and Settings, in a Northline-inspired dark editorial design.
  - **Overview** has the "Your next opportunity starts here." hero, four statistics (Tracked, Applied this week, Interviews, Due in 7 days), and three panels: Recently saved, Application overview (weekly saves chart and pipeline), and Upcoming deadlines (14-day timeline).
  - Every number is calculated from your saved jobs. With nothing saved, the panels show empty states, never sample data.
  - **Add application** opens the same manual form in a dialog, with no job page needed.
  - The dashboard updates live when a job is saved, edited or deleted, including from the popup.
  - Calendar and Settings are honest placeholders that say which phase brings their features.
- **Applications:** a list of every saved job (the Kanban board is still Phase 3). Open one to see its details.
- **Editing:** a right-hand sheet edits every stored field: title, company, URL, source, description, location, work arrangement, India eligibility (chosen by you, never classified automatically), employment, pay, skills, status, result, applied and interview dates, deadline, notes and contact. Clearing the deadline stores `null` and shows "No deadline provided". Status changes are appended to the job's history.
- **Delete:** Delete asks for confirmation and names the job. Cancel leaves it in place.
- **Duplicates:** links are compared after normalisation (host case, a leading `www.`, tracking parameters, and the LinkedIn and Indeed shapes in the spec). The same link, or the same site job id, shows "Already saved on …". A very similar company and title saved within 60 days is called out too. You can open the existing application, edit it, or save a separate copy. Nothing is overwritten silently. An edit made from an older copy is refused if the stored job changed in the meantime.
- **Storage:** each job is stored under its own `job:<uuid>` key in `chrome.storage.local`, with IDs from `crypto.randomUUID()`. Default settings and a schema version are written on install. Existing data is kept on update. Schema version stays 1; the migration runner is a no-op until a later version needs a step.

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
| One-click save of role, company, link and deadline | Manual entry implemented (Phase 1), not yet manually tested in Chrome; auto-detect Planned | 1 (manual), 4 (auto-detect) |
| Every saved field editable | Implemented (Phase 2), not yet manually tested in Chrome | 2 |
| Kanban board: Saved, Applied, Interview, Result | Planned | 3 |
| Reminder before an application deadline | Planned | 5 |
| Search and CSV export | Planned | 3 (search), 6 (CSV) |

### BSERC completion criteria

| Criterion | Status |
| --- | --- |
| Works on three different job websites | Not yet tested |
| Manual entry when details cannot be detected | Implemented and covered by automated tests; not yet manually tested in Chrome |
| A deadline reminder actually appears | Not yet tested |
| Exported CSV opens correctly in a spreadsheet | Not yet tested |

### Additional planned features

Automatic India eligibility classification, calendar view, JSON backup and import. Duplicate warnings are implemented. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for details. The Northline-inspired dark dashboard and popup are implemented.

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

## Permissions

The extension requests only the permissions its shipped features use. Phase 1 requests two:

| Permission | Status | Why |
| --- | --- | --- |
| `storage` | Requested (Phase 1) | Save jobs and settings locally (`chrome.storage.local`) and keep popup drafts (`chrome.storage.session`). |
| `activeTab` | Requested (Phase 1) | Read the current tab's URL and title to prefill the popup, only when you click the extension icon or press its shortcut. |
| `scripting` | Planned (Phase 4) | Run the read-only job detector in that tab after you click. |
| `alarms` | Planned (Phase 5) | Schedule deadline reminders that survive the background worker being suspended. |
| `notifications` | Planned (Phase 5) | Show deadline reminder notifications. |

The Phase 0 plan lists all five. The last three are added in the phases that use them, so Phase 1 doesn't ask for access it never exercises. Adding them later makes Chrome show a permission prompt when the extension updates.

Deliberately **not** requested: access to all websites (`host_permissions`), `tabs`, `downloads`, `cookies`, `unlimitedStorage`. The extension makes no network requests, and its content security policy (`script-src 'self'`) allows only its own bundled scripts.

## Privacy

- All data stays on your device in `chrome.storage.local`. Nothing is sent anywhere.
- No analytics, tracking or remote code.
- The extension never reads cookies, passwords, session data or form inputs on job sites, and never bypasses login walls or bot checks. It reads only what you can already see on the page you clipped.
- Uninstalling the extension deletes its data. The planned JSON backup feature lets you keep a copy first.

## Known limitations

### Current build

- There is no Kanban board, drag-and-drop, or search. Applications is a list. Status is changed in the editor.
- Nothing is read from the page except the tab's URL and title. Company, description and deadline are typed. India eligibility is a manual choice, not a classifier.
- Reminders are stored with the job but are not scheduled or shown. No calendar, CSV export or backup yet.
- "Explore opportunities" scrolls to the Overview panels.
- A similar title and company is only flagged for jobs saved in the last 60 days. Older ones are left alone unless the link matches.
- Not yet manually tested in Chrome (see the checklists below).

### Planned behaviour

- Most job sites don't publish an application deadline, so many jobs will show "No deadline provided" until you add one. Those jobs get no reminder.
- Reminders fire only while Chrome is running; missed reminders appear the next time Chrome starts.
- On macOS, Chrome must be allowed to show notifications (System Settings → Notifications → Google Chrome), and Focus modes can hide them.
- Site layouts change, so automatic detection can break. Manual entry always remains available.
- Local storage is limited to about 10 MB, and there is no cross-device sync.

## Tech stack

In use (Phase 1): Chrome Extension Manifest V3, React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, date-fns, lucide-react icons, Vitest 5 with Testing Library and jsdom, ESLint 10 and Prettier.

Fonts (Instrument Serif, Inter and JetBrains Mono, via Fontsource) and icons are bundled into the build, so the extension makes no remote requests and works offline.

Planned for later phases: `@dnd-kit` (Kanban), `zod` (import validation), Playwright (end-to-end tests).

TypeScript is pinned to 6.0.x because `typescript-eslint` does not yet support TypeScript 7.

## Installation

Requirements: Node.js 22.12 or newer (developed with Node 25.9 and npm 11.12), and Google Chrome 120 or newer.

```sh
npm install
npm run build
```

Then load the extension:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist` folder in this project.
4. The dashboard opens in a new tab on first install. Pin Job Clipper from the toolbar's puzzle-piece menu to reach the popup easily.

After changing the code, run `npm run build` again and click the reload icon on the extension's card in `chrome://extensions`. `npm run dev` rebuilds on every save, but you still need to reload the extension.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run dev` | Rebuild `dist/` on every change |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run format:check` / `npm run format` | Check / apply Prettier formatting |
| `npm test` | Run the Vitest suite once |
| `npm run check` | All of the above, in order |
| `npm run icons` | Regenerate the toolbar icons in `public/icons/` |

## Project structure

```text
public/            manifest.json and toolbar icons (copied into dist/)
popup.html         popup entry page
dashboard.html     dashboard entry page
src/
  background/      service worker: install/update initialisation
  core/            pure logic, no Chrome APIs: data model, validation, URL and text
                   normalisation, duplicate detection, deadline formatting, overview statistics
  storage/         typed chrome.storage wrapper, job repository (create, read, update,
                   delete), settings, migrations, popup drafts
  popup/           popup app: tab context, clip form, duplicate warning, saved state
  dashboard/       dashboard app: hash router, layout, Overview, application list,
                   job sheet (details, edit, delete)
  ui/              shared components, hooks, design tokens and global styles
tests/             test setup, in-memory chrome.* fake, test data factory
scripts/           icon generator
```

## Automated tests

`npm test` runs 101 tests in 13 files against an in-memory fake of the `chrome.*` APIs (`tests/fakes/chrome.ts`). They cover:

- **Repository:** creating, updating and deleting jobs, refusing a duplicate link unless the save is intentional, refusing an edit that would overwrite a different job, refusing a stale edit, listing newest first, and live subscriptions.
- **Duplicates and URLs:** canonical links (www, tracking parameters, LinkedIn job id, Indeed job id) and probable company-and-title matches.
- **Validation:** required fields, non-http(s) URLs, optional deadlines, impossible dates, and the full edit form (including a required result).
- **Popup:** manual entry, prefill, restricted pages, saving without a deadline, drafts, and the duplicate warning.
- **Dashboard:** statistics from real data, empty states, live updates, the add dialog, opening a job, editing it, delete confirmation, and hash routing.
- **Background:** install initialisation and preservation of existing data on update.

## Manual verification checklist (Phase 1)

These checks need a real Chrome profile and **have not been performed yet**. Record the date, Chrome version and macOS version when you run them, and note any failure.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, then load `dist/` with "Load unpacked": no errors or warnings on the extension card, and the service worker is listed as active. | Not yet performed |
| 2 | On first install the dashboard opens in a new tab and shows the empty Overview (all statistics 0, empty-state panels). | Not yet performed |
| 3 | On a job listing page, clicking the icon (or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd>) opens the popup with the page URL and title prefilled. | Not yet performed |
| 4 | Clicking Save with Company empty shows "Enter the company name." and focuses that field. Entering `javascript:alert(1)` as the URL is rejected. | Not yet performed |
| 5 | Saving with no deadline shows the success state with "No deadline provided". | Not yet performed |
| 6 | Saving with a deadline shows "Due …" in the success state, and the job appears under Upcoming deadlines if it is due within 14 days. | Not yet performed |
| 7 | Typing in the popup, clicking elsewhere so it closes, then reopening it on the same tab restores the entry with "Restored your unsaved entry." | Not yet performed |
| 8 | On `chrome://extensions` or a new tab page, the popup shows the restricted-page notice and a manually typed job still saves. | Not yet performed |
| 9 | With the dashboard open in one tab, saving from the popup in another updates the Overview without a reload. | Not yet performed |
| 10 | Using only the keyboard (<kbd>Tab</kbd>, <kbd>Enter</kbd>, <kbd>Esc</kbd>): Dashboard → Add application opens the dialog with focus in Job title, Escape closes it, and a saved entry appears on the Overview with a confirmation message. Focus outlines are visible throughout. | Not yet performed |
| 11 | Overview, Applications, Calendar and Settings links work, as do browser back/forward and reloading on a `#/…` URL. At 360 px wide nothing overflows, and the menu button shows the navigation. With DevTools → Network set to Offline, a reload looks identical (fonts included) and no requests go anywhere except the extension's own files. With reduced motion on (macOS System Settings → Accessibility → Display), the animations stop. | Not yet performed |

## Manual verification checklist (Phase 2)

These checks need a real Chrome profile and **have not been performed yet**.

| # | Check | Result |
| --- | --- | --- |
| 1 | Save a job, then click it in Recently saved and on Applications. The sheet shows the title, company, link and "No deadline provided" when the deadline was left empty. | Not yet performed |
| 2 | Edit the title, city, India eligibility, status and notes. Save. The sheet, the list and the Overview statistics show the new values without a reload. Quit Chrome, reopen the dashboard, and the edit is still there. | Not yet performed |
| 3 | Add a deadline, save, and see it under Upcoming deadlines when it is within 14 days. Clear the deadline, save, and see "No deadline provided" again. | Not yet performed |
| 4 | Click Delete, then Cancel. The job remains. Click Delete, then Delete application. It disappears from the list, Recently saved and the statistics. | Not yet performed |
| 5 | Save the same URL a second time from the popup and from Add application (try a `www.` or `utm_` variant of the link). Both show "Already saved on …". Save anyway creates a second entry and leaves the first unchanged. Open existing opens that job. | Not yet performed |
| 6 | Save the same company and title with a different URL. A similar-application warning appears. A different title at that company does not. | Not yet performed |
| 7 | Open the dashboard in two windows, edit the same job in both, and save the second window last. It reports that the application changed elsewhere and does not replace the first save until you choose "Show the latest version". | Not yet performed |

## Verification log

Real test results only, added as each phase is completed. Each entry records the date, Chrome version, macOS version, what was tested and the outcome, including failures.

### 2026-11-22 — Phase 1, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run typecheck`: passed, 0 errors.
- `npm run lint`: passed, 0 errors, 0 warnings.
- `npm run format:check`: passed.
- `npm test`: 10 files, 77 tests, all passed.
- `npm run build`: passed. `dist/` contains `manifest.json`, `background.js`, `popup.html`, `dashboard.html`, the icons and the bundled assets, with no inline scripts and no remote URLs loaded.
- In-browser preview: the built pages were opened from a local server in a browser with a stand-in for the `chrome.*` APIs, to check layout and interaction (popup at 380 px, dashboard at desktop and phone widths, validation, saved state, dialog). This is **not** a test of the installed extension, and none of the manual checklist items above count as performed.

### 2026-11-22 — Phase 2, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. That runs typecheck (0 errors), ESLint (0 errors, 0 warnings), Prettier, Vitest (13 files, 101 tests, all passed) and the production build.
- No manual test in an installed extension was performed. The Phase 1 and Phase 2 checklists above are still open.

_No manual tests in Chrome have been performed yet._

## Design reference

The visual direction is inspired by a screenshot of the Northline website ([`docs/design-reference/northline-reference.png`](docs/design-reference/northline-reference.png)). Job Clipper adapts its design language (near-black backgrounds, lime-green glow, editorial serif headlines) but does not copy Northline's branding, logo, content or exact interface. The screenshot is a reference only and is not bundled into the extension.
