# Job Clipper

An offline-first Chrome extension for clipping, tracking and getting reminded about internships and entry-level jobs, with an honest check of whether each opportunity is actually open to an applicant based in India.

Built for the Bharat Space Education Research Centre (BSERC) GenAI Internship — Week 2, Project 10.

> **Current status: Phases 1–7 implemented and manually tested in Chrome by the project owner. Phase 8 is the remaining phase.**
> The project owner confirmed that the implemented functionality works. The test date, Chrome version, macOS version and listing counts were not supplied, so no integration is Verified. Automated checks, public-page inspection and installed-extension checks stay separate entries in the [verification log](#verification-log). Indeed, HiringCafe, Glassdoor and ZipRecruiter remain manual-entry only. See [What was manually tested](#what-was-manually-tested).

## Documents

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md): full product requirements, architecture, design system, integration strategy, testing strategy and phased roadmap.
- [`prompts.md`](prompts.md): every prompt used in this project, in chronological order, verbatim.
- [`CHANGELOG.md`](CHANGELOG.md): version history.

## What works now

- **Popup** (toolbar icon or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd>): on an Internshala, LinkedIn, Naukri, Wellfound, Y Combinator, Himalayas, We Work Remotely, Unstop or Cutshort job page, the extension reads the listing in the tab you already have open and shows an editable preview. Missing fields are named. Nothing is saved until you press Save. You can change every detected value, including India eligibility. Those nine integrations were manually tested in Chrome. They are not Verified. If the page is not a supported listing, or the read fails, the same manual form is there: URL and page title prefilled, company empty. Indeed, HiringCafe, Glassdoor and ZipRecruiter stay on that form. On browser pages that aren't regular websites (for example `chrome://` pages) nothing is prefilled, and the form still works.
- **Validation:** title, company and URL are required. Only `http://` and `https://` links are accepted. Errors appear next to each field, and focus moves to the first problem.
- **Drafts:** whatever you type in the popup is kept in `chrome.storage.session` for that tab. If the popup closes before you save, reopening it restores the entry. The draft is cleared on save, and session storage is wiped when Chrome quits.
- **No deadline is fine:** a job without a deadline is saved with `deadline: null` and shown as "No deadline provided". Deadlines are never guessed.
- **Dashboard** (opens automatically on first install, or via "Open dashboard"): hash-routed pages for Overview, Applications, Calendar and Settings, in a Northline-inspired dark editorial design.
  - **Overview** has the "Your next opportunity starts here." hero, four statistics (Tracked, Applied this week, Interviews, Due in 7 days), and three panels: Recently saved, Application overview (weekly saves chart and pipeline), and Upcoming deadlines (14-day timeline).
  - Every number is calculated from your saved jobs. With nothing saved, the panels show empty states, never sample data.
  - **Add application** opens the same manual form in a dialog, with no job page needed.
  - The dashboard updates live when a job is saved, edited or deleted, including from the popup.
  - Upcoming deadlines on the Overview open that job. The line about jobs with no deadline opens Applications with the "No deadline provided" filter.
- **Reminders:** a job is reminded only when it has a valid deadline and its reminder is on. The default is 1 day before at 09:00, changeable in Settings and per job (same day, or 1, 2, 3 or 7 days before, or a specific time before the deadline). Adding a deadline later schedules the reminder. Clearing the deadline, turning the reminder off, or deleting the job removes it. The background worker uses `chrome.alarms` and `chrome.notifications`. Clicking a reminder opens the dashboard on that job. If Chrome was closed when a reminder was due, the next launch shows a missed reminder while the deadline is still ahead, or marks it expired once the deadline has passed. "Remind me in 1 minute" on a job with a future deadline uses this same path, then schedules the job's previous reminder again if it is still due. "Send test notification" in Settings only checks that the operating system will show a Chrome notification.
- **Calendar:** a month grid of deadlines, interviews and reminders. Jobs with no deadline are listed under "No deadline provided" and are not placed on a day. On a narrow window the month is an agenda list.
- **Applications:** a Kanban board with four stages — Saved, Applied, Interview and Result. A card shows the job title, company, deadline (or "No deadline provided"), India eligibility and source. Drag a card onto another stage, or change the stage with the card's Move to list. With the card focused, <kbd>[</kbd> and <kbd>]</kbd> move it one stage backward or forward. The first move into Applied records the applied date. A move into Interview can record an interview date, and Skip leaves that date empty. A move into Result asks for an outcome (Selected, Rejected, Withdrawn or No response); Leave unset keeps the card in Result and shows "Outcome not set". On a narrow window, a stage switcher shows one column at a time; dragging reveals every column so a card can still be dropped. Stage changes are written through the job repository into `chrome.storage.local` and stay there across a dashboard reload. Open a card for the existing details, editor and delete confirmation.
- **Search, filters and sort:** the Applications page searches title, company, location, city, country, skills, description and notes. Every word must match. Filters for status, result, source, employment type, category, India eligibility, work arrangement, experience and deadline combine with OR inside a filter and AND across filters. Deadline choices are Overdue, Next 7 days, Next 30 days, No deadline provided, and a custom range. A date range does not include a job with no deadline. Sort is deadline approaching by default (jobs with no deadline go last), or recently saved, recently updated, company A–Z, or job title A–Z. The choice is stored in the page hash, so a reload keeps it. Clear all resets it. <kbd>/</kbd> or <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> focuses the search box. Cards inside a column follow the selected sort.
- **Editing:** a right-hand sheet edits every stored field: title, company, URL, source, description, location, work arrangement, India eligibility, employment, pay, skills, status, result, applied and interview dates, deadline, notes and contact. The popup can suggest India eligibility from the page. The sheet keeps whatever you save, and changing the value there marks it as your correction. Clearing the deadline stores `null` and shows "No deadline provided". Status changes are appended to the job's history.
- **Delete:** Delete asks for confirmation and names the job. Cancel leaves it in place.
- **Duplicates:** links are compared after normalisation (host case, a leading `www.`, tracking parameters, and the LinkedIn, Indeed, Wellfound, Y Combinator, Himalayas, We Work Remotely, Unstop and Cutshort shapes). The same link, or the same site job id, shows "Already saved on …". A very similar company and title saved within 60 days is called out too. You can open the existing application, edit it, or save a separate copy. Nothing is overwritten silently. An edit made from an older copy is refused if the stored job changed in the meantime.
- **Storage:** each job is stored under its own `job:<uuid>` key in `chrome.storage.local`, with IDs from `crypto.randomUUID()`. Default settings and a schema version are written on install. Existing data is kept on update. Schema version stays 1. On update, a CSV preference that was never chosen is recorded as off, which is the specification default. A choice you already saved is left alone.
- **CSV export:** Settings and the top bar download every saved application as `job-clipper-all-YYYY-MM-DD.csv`. On Applications, Export CSV does the same when nothing is filtering the board. Export filtered downloads the jobs on screen as `job-clipper-filtered-YYYY-MM-DD.csv`. The file is UTF-8 with a BOM and CRLF rows. The description column is off unless you turn it on in Settings. The download message says whether that column was included. Every other stored field stays in the file.
- **Backup and restore:** Settings downloads a JSON file of every saved application and the reminder, profile and CSV settings. Reading a file shows whether the next step merges or replaces, and both ask you to confirm. Replace and Delete all data also require a typed phrase. A file that is too large, malformed, or from a newer schema is refused and nothing already saved is changed. A schema older than 1 is also refused: this project has only ever stored schema 1, so there is no older shape to migrate. New copies are written together with a short journal. The old keys are removed after that. If the removal fails, the page says the step will finish the next time Job Clipper starts, and the journal completes it. After a successful import or delete, the background worker reconciles reminder alarms with the jobs that remain.

## Still ahead

- Phase 8: hardening, a security review, packaging and a portfolio-ready 1.0.0. It has not started.
- Formal Verified status for the nine integrations. That still needs a recorded date, a Chrome version, and at least three live listings per site.
- Indeed, HiringCafe, Glassdoor and ZipRecruiter stay on manual entry. The reasons are in the integration table.

It runs entirely in your browser: no backend, no login, no paid API, no cloud service.

## What was manually tested

The project owner tested the installed extension in Chrome through Phase 7 and confirmed that the implemented functionality works. The test date, Chrome version, macOS version and listing counts were not supplied. This confirmation does not mark any integration Verified. The definition of Verified is unchanged: at least three live listings, with the date and Chrome version written in the verification log.

| Phase | Tested functionality |
| --- | --- |
| 1 | Foundation, dashboard and manual entry. |
| 2 | Job management: create, read, update and delete. |
| 3 | Four-stage Kanban board: Saved, Applied, Interview and Result. |
| 4 | Internshala, LinkedIn and Naukri integrations. |
| 5 | Deadline management, reminders and calendar. |
| 6 | Search, filters, sorting, CSV export and data management. |
| 7 | Wellfound, Y Combinator Jobs, Himalayas, We Work Remotely, Unstop and Cutshort integrations. |

Indeed, HiringCafe, Glassdoor and ZipRecruiter are not in that list. They have no adapter and remain manual-entry only because of access restrictions or unsupported pages. Manual entry itself is part of the Phase 1 functionality that was tested.

Checklist rows in the sections below stay "Not recorded" when the project owner did not describe that specific step. An earlier report confirmed a CSV in Apple Numbers. It did not include Google Sheets, LibreOffice, Excel, or a step-by-step backup, restore and delete-all record. This later confirmation does not add those details.

## Status

### Mandatory BSERC features

| Feature | Status | Planned phase |
| --- | --- | --- |
| One-click save of role, company, link and deadline | Implemented. Manually tested in Chrome by the project owner, including manual entry and detection on the supported sites. Test date, Chrome version and macOS version were not supplied | 1 (manual), 4 (detect) |
| Every saved field editable | Implemented. Job management was manually tested in Chrome by the project owner. Test date, Chrome version and macOS version were not supplied | 2 |
| Kanban board: Saved, Applied, Interview, Result | Implemented. The four-stage board was manually tested in Chrome by the project owner. Test date, Chrome version and macOS version were not supplied | 3 |
| Reminder before an application deadline | Implemented. Deadline management, reminders and the calendar were manually tested in Chrome by the project owner. Test date, Chrome version and macOS version were not supplied. No screenshot was provided | 5 |
| Search and CSV export | Implemented. Search, filters, sorting, CSV export and data management were manually tested in Chrome by the project owner. An earlier report confirmed a CSV in Apple Numbers. Google Sheets, LibreOffice and Excel were not part of that report. Test date, Chrome version and macOS version were not supplied | 3 (search), 6 (CSV) |

### BSERC completion criteria

| Criterion | Status |
| --- | --- |
| Works on three different job websites | Internshala, LinkedIn and Naukri were manually tested in Chrome by the project owner, as were the six Phase 7 integrations. The test date, Chrome version and listing count were not supplied, so none of these sites are Verified. Automated fixture tests are a separate record |
| Manual entry when details cannot be detected | Manually tested in Chrome by the project owner as part of Phase 1. Indeed, HiringCafe, Glassdoor and ZipRecruiter stay manual-entry only and were not part of the tested integrations. Test date, Chrome version and macOS version were not supplied |
| A deadline reminder actually appears | Manually tested in Chrome by the project owner. Test date, Chrome version and macOS version were not supplied. No screenshot was provided. Automated tests schedule alarms in memory and are a separate record |
| Exported CSV opens correctly in a spreadsheet | An earlier manual check opened a CSV in Apple Numbers, and the data and columns displayed correctly. The project owner later confirmed CSV export as part of the Phase 6 test. Test date, Chrome version and macOS version were not supplied. Google Sheets, LibreOffice and Excel were not part of the earlier report. Automated tests cover encoding, quoting, Unicode and an empty deadline cell, and are a separate record |

### Additional planned features

India eligibility is suggested in the popup from evidence on the page, and you can correct it before saving. The calendar, reminder Settings, and the Settings and data-management interface were confirmed in the installed extension. Search, filters, sorting, and filtered and full CSV downloads were confirmed there too, and a CSV opened in Apple Numbers with the data and columns displaying correctly. Existing application, calendar and reminder functionality was still working during that check. JSON backup is implemented. Duplicate warnings are implemented. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for details. The Northline-inspired dark dashboard and popup are implemented. Google Sheets, LibreOffice and Excel were not part of the manual check, so the specification's three-application spreadsheet check is not fully recorded. That earlier report did not include a step-by-step backup, restore or delete-all record. Schema version is still 1, so an older backup shape is refused and is not migrated. The project owner later confirmed that the implemented Phases 1–7 functionality, including data management, works in Chrome. The nine integrations are not Verified, because the test date, Chrome version and listing count were not supplied. Indeed, HiringCafe, Glassdoor and ZipRecruiter remain manual-entry only. Automated tests and the public-page inspection are separate records.

## Job site support

Listed in integration priority order. A site is marked **Verified** only after its adapter has been tested on at least three real, accessible listings in the installed Chrome extension, with the date and Chrome version recorded in the verification log below. Fixture tests and a public-page inspection are not that check. Manual entry works on every website regardless of this table.

The project owner manually tested these integrations in Chrome and confirmed that they work: Internshala, LinkedIn, Naukri, Wellfound, Y Combinator Jobs, Himalayas, We Work Remotely, Unstop and Cutshort. The test date, Chrome version and listing count were not supplied, so none are Verified. Indeed, HiringCafe, Glassdoor and ZipRecruiter have no adapter and stay manual-entry only. The access notes below come from the 2026-11-22 and 2026-11-23 inspections. They are not a new test.

| Website | Adapter status | Fields extracted | Access limitations | Fixture test results | Actual Chrome verification |
| --- | --- | --- | --- | --- | --- |
| Internshala | Enabled. Manually tested. Not Verified. | Title, company, location, arrangement, employment, stipend, skills, description, and an Apply By deadline when that label is present. | Public detail pages were readable on 2026-11-22. | Parser fixtures passed in the automated suite. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| LinkedIn Jobs | Enabled. Manually tested. Not Verified. | Title, company, location, employment and description from the guest card. A bare Remote stays Unknown. No deadline is taken from prose. | Guest job pages were readable on 2026-11-22. Logged-in pages are not required and were not used. | Parser fixtures passed in the automated suite. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| Naukri | Enabled. Manually tested. Not Verified. | Title, company, experience, location, arrangement, skills and description after the listing paints. "Not disclosed" stays missing. | The first HTML response is an empty shell. The extractor waits briefly for the rendered listing. | Parser fixtures passed in the automated suite. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| Wellfound | Enabled. Manually tested. Not Verified. | Title, company, the "Hires remotely in" cities, remote policy, employment, experience, skills, description, and a visa-sponsorship line. A deadline is stored only when an explicit label is present. Salary written in prose is not taken. | Two public `/jobs/` listings were readable on 2026-11-23 without a login wall. Neither had a labelled application deadline. "Posted" was ignored. | Parser fixtures passed, including a missing salary, an empty heading, and a non-job URL. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| Indeed | Manual entry only. No adapter. | None. The popup keeps the manual form. | `in.indeed.com` returned HTTP 403 with a Cloudflare challenge on 2026-11-22 and again on 2026-11-23. It was not bypassed. | An Indeed URL stays `unsupported` in the parser tests. | No adapter. Remains manual entry only. Not one of the manually tested integrations. |
| Y Combinator Jobs | Enabled. Manually tested. Not Verified. | Title, company, the meta location, job type, experience, skills, a real salary line, the visa line and the role description. A `$1` salary is ignored. No deadline was labelled on the inspected pages. | Public `/companies/…/jobs/…` pages returned HTTP 200 with JobPosting data on 2026-11-23. `workatastartup.com` returned HTTP 406 and is not this adapter. | Parser fixtures passed, including the `$1` salary, a city with no arrangement, a broken page, and `validThrough` ignored. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| Himalayas | Enabled. Manually tested. Not Verified. | Title, company, an "India only" badge, Apply before, job type, experience, skill links and the role article. "Posted on" and JSON-LD `validThrough` are ignored. A Worldwide word in the title does not override a country list that excludes India. | A direct download received a Cloudflare check. In a normal browser the check completed and the listing loaded. Nothing was done to defeat it. | Parser fixtures passed, including Apply before, a country list, a page with no deadline, and an empty heading. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| We Work Remotely | Enabled. Manually tested. Not Verified. | Title, company, remote, Apply before, job type, salary, country or region, skills and the role text. "Posted on" and `validThrough` are ignored. "Anywhere in the World" is worldwide. A country list that does not include India is restricted. | A direct download of a detail page received a Cloudflare check. In a normal browser the listing loaded. Nothing was done to defeat it. The two inspected listings named countries. They did not say "Anywhere in the World". | Parser fixtures passed, including the "Dec 2th, 2026" label, a country list, the worldwide phrase, a posted date, and an empty heading. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| Unstop | Enabled. Manually tested. Not Verified. | Title, company, in-office or remote chip, location, eligibility, skills and description. An `/internships/` URL is an internship even when JSON-LD says full-time. "Unpaid" salary and `validThrough` are ignored. A deadline is stored only from an explicit label. | The first download is an Angular shell with no heading. The extractor waits until a heading is painted. Three rendered listings on 2026-11-23 had no application-deadline label. Competition pages are not job pages. | Parser fixtures passed, including the shell, an internship, a labelled deadline that the live pages did not have, and `validThrough` ignored. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| Cutshort | Enabled. Manually tested. Not Verified. | Title, company, the job-summary arrangement, experience and rupee range, plus JSON-LD skills, employment and description. "Posted" is not a deadline. An applicant location of "NA" is ignored, so a bare "Remote only" stays Unknown. | Public `/job/` pages returned HTTP 200 on 2026-11-23. The site's robots file disallows `/view/j/` and `/apply/`. Those paths were not fetched. | Parser fixtures passed, including undisclosed pay, the NA location, a posted date, an empty heading, and the jobs index. | Manually tested in Chrome by the project owner. Date, Chrome version and listing count were not supplied, so this is not Verified. |
| HiringCafe | Manual entry only. No adapter. | None. | Time-boxed on 2026-11-23. A direct download received a Cloudflare check. The browse page that then loaded was a directory, not job details. The robots file disallows `/viewjob/`. That path was not fetched. | A HiringCafe URL stays `unsupported` in the parser tests. | No adapter. Remains manual entry only. Not one of the manually tested integrations. |
| Glassdoor | Manual entry only. No adapter. | None. Search results are not scraped. | Time-boxed on 2026-11-23. The home page was a security check. A search URL showed a results page. A direct job-listing URL returned a Cloudflare "Humans only" block. It was not bypassed. The robots file disallows `/jobview/` and `/search/`. | A Glassdoor URL stays `unsupported` in the parser tests. | No adapter. Remains manual entry only. Not one of the manually tested integrations. |
| ZipRecruiter | Manual entry only. No adapter. | None. | Time-boxed on 2026-11-23. A direct download redirected to `ziprecruiter.in` and then returned HTTP 403. In a browser, a search for a role in India landed on a US "jobs near me" page. No job detail was opened. | A ZipRecruiter URL stays `unsupported` in the parser tests. | No adapter. Remains manual entry only. Not one of the manually tested integrations. |

## Deadlines

- A job can be saved without a deadline. It is then shown as "No deadline provided".
- A deadline is filled in automatically only when the page shows an explicitly labelled application deadline (for example Internshala's "Apply By"). It is never guessed from listing-expiry dates or description text.
- You can add, edit or clear a deadline at any time.
- Reminders are scheduled only for jobs with a valid deadline.

## Permissions

The extension requests only the permissions its shipped features use. This build requests five:

| Permission | Status | Why |
| --- | --- | --- |
| `storage` | Requested (Phase 1) | Save jobs and settings locally (`chrome.storage.local`) and keep popup drafts (`chrome.storage.session`). |
| `alarms` | Requested (Phase 5) | Schedule deadline reminders that survive the background worker being suspended. |
| `notifications` | Requested (Phase 5) | Show deadline reminder notifications. |
| `activeTab` | Requested (Phase 1) | Read the current tab's URL and title to prefill the popup, only when you click the extension icon or press its shortcut. |
| `scripting` | Requested (Phase 4) | After you open the popup, inject the read-only extractor into that tab. |

Updating from 0.4.0 to 0.5.0 asks Chrome to grant `alarms` and `notifications`. Versions 0.6.0 and 0.7.0 do not add a permission. Reload the unpacked extension after building.

Deliberately **not** requested: access to all websites (`host_permissions`), `tabs`, `downloads`, `cookies`, `unlimitedStorage`. The extension makes no network requests, and its content security policy (`script-src 'self'`) allows only its own bundled scripts.

## Privacy

- All data stays on your device in `chrome.storage.local`. Nothing is sent anywhere.
- No analytics, tracking or remote code.
- The extension never reads cookies, passwords, session data or form inputs on job sites, and never bypasses login walls or bot checks. It reads only what you can already see on the page you clipped.
- Uninstalling the extension deletes its data. Settings can download a JSON backup first. The backup is a file you save; the extension does not upload it.

## Known limitations

### Current build

- The default sort is deadline approaching. Jobs with no deadline stay at the bottom of their column for that sort only. The other four sorts do not do that.
- Detection runs for Internshala, LinkedIn, Naukri, Wellfound, Y Combinator, Himalayas, We Work Remotely, Unstop and Cutshort, and only after you open the popup. A deadline is stored from the page only when the evidence starts with a label such as "Apply by", "Apply before", "Application deadline", "Registration deadline", "Last date to apply" or "Deadline". Listing expiry (`validThrough`), "Posted on", and a date written in a sentence are ignored. A month-first date such as "Dec 10, 2026" is accepted only after that label.
- Work arrangement and India applicant eligibility are separate. A generic "Remote" label, including Remote next to an Indian office, is Unknown — verify manually. "Work from home" only sets the arrangement to remote. On its own it never establishes Remote — India eligible, including on Internshala, Naukri, Unstop, and Cutshort. That outcome requires an applicant-location requirement of India, a phrase such as "Remote (India)" or "Anywhere in India", or India in the eligible-country list. A structured country list that does not include India, such as "US" or "Denmark, Germany", is Remote — restricted region. "NA" and any token that is not a recognised country are ignored. An Indian city with no on-site, hybrid, or remote word stays Unknown. A city outside India does not become International — relocation required unless the page says on-site or hybrid. LinkedIn's guest location line often has the city and not the arrangement, even when the description says on-site. That description sentence is not used.
- Unstop often paints the listing after the first HTML response. If the popup opens before the heading is there, you get the manual form. The three Unstop listings inspected on 2026-11-23 had no labelled application deadline, even though JSON-LD included `validThrough`.
- Himalayas and We Work Remotely can put "Worldwide" in a title while the country list excludes India. The country list is what is classified. You can correct it before saving.
- Naukri's first HTML response is a loading shell. The extractor waits briefly for the rendered listing. If you open the popup before that paint, you get the manual form.
- "Clip another" returns to the tab's URL and title. It does not read the page again until you close and reopen the popup.
- The description column is off unless you check Include job description in Settings. Turning it on adds that one column. The other stored fields are always exported, and the download message says whether descriptions were included.
- A cell that starts with `=`, `+`, `-`, `@`, a tab or a return is prefixed with `'`. Excel and Google Sheets usually hide that apostrophe, so a phone number stored as `+91…` can appear with a leading apostrophe if the spreadsheet shows it.
- Spreadsheet apps that expect a semicolon between columns, rather than a comma, are not given a separate file. The export is comma-separated, which is what Excel and Google Sheets use for a UTF-8 CSV in most locales.
- Backup validation is written in this project. `zod` is not a dependency. A backup from a future schema version is rejected. Schema version is still 1. A backup that says schema 0 is rejected, because no older job shape was ever stored, and that "import an older version" check cannot be demonstrated.
- Import writes the new jobs and a journal in one storage call, then deletes the old keys. `chrome.storage.local.set` is atomic, so a failed set leaves the previous data. If the delete fails, both the old and the new jobs can be present until the journal runs. The page says so, and the next launch finishes the delete. A file that fails the check before that first write changes nothing.
- A CSV was opened in Apple Numbers, and the data and columns displayed correctly. Google Sheets, LibreOffice and Excel were not part of that check. The automated tests check the file bytes, not those applications.
- Reminders use this computer's local time zone. A deadline date means that local calendar day, ending at 23:59 when no time is set. There is no per-job time zone.
- Only the soonest 400 future reminders are armed at once. An hourly alarm fills in the rest. A job with no deadline, an impossible date, a passed deadline, or a reminder time that is not before the deadline gets no alarm.
- Deadline reminders and Chrome notifications were confirmed in the installed extension. The automated tests still use an in-memory stand-in for `chrome.alarms` and `chrome.notifications`, and no notification screenshot was provided.
- "Explore opportunities" scrolls to the Overview panels.
- A similar title and company is only flagged for jobs saved in the last 60 days. Older ones are left alone unless the link matches.
- The project owner manually tested Phases 1–7 in Chrome and confirmed that the implemented functionality works. Checklist rows stay "Not recorded" where that specific step was not described. An earlier report did not include Google Sheets, LibreOffice, Excel, or a step-by-step backup, restore and delete-all record. Automated page reads used saved public HTML, not `chrome.scripting`. Automated tests, the public-page inspection and the installed-extension checks are separate records. No integration is Verified.

### Planned behaviour

- Most job sites don't publish an application deadline, so many jobs will show "No deadline provided" until you add one. Those jobs get no reminder.
- Reminders fire only while Chrome is running; missed reminders appear the next time Chrome starts.
- On macOS, Chrome must be allowed to show notifications (System Settings → Notifications → Google Chrome), and Focus modes can hide them.
- Site layouts change, so automatic detection can break. Manual entry always remains available.
- Local storage is limited to about 10 MB, and there is no cross-device sync.

## Tech stack

In use: Chrome Extension Manifest V3, React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, date-fns, lucide-react icons, `@dnd-kit/core` (the Kanban board), Vitest 5 with Testing Library and jsdom, ESLint 10 and Prettier.

Fonts (Instrument Serif, Inter and JetBrains Mono, via Fontsource) and icons are bundled into the build, so the extension makes no remote requests and works offline.

Planned for later phases: `zod` (the specification names it for import validation; this build checks backups without it), Playwright (end-to-end tests).

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
  adapters/        one file per job site, plus the merge of adapter, JSON-LD, meta and headings
  background/      service worker: install, extraction, alarms, notifications, reconcile
  content/         read-only extractor (built as dist/extractor.js, an IIFE)
  core/            pure logic, no Chrome APIs: data model, validation, URL and text
                   normalisation, India eligibility, duplicate detection, deadlines,
                   reminder planning, search, CSV, backup validation and import planning
  messaging/       the popup-to-background message, checked and rebuilt before use
  storage/         typed chrome.storage wrapper, job repository (create, read, update,
                   delete), settings, migrations, popup drafts, backup apply and delete
  popup/           popup app: detection preview, manual entry, duplicate warning, saved state
  dashboard/       dashboard app: hash router, layout, Overview, Kanban board,
                   calendar, reminder settings, CSV and backup controls,
                   job sheet (details, edit, delete)
  ui/              shared components, hooks, design tokens and global styles
tests/fixtures/    trimmed HTML used by the parser tests, not a live-site proof
scripts/           icon generator and the two-watch dev build
```

## Automated tests

`npm test` runs 301 tests in 36 files against an in-memory fake of the `chrome.*` APIs (`tests/fakes/chrome.ts`). They cover:

- **Repository:** creating, updating and deleting jobs, refusing a duplicate link unless the save is intentional, refusing an edit that would overwrite a different job, refusing a stale edit, listing newest first, and live subscriptions. Moving a job to a stage, including rejecting a stage or outcome that is not on the board, and keeping that change for a later read.
- **Board:** four columns, card title, company, deadline and India eligibility, Move to, the bracket-key move, the result outcome, the optional interview date, a reload that still shows the new stage, and the Overview counts after a move. Opening a card still edits it.
- **Duplicates and URLs:** canonical links (www, tracking parameters, LinkedIn job id, Indeed job id) and probable company-and-title matches.
- **Validation:** required fields, non-http(s) URLs, optional deadlines, impossible dates, and the full edit form (including a required result).
- **Popup:** manual entry, prefill, restricted pages, saving without a deadline, drafts, the duplicate warning, a detection preview that saves nothing until you confirm, an edited deadline stored as yours, and the manual form when the read fails.
- **Extraction:** trimmed fixtures for Internshala, LinkedIn and Naukri, including a missing deadline, a JSON-LD expiry, a date written in a sentence, broken markup, and an unsupported site. These fixtures are not a live compatibility test.
- **India eligibility:** on-site and hybrid cities in India, offices outside India, a bare Remote label, Remote with India named, worldwide, a restricted region, conflicting sentences, "Work from home" alone on an India-focused site (Unknown), "Work from home" plus "Anywhere in India", and a correction you make by hand.
- **Dashboard:** statistics from real data, empty states, live updates, the add dialog, opening a job, editing it, delete confirmation, and hash routing.
- **Reminders:** scheduling, rescheduling, cancellation, missing and impossible dates, a custom time after the deadline, the 400-alarm cap, one alarm per job, a missed notification fired once, an on-time notification fired once, the one-minute catch-up, and local date boundaries (midnight, month end, a leap day).
- **Calendar:** deadlines on their stored date, interviews and reminders, and jobs with no deadline kept off the grid.
- **Background:** install initialisation, preservation of existing data on update, a one-time CSV preference when none was chosen, rejection of an extraction message that did not come from this extension, and one registration of the alarm, notification and startup listeners.
- **Search:** token search across title, company, location, skills, description and notes, including accents; OR inside a filter and AND across filters; deadline ranges that skip jobs with no deadline; deadline sort placing those jobs last; hash round-trip; 2,000 jobs filtered in under 50 ms.
- **Board filters:** a status filter kept in the hash across a reload, the result count, Clear all, and an export whose rows are the jobs on screen.
- **CSV:** quoting of commas, quotes and line breaks, a UTF-8 BOM, CRLF rows, ₹, Devanagari, Tamil and emoji, an empty deadline cell, a leading `=`, a 10,000-character note, 1,000 aligned rows, the description column staying off unless it is requested, and the filtered filename.
- **Backup:** a round trip of jobs and settings, rejection of a file over 5 MB, duplicate ids, a non-http link, an unknown field, a bad reminder lead and a newer schema version. Merge can skip or overwrite by id or link, and a link that matches more than one application is left unchanged. Replace removes applications that are only on the device. A restore keeps the saved fields and, after reconciliation, the matching alarm. An invalid file leaves the existing alarm in place. Delete all data clears jobs, resets settings and drops the alarm. A failed delete during replace is retried, and a journal left behind is finished by the migration runner.

## Manual verification checklist (Phase 1)

One-click saving and the manual-entry fallback were confirmed in the installed extension. The test date, Chrome version and macOS version were not recorded. A row is confirmed only when that behaviour was reported. Other rows are not recorded, which is not a recorded failure. Automated tests are separate.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, then load `dist/` with "Load unpacked": no errors or warnings on the extension card, and the service worker is listed as active. | Not recorded. The extension was installed and used. Card warnings and the service-worker state were not described. |
| 2 | On first install the dashboard opens in a new tab and shows the empty Overview (all statistics 0, empty-state panels). | Not recorded |
| 3 | On a job listing page, clicking the icon (or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd>) opens the popup with the page URL and title prefilled. | One-click save confirmed. Shortcut result, date, Chrome version and macOS version not recorded. |
| 4 | Clicking Save with Company empty shows "Enter the company name." and focuses that field. Entering `javascript:alert(1)` as the URL is rejected. | Not recorded |
| 5 | Saving with no deadline shows the success state with "No deadline provided". | Not recorded |
| 6 | Saving with a deadline shows "Due …" in the success state, and the job appears under Upcoming deadlines if it is due within 14 days. | Not recorded |
| 7 | Typing in the popup, clicking elsewhere so it closes, then reopening it on the same tab restores the entry with "Restored your unsaved entry." | Not recorded |
| 8 | On `chrome://extensions` or a new tab page, the popup shows the restricted-page notice and a manually typed job still saves. | Manual entry fallback confirmed. Restricted-page notice wording, date, Chrome version and macOS version not recorded. |
| 9 | With the dashboard open in one tab, saving from the popup in another updates the Overview without a reload. | Not recorded |
| 10 | Using only the keyboard (<kbd>Tab</kbd>, <kbd>Enter</kbd>, <kbd>Esc</kbd>): Dashboard → Add application opens the dialog with focus in Job title, Escape closes it, and a saved entry appears on the Overview with a confirmation message. Focus outlines are visible throughout. | Not recorded |
| 11 | Overview, Applications, Calendar and Settings links work, as do browser back/forward and reloading on a `#/…` URL. At 360 px wide nothing overflows, and the menu button shows the navigation. With DevTools → Network set to Offline, a reload looks identical (fonts included) and no requests go anywhere except the extension's own files. With reduced motion on (macOS System Settings → Accessibility → Display), the animations stop. | Not recorded |

## Manual verification checklist (Phase 2)

Editing saved application fields was confirmed in the installed extension. The test date, Chrome version and macOS version were not recorded. Rows that add a detail the report did not describe stay "Not recorded".

| # | Check | Result |
| --- | --- | --- |
| 1 | Save a job, then click it in Recently saved and on Applications. The sheet shows the title, company, link and "No deadline provided" when the deadline was left empty. | Confirmed in the installed extension. Date, Chrome version and macOS version not recorded. |
| 2 | Edit the title, city, India eligibility, status and notes. Save. The sheet, the list and the Overview statistics show the new values without a reload. Quit Chrome, reopen the dashboard, and the edit is still there. | Editing saved fields confirmed. Persistence after quitting Chrome, date, Chrome version and macOS version not recorded. |
| 3 | Add a deadline, save, and see it under Upcoming deadlines when it is within 14 days. Clear the deadline, save, and see "No deadline provided" again. | Not recorded |
| 4 | Click Delete, then Cancel. The job remains. Click Delete, then Delete application. It disappears from the list, Recently saved and the statistics. | Application management confirmed. The Cancel-then-delete sequence, date, Chrome version and macOS version not recorded. |
| 5 | Save the same URL a second time from the popup and from Add application (try a `www.` or `utm_` variant of the link). Both show "Already saved on …". Save anyway creates a second entry and leaves the first unchanged. Open existing opens that job. | Not recorded |
| 6 | Save the same company and title with a different URL. A similar-application warning appears. A different title at that company does not. | Not recorded |
| 7 | Open the dashboard in two windows, edit the same job in both, and save the second window last. It reports that the application changed elsewhere and does not replace the first save until you choose "Show the latest version". | Not recorded |

## Manual verification checklist (Phase 3)

The four-stage Kanban board and application management were confirmed in the installed extension. The test date, Chrome version and macOS version were not recorded. Pointer drag, touch drag and VoiceOver were not described. Automated tests still move cards with the Move to list and the bracket keys against an in-memory storage fake.

| # | Check | Result |
| --- | --- | --- |
| 1 | Reload the extension, open Applications, and confirm four columns: Saved, Applied, Interview, Result. A saved job shows its title, company, "No deadline provided" or a due date, and the India eligibility chosen in the editor. | Confirmed in the installed extension. Date, Chrome version and macOS version not recorded. |
| 2 | Drag a card from Saved to Applied. The applied date is filled. Reload the dashboard, quit Chrome, reopen the dashboard, and confirm the card is still in Applied. | Board and application management confirmed. The drag gesture, the applied date and persistence after quitting Chrome were not described. Date, Chrome version and macOS version not recorded. |
| 3 | Move the same card with only the keyboard: focus it, press <kbd>]</kbd> until it reaches Interview, press Space on the drag handle and use the arrow keys as an alternative, and change stage with the Move to list. Skip the interview date, then move to Result and choose Rejected. Leave a second card's outcome unset and confirm it says "Outcome not set". | Not recorded |
| 4 | Open a card from the board, edit the title and notes, and save. The card and the Overview update. Delete still asks for confirmation. | Editing saved fields confirmed. Delete-confirmation wording, date, Chrome version and macOS version not recorded. |
| 5 | After each move, Overview's Interviews count, Applied this week, Due in 7 days and the pipeline counts match the columns. A card in Result no longer counts as due. | Not recorded |
| 6 | Narrow the window to 360 px. One stage shows at a time, the stage switcher changes column, and nothing overflows. With reduced motion on, the card does not scale while dragging. | Not recorded |

## Manual verification checklist (Phase 4)

Internshala, LinkedIn Jobs and Naukri extraction workflows were confirmed in the installed extension. The test date, Chrome version, macOS version and listing count were not recorded, so the sites are not marked Verified. The public-page reads in the verification log are an automated record, not this manual check.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, then reload the unpacked `dist/`. Accept the new `scripting` permission. The extension card has no errors, the service worker is active, and `dist/extractor.js` is present. | Not recorded. The extension was installed and the extraction workflows ran. Permission prompt, card warnings and `extractor.js` were not described. |
| 2 | Open an Internshala internship detail page that shows Apply By. The popup badge says Internshala, the fields are editable, the missing ones are named, and the deadline line quotes the label. Nothing appears on the dashboard until you press Save. | Internshala extraction workflow confirmed. Apply By wording, date, Chrome version and macOS version not recorded. |
| 3 | Change the company and the India eligibility, leave the date, and save. The dashboard shows your company and your eligibility. The stored deadline still says it came from the page label. | Not recorded |
| 4 | Open a public LinkedIn job (`/jobs/view/…`) with no Apply By. The deadline stays empty. A date in the description is not filled in. | LinkedIn Jobs extraction workflow confirmed. Whether a description date stayed empty, date, Chrome version and macOS version not recorded. |
| 5 | Open a Naukri `/job-listings-…` page and wait until the title is visible, then open the popup. Title, company and experience are filled. "Not disclosed" stays missing. A Remote label with only an Indian city stays "Unknown — verify manually". | Naukri extraction workflow confirmed. Field-level results in this row, date, Chrome version and macOS version not recorded. |
| 6 | On an Internshala listing index, on a site that is not one of the three, and on `chrome://extensions`, the popup stays on manual entry and a typed job still saves. | Manual entry fallback confirmed. These three page types, date, Chrome version and macOS version not recorded. |
| 7 | On the dashboard, drag or move a card between Saved, Applied, Interview and Result, edit it, and delete one with the confirmation. Overview counts follow the board. | Kanban board, application management and editing confirmed. Overview counts, date, Chrome version and macOS version not recorded. |

## Manual verification checklist (Phase 5)

Deadline reminders, notification functionality, Calendar and reminder Settings were confirmed in the installed extension. The test date, Chrome version and macOS version were not recorded. No notification screenshot was provided. Automated alarm tests remain a separate, in-memory check.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, reload the unpacked `dist/`, and accept the new `alarms` and `notifications` permissions. The service worker stays active. On the service worker's console, `chrome.alarms.getAll()` includes `jc:reconcile`. | Not recorded. Reminders ran in the installed extension. The console alarm list was not described. |
| 2 | In Settings, choose a default lead time and press Save reminder settings. Press Send test notification. A Chrome notification appears. If it does not, allow Google Chrome under System Settings → Notifications and try again. Focus mode can hide it. | Reminder Settings and notification functionality confirmed. Date, Chrome version and macOS version not recorded. |
| 3 | Save a job with no deadline. In the service worker console, `chrome.alarms.getAll()` has no `jc:reminder:` alarm for that job. The card, the sheet and the calendar say "No deadline provided". The reminder control says to add a deadline. | Not recorded |
| 4 | Add a deadline that is still ahead and save. `chrome.alarms.getAll()` shows one `jc:reminder:<id>` alarm. Change the date and confirm the alarm's `scheduledTime` moves. Clear the deadline and confirm that alarm is gone. | Deadline reminders confirmed. Alarm names and `scheduledTime`, date, Chrome version and macOS version not recorded. |
| 5 | On a job with a deadline at least a few minutes ahead, press Remind me in 1 minute. Within about a minute a notification appears. Click it. The dashboard opens with that job's sheet. Pressing it again does not stack a second notification for the same reminder. | Notification functionality confirmed. The one-minute control and where the click opened, date, Chrome version and macOS version not recorded. |
| 6 | Quit Chrome after a reminder time has passed but before the deadline, then open Chrome. A missed-reminder notification appears. Repeat after the deadline has passed: no notification, and the sheet says the deadline has passed. | Not recorded |
| 7 | Delete a job that has a reminder. Its alarm and notification are gone. Reload the extension (this clears alarms the way an update can). Open the dashboard or wait for the service worker. The alarm for a job that still has a future deadline is created again. | Not recorded |
| 8 | Open Calendar. A deadline sits on its date. A job with no deadline is under "No deadline provided" and not on a day. The same deadline text appears on the Overview, the board card and the job sheet. | Calendar confirmed. Matching wording across Overview, the board and the sheet, date, Chrome version and macOS version not recorded. |

## Manual verification checklist (Phase 6)

The extension was tested in Chrome. A row is confirmed only for the behaviour that was reported. Other details in that row are not recorded, which is not a recorded failure. Automated tests check the file bytes and are a separate record. They did not open a spreadsheet.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, then reload the unpacked `dist/`. No new permission is requested. The service worker stays active. | Not recorded |
| 2 | Save a few applications, including one with a comma in the company, a quote and a line break in the notes, a rupee amount, and one with no deadline. From Settings, Applications and the top bar, download the CSV. The filename is `job-clipper-all-YYYY-MM-DD.csv`. | Filtered and full CSV downloads confirmed in the installed extension. The tricky-character dataset, which controls were used, the filename, date, Chrome version and macOS version not recorded. |
| 3 | Open that file in Google Sheets, Apple Numbers and LibreOffice (and Excel if it is installed). Columns stay aligned. The rupee sign and any Indic text are intact. The job with no deadline has an empty Deadline cell. Notes with a line break stay in one cell. | Apple Numbers confirmed: the CSV opened, and the data and columns displayed correctly. Google Sheets, LibreOffice and Excel not recorded. Rupee sign, Indic text, the empty Deadline cell and a notes line break were not described separately. Date, Chrome version and macOS version not recorded. |
| 4 | In Settings, confirm Include job description starts unchecked and the CSV has no Description column. Check it, download again, and confirm the column and the description text are present. | Settings and data-management interface confirmed. The description-column checkbox result, date, Chrome version and macOS version not recorded. |
| 5 | Download a JSON backup. Change a job title, then merge the backup and choose to keep the saved copy when ids match. Confirm the dialog says merge keeps applications that are only on this device. The changed title stays. A job that existed only in the file is added. | Not recorded. Backup and restore were not part of the reported manual check. |
| 6 | Merge again and choose to replace the saved copy. The title from the file comes back. Reminder settings stay unless "Also replace reminder, profile and CSV settings" is checked. | Not recorded. Backup and restore were not part of the reported manual check. |
| 7 | Choose Replace all data. The button stays disabled until you type REPLACE. After confirming, only the applications from the file remain, and a reminder for a job that was removed is gone. | Not recorded. Backup and restore were not part of the reported manual check. |
| 8 | Choose a text file that is not a backup, and a backup whose `schemaVersion` is greater than 1. Both are refused, and the applications already saved are unchanged. | Not recorded. This step was not part of the reported manual check. Schema version is still 1. An older backup shape is refused and is not migrated. That older-schema import is not a supported migration, and it was not part of this check either. |
| 9 | Delete all data. The button stays disabled until you type DELETE. Applications are gone, reminder settings return to the defaults, and the storage meter drops. | Not recorded. Delete all data was not part of the reported manual check. |
| 10 | On Applications, search for a company, filter Status to Interview, and sort by Company A–Z. The count shows how many of the saved applications match. Reload the dashboard. The same search, filter and sort are still applied. Clear all shows every application again. | Search, multi-word matching, all filters, combined filters, sorting and application board behaviour confirmed in the installed extension. The result count, reload persistence, Clear all, date, Chrome version and macOS version not recorded. |
| 11 | With that filter on, press Export filtered. The filename is `job-clipper-filtered-YYYY-MM-DD.csv` and the rows are the jobs on the board, not the ones the filter hid. The top bar still downloads every application as `job-clipper-all-YYYY-MM-DD.csv`. | Filtered and full CSV downloads confirmed in the installed extension. Exact filenames, and a check that hidden rows were absent, date, Chrome version and macOS version not recorded. |
| 12 | Press <kbd>/</kbd> and <kbd>Ctrl</kbd>+<kbd>K</kbd> (or <kbd>Cmd</kbd>+<kbd>K</kbd>). Focus moves to the search box. The Overview line for jobs with no deadline opens Applications with that filter on. | Not recorded |

## Manual verification checklist (Phase 7)

The project owner manually tested the Phase 7 integrations in Chrome and confirmed that they work. The rows below ask for a build reload, three listings per site, field-level results, a date and a Chrome version. Those details were not supplied, so the rows stay not recorded and the sites are not Verified. Public-page inspection and fixture tests are a separate record.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, then reload the unpacked `dist/` on `chrome://extensions`. No new permission is requested. The service worker stays active. | Not recorded. The project owner confirmed the Phase 7 integrations work. This reload check, the permission prompt and the service-worker state were not described. |
| 2 | Open three live Wellfound job pages, including one with no labelled deadline. The popup names the detected fields and the missing ones, including salary when the page only mentions pay in prose. Change a field. Nothing is saved until Save. A "Posted" line does not become the deadline. | Not recorded |
| 3 | Open three live Y Combinator company job pages. A `$1` salary stays empty. A US-only remote listing is Remote — restricted region. A city without the word remote stays Unknown, not International — relocation required. `validThrough` is not the deadline. | Not recorded |
| 4 | Open three live Himalayas job pages, including one whose title says Worldwide but whose country list does not include India. Apply before is the deadline. Posted on is not. The country list is the eligibility evidence, and you can change it before saving. | Not recorded |
| 5 | Open three live We Work Remotely job pages, including one with no Apply before. The sidebar date next to Apply before is kept, including a form such as "Dec 2th, 2026". A country list without India is Remote — restricted region. | Not recorded |
| 6 | Open three live Unstop job or internship pages and wait until the heading is visible. An internship URL is stored as an internship. "Unpaid" and `validThrough` stay empty. If you open the popup before the heading paints, the form is manual. | Not recorded |
| 7 | Open three live Cutshort `/job/` pages. "Remote only" without an India requirement stays Unknown. "NA" is not treated as a country. A "Posted" date is not the deadline. The rupee range in the summary is kept when it is shown. | Not recorded |
| 8 | Open an Indeed listing, a Glassdoor listing, a ZipRecruiter listing and a HiringCafe page. Each stays on manual entry. A typed job still saves. Confirm an existing Internshala, LinkedIn or Naukri preview still appears, and that search, the board, a CSV download and a reminder still work. | Not recorded |

## Verification log

Real test results only, added as each phase is completed. Each entry records the date, Chrome version, macOS version, what was tested and the outcome, including failures.

Entries titled "automated checks" or "public pages" describe that session only. They used an in-memory Chrome stand-in, a normal browser, or saved HTML. The installed-extension results are [Manual Chrome verification reported for Phases 1–5](#manual-chrome-verification-reported-for-phases-15), [Manual Chrome verification reported for Phase 6](#manual-chrome-verification-reported-for-phase-6), and [Manual Chrome confirmation reported for Phases 1–7](#manual-chrome-confirmation-reported-for-phases-17). Where an entry says a detail was not recorded, this log does not fill it in.

### 2026-11-22 — Phase 1, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run typecheck`: passed, 0 errors.
- `npm run lint`: passed, 0 errors, 0 warnings.
- `npm run format:check`: passed.
- `npm test`: 10 files, 77 tests, all passed.
- `npm run build`: passed. `dist/` contains `manifest.json`, `background.js`, `popup.html`, `dashboard.html`, the icons and the bundled assets, with no inline scripts and no remote URLs loaded.
- In-browser preview: the built pages were opened from a local server in a browser with a stand-in for the `chrome.*` APIs, to check layout and interaction (popup at 380 px, dashboard at desktop and phone widths, validation, saved state, dialog). This session did not test the installed extension. The later manual entry is the installed-extension record.

### 2026-11-22 — Phase 2, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. That runs typecheck (0 errors), ESLint (0 errors, 0 warnings), Prettier, Vitest (13 files, 101 tests, all passed) and the production build.
- This automated session did not test the installed extension. The later manual entry records what was confirmed after that.

### 2026-11-22 — Phase 3, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. That runs typecheck (0 errors), ESLint (0 errors, 0 warnings), Prettier, Vitest (16 files, 123 tests, all passed) and the production build.
- This automated session did not test the installed extension. Pointer drag, touch drag and VoiceOver were not run. The later manual entry records what was confirmed after that.

### 2026-11-22 — Phase 4, public pages (not an installed extension)

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (24 files, 220 tests, all passed), and the production build. `dist/extractor.js` is the read-only extractor. `dist/manifest.json` requests `storage`, `activeTab` and `scripting`.
- This automated session did not install the extension, so no Chrome version is recorded here. The later manual entry also has no Chrome version, because none was reported.

Internshala detail pages were downloaded the same day (HTTP 200) and passed through the adapter:

- Codeatrix, Data Science, Work from home, internship, stipend ₹ 20,000–27,000 /month, skills including Python and SQL, description present. Label "APPLY BY 18 Dec' 26" became 2026-12-18. The page does not say that applicants in India can apply, so the suggestion is Unknown — verify manually.
- Career Solutions, Chennai, on-site, "APPLY BY 20 Dec' 26".
- Krriwin, Surat, on-site, "APPLY BY 13 Dec' 26".
- SoftSensor.ai, Gurgaon and Jaipur, full-time, no experience required, CTC ₹ 5,00,000–6,00,000 /year (the page prints that amount twice, for desktop and mobile; one copy is kept), "Apply By 17 Dec' 26".
- Simpli Intern, Work from home, part-time, "Apply By 9 Dec' 26".
- An Internshala internship index was left on manual entry.

Those pages also contain a JobPosting `validThrough` and, in at least one description, a "Deadline:" line. The deadline stored from the adapter was the Apply By value, not those.

LinkedIn guest job pages (HTTP 200, no JobPosting block on the three detail pages):

- Healthcare Data Analyst-Intern at Milliman India, Gurgaon. Employment type internship. No Apply By. The location line does not say on-site, hybrid, or remote, so eligibility stays Unknown.
- Intern - Data Analyst at Amber, Pune. The description says on-site. The location line does not, and the description was not used for the arrangement.
- Intern, Analytics at Synchrony, Delhi. No Apply By.
- The LinkedIn jobs search page was left on manual entry.

Naukri's downloaded HTML is a client-rendered shell with no listing. It is not a captcha page. In the Cursor browser, after the listing painted, the adapter read:

- Capgemini, Data Analyst, 4–9 years, Hybrid, Chennai, Delhi / NCR and Mumbai, salary not disclosed, skills including SQL and Power BI, no Apply By. JSON-LD `validThrough` was present and was not used. Suggested eligibility: India — hybrid.
- Kolte-Patil Developers, Mumbai, 2–5 years, 10–15 Lacs P.A., no arrangement word and no Apply By. Suggested eligibility: Unknown.
- Kairos Technologies, Bengaluru, 2–4 years, 4–6 Lacs P.A., no arrangement word and no Apply By. Suggested eligibility: Unknown.
- U.S. Bancorp India, Chennai, 8–13 years, salary "Not Disclosed", was inspected in the rendered page. There was no Hybrid, Remote, or Work from home label.

Indeed returned HTTP 403 with `cf-mitigated: challenge`. Nothing was done to get past it, and there is no Indeed adapter. Wellfound and Y Combinator Jobs returned HTTP 200 with public job data and were not implemented.

_This automated page read did not install the extension. The later manual entry records the installed-extension result. Date, Chrome version and macOS version for that manual check were not recorded._

### 2026-11-22 — Phase 5, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (30 files, 269 tests, all passed), and the production build. `dist/manifest.json` requests `storage`, `alarms`, `notifications`, `activeTab` and `scripting`.
- This automated session did not install the extension, so it has no Chrome version and it did not show a notification. No screenshot is recorded. The installed-extension result is in the later manual entry.

_This entry is the automated session only._

### 2026-11-23 — Phase 6, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (34 files, 292 tests, all passed), and the production build. `dist/manifest.json` still requests `storage`, `alarms`, `notifications`, `activeTab` and `scripting`. Version is 0.6.0.
- This automated session did not install the extension, so it has no Chrome version. It did not open a CSV in a spreadsheet. The installed-extension result is the later Phase 6 manual entry.

_This entry is the automated session only._

### 2026-11-23 — Phase 6 completion audit, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (36 files, 301 tests, all passed), and the production build. `dist/manifest.json` still requests `storage`, `alarms`, `notifications`, `activeTab` and `scripting`. Version is 0.6.0.
- Search, filters, sort, filtered export, the description column defaulting to off, and recovery from a failed restore delete are covered by the automated tests. This session did not install the extension, so it has no Chrome version, and it did not open a CSV in a spreadsheet. The installed-extension result is the later Phase 6 manual entry.

_This entry is the automated session only._

### Manual Chrome verification reported for Phases 1–5

This entry is the manual check. The automated entries above used an in-memory stand-in or saved public HTML. They are not this result.

- Reported by the project owner. The date of the test, the Chrome version and the macOS version were not recorded. No notification screenshot was provided.
- Confirmed working in the installed extension:
  - One-click job saving and manual entry fallback.
  - Editing saved application fields.
  - Four-stage Kanban board and application management.
  - Deadline reminders and notification functionality.
  - Internshala, LinkedIn Jobs and Naukri extraction workflows.
  - Calendar and reminder Settings.
- The three sites are not marked Verified. That label still needs a recorded date, a Chrome version, and at least three listings. None of those details were included.
- Checklist rows for steps that were not described are marked "Not recorded". That is a missing detail, not a recorded failure.
- This report did not include Phase 6. The later Phase 6 entry records what was confirmed after that.

_Phases 1–5 were confirmed in the installed extension at the workflow level above. Phase 6 is recorded in the next entry._

### Manual Chrome verification reported for Phase 6

This entry is the manual check of Phase 6 in the installed extension. The Phase 6 automated entries above are not this result. Phases 1–5 were already confirmed in the previous manual entry, and that earlier testing remains part of the record.

- Reported by the project owner. The date of the test, the Chrome version and the macOS version were not recorded.
- Confirmed working in the installed extension:
  - Search, multi-word matching, all filters and combined filters.
  - Sorting and application board behaviour.
  - Filtered and full CSV downloads.
  - A CSV opened in Apple Numbers, with the data and columns displaying correctly.
  - Settings and the data-management interface.
  - Existing application, calendar and reminder functionality still working.
- Google Sheets, LibreOffice and Excel were not part of this check.
- Backup, restore and delete all data were not part of this check.
- Schema version is still 1. There is no older job shape to migrate, and this check does not claim that an older-schema backup can be imported.
- Checklist details that were not described are marked "Not recorded". That is a missing detail, not a recorded failure.

_The workflows listed above were confirmed in the installed extension. Environment metadata for this check was not recorded._

### 2026-11-23 — Phase 7, public-page inspection

This entry is a look at public pages. It is not a fixture test and it is not an installed-extension test. No site below is Verified. Cloudflare checks that a normal browser completed on its own were not treated as a block. A hard block was not bypassed.

- Wellfound: `https://wellfound.com/jobs/4981464-software-engineer` and `https://wellfound.com/jobs/4875063-junior-qa-engineer` returned public HTML. Both were remote, named Indian cities under "Hires remotely in", and had no labelled application deadline. "Posted" was not used. Pay was only in prose, so salary stays missing.
- Indeed: `in.indeed.com` again returned HTTP 403 with a Cloudflare challenge, the same result as 2026-11-22. No adapter.
- Y Combinator: `https://www.ycombinator.com/companies/wasmer/jobs/peVgEv8-rust-engineer-distributed-systems` and `https://www.ycombinator.com/companies/turing-labs-inc/jobs/ta5gNnk-senior-software-engineer-full-stack` returned HTTP 200 with JobPosting data. The first hid pay as `$1` and limited applicants to the US. The second listed a real salary and "US citizen/visa only", with a city and no remote word. Neither had a labelled deadline. `workatastartup.com/jobs` returned HTTP 406 and is not part of the adapter.
- Himalayas: a direct download received a Cloudflare check. In a browser, `https://himalayas.app/companies/nurdsoft/jobs/senior-qa-engineer-india` and `https://himalayas.app/companies/holepunch/jobs/p2p-node-js-engineer-100-remote-worldwide-7428948833` loaded. Both had "Apply before Dec 10, 2026". The first was India only. The second's title said Worldwide while the applicant list was Denmark, Germany, Greece and Switzerland. `validThrough` matched the visible date and is still ignored.
- We Work Remotely: a direct download of a detail page received a Cloudflare check. In a browser, `https://weworkremotely.com/remote-jobs/welcomehome-software-senior-software-engineer` and `https://weworkremotely.com/remote-jobs/lemon-io-senior-react-full-stack-developer-8` loaded. Apply before was "Dec 2th, 2026" and "Dec 19th, 2026". The first country was the United States. The second was a long country list that did not include India, and the description said visa assistance is not provided. Neither page said "Anywhere in the World".
- Unstop: a direct download was an Angular shell. In a browser, three listings rendered: `https://unstop.com/jobs/data-scientist-exl-1821516`, `https://unstop.com/internships/power-bi-apprenticeship-crowe-llp-1809168` and `https://unstop.com/internships/software-development-internship-gokwik-1809276`. All were in office in India. None contained an application-deadline label. JSON-LD `validThrough` and a salary value of "Unpaid" were present and are ignored.
- Cutshort: `https://cutshort.io/job/Senior-Full-stack-Engineer-Sprinto-Rqw1mekJ` and `https://cutshort.io/job/Software-Architect-Reflektive-5Jr0Iim2` returned public HTML. Both said "Remote only". The applicant location in JSON-LD was "NA". The first showed a rupee range. The second said pay was not disclosed. "Posted" was not a deadline. `/view/j/` is disallowed by robots and was not fetched.
- HiringCafe: time-boxed. The page that loaded was a browse directory, not a job detail. `/viewjob/` is disallowed and was not fetched. No adapter.
- Glassdoor: time-boxed. A search URL was a results page and was not scraped. A direct job-listing URL returned a Cloudflare "Humans only" block (Ray ID a5f1d3dc0cb37ef8). It was not retried. No adapter.
- ZipRecruiter: time-boxed. A direct download redirected to `ziprecruiter.in` and returned HTTP 403. A browser search landed on a US "jobs near me" page. No job detail was opened. No adapter.

_No Chrome extension was installed for this inspection. The later confirmation from the project owner is a separate entry._

### 2026-11-23 — Phase 7, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (37 files, 328 tests, all passed), and the production build. `dist/manifest.json` still requests `storage`, `alarms`, `notifications`, `activeTab` and `scripting`. Version is 0.7.0.
- The new parser fixtures cover missing fields, empty headings, non-job URLs, canonical ids, eligibility, explicit deadlines, and deadlines that must not be invented. Indeed, HiringCafe, Glassdoor and ZipRecruiter stay on manual entry in those tests. A Wellfound preview test confirms nothing is saved until Save, and an Indeed URL stays on the manual form.
- This session did not install the extension, so it has no Chrome version. No Phase 7 site is Verified. The public-page inspection above is a separate entry.

_This entry is the automated session only._

### Manual Chrome confirmation reported for Phases 1–7

This entry is the project owner's confirmation. It does not replace the automated entries or the public-page inspection above, and it does not fill in details those entries left unrecorded.

- Reported by the project owner. The date of the test, the Chrome version, the macOS version and the listing counts were not supplied.
- Confirmed working in the installed extension:
  - Phase 1: foundation, dashboard and manual entry.
  - Phase 2: job management (create, read, update, delete).
  - Phase 3: the four-stage Kanban board.
  - Phase 4: Internshala, LinkedIn and Naukri integrations.
  - Phase 5: deadline management, reminders and calendar.
  - Phase 6: search, filters, sorting, CSV export and data management.
  - Phase 7: Wellfound, Y Combinator Jobs, Himalayas, We Work Remotely, Unstop and Cutshort integrations.
- Indeed, HiringCafe, Glassdoor and ZipRecruiter were not part of this integration list. They remain manual-entry only.
- No site is Verified. That label still needs a recorded date, a Chrome version, and at least three listings.
- Checklist rows whose specific steps were not described stay "Not recorded".

_The phase-level functionality above was confirmed in the installed extension. Environment metadata for this check was not supplied._

## Design reference

The visual direction is inspired by a screenshot of the Northline website ([`docs/design-reference/northline-reference.png`](docs/design-reference/northline-reference.png)). Job Clipper adapts its design language (near-black backgrounds, lime-green glow, editorial serif headlines) but does not copy Northline's branding, logo, content or exact interface. The screenshot is a reference only and is not bundled into the extension.
