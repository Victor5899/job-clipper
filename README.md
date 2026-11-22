# Job Clipper

An offline-first Chrome extension for clipping, tracking and getting reminded about internships and entry-level jobs, with an honest check of whether each opportunity is actually open to an applicant based in India.

Built for the Bharat Space Education Research Centre (BSERC) GenAI Internship — Week 2, Project 10.

> **Current status: Phase 5 (deadline reminders and calendar) implemented, awaiting review.**
> Automated checks are recorded in the [verification log](#verification-log). The extension has **not been loaded in Chrome**, so a real notification has not been seen. Internshala, LinkedIn Jobs and Naukri were read from public pages on 2026-11-22; that check is **not** a Verified install. See the [Phase 5 checklist](#manual-verification-checklist-phase-5). Search, filters and CSV export are still not implemented. This file is updated at the end of each phase with real results only.

## Documents

- [`PROJECT_SPEC.md`](PROJECT_SPEC.md): full product requirements, architecture, design system, integration strategy, testing strategy and phased roadmap.
- [`prompts.md`](prompts.md): every prompt used in this project, in chronological order, verbatim.
- [`CHANGELOG.md`](CHANGELOG.md): version history.

## What works now

- **Popup** (toolbar icon or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>J</kbd>): on an Internshala, LinkedIn or Naukri job page, the extension reads the listing in the tab you already have open and shows an editable preview. Missing fields are named. Nothing is saved until you press Save. You can change every detected value, including India eligibility. If the page is not a supported listing, or the read fails, the same manual form is there: URL and page title prefilled, company empty. On browser pages that aren't regular websites (for example `chrome://` pages) nothing is prefilled, and the form still works.
- **Validation:** title, company and URL are required. Only `http://` and `https://` links are accepted. Errors appear next to each field, and focus moves to the first problem.
- **Drafts:** whatever you type in the popup is kept in `chrome.storage.session` for that tab. If the popup closes before you save, reopening it restores the entry. The draft is cleared on save, and session storage is wiped when Chrome quits.
- **No deadline is fine:** a job without a deadline is saved with `deadline: null` and shown as "No deadline provided". Deadlines are never guessed.
- **Dashboard** (opens automatically on first install, or via "Open dashboard"): hash-routed pages for Overview, Applications, Calendar and Settings, in a Northline-inspired dark editorial design.
  - **Overview** has the "Your next opportunity starts here." hero, four statistics (Tracked, Applied this week, Interviews, Due in 7 days), and three panels: Recently saved, Application overview (weekly saves chart and pipeline), and Upcoming deadlines (14-day timeline).
  - Every number is calculated from your saved jobs. With nothing saved, the panels show empty states, never sample data.
  - **Add application** opens the same manual form in a dialog, with no job page needed.
  - The dashboard updates live when a job is saved, edited or deleted, including from the popup.
  - Upcoming deadlines on the Overview open that job. The line about jobs with no deadline opens the Calendar.
- **Reminders:** a job is reminded only when it has a valid deadline and its reminder is on. The default is 1 day before at 09:00, changeable in Settings and per job (same day, or 1, 2, 3 or 7 days before, or a specific time before the deadline). Adding a deadline later schedules the reminder. Clearing the deadline, turning the reminder off, or deleting the job removes it. The background worker uses `chrome.alarms` and `chrome.notifications`. Clicking a reminder opens the dashboard on that job. If Chrome was closed when a reminder was due, the next launch shows a missed reminder while the deadline is still ahead, or marks it expired once the deadline has passed. "Remind me in 1 minute" on a job with a future deadline uses this same path, then schedules the job's previous reminder again if it is still due. "Send test notification" in Settings only checks that the operating system will show a Chrome notification.
- **Calendar:** a month grid of deadlines, interviews and reminders. Jobs with no deadline are listed under "No deadline provided" and are not placed on a day. On a narrow window the month is an agenda list.
- **Applications:** a Kanban board with four stages — Saved, Applied, Interview and Result. A card shows the job title, company, deadline (or "No deadline provided"), India eligibility and source. Drag a card onto another stage, or change the stage with the card's Move to list. With the card focused, <kbd>[</kbd> and <kbd>]</kbd> move it one stage backward or forward. The first move into Applied records the applied date. A move into Interview can record an interview date, and Skip leaves that date empty. A move into Result asks for an outcome (Selected, Rejected, Withdrawn or No response); Leave unset keeps the card in Result and shows "Outcome not set". On a narrow window, a stage switcher shows one column at a time; dragging reveals every column so a card can still be dropped. Stage changes are written through the job repository into `chrome.storage.local` and stay there across a dashboard reload. Open a card for the existing details, editor and delete confirmation.
- **Editing:** a right-hand sheet edits every stored field: title, company, URL, source, description, location, work arrangement, India eligibility, employment, pay, skills, status, result, applied and interview dates, deadline, notes and contact. The popup can suggest India eligibility from the page. The sheet keeps whatever you save, and changing the value there marks it as your correction. Clearing the deadline stores `null` and shows "No deadline provided". Status changes are appended to the job's history.
- **Delete:** Delete asks for confirmation and names the job. Cancel leaves it in place.
- **Duplicates:** links are compared after normalisation (host case, a leading `www.`, tracking parameters, and the LinkedIn and Indeed shapes in the spec). The same link, or the same site job id, shows "Already saved on …". A very similar company and title saved within 60 days is called out too. You can open the existing application, edit it, or save a separate copy. Nothing is overwritten silently. An edit made from an older copy is refused if the stored job changed in the meantime.
- **Storage:** each job is stored under its own `job:<uuid>` key in `chrome.storage.local`, with IDs from `crypto.randomUUID()`. Default settings and a schema version are written on install. Existing data is kept on update. Schema version stays 1; the migration runner is a no-op until a later version needs a step.

## Still ahead

- Search, filter and sort applications, and export all or filtered applications to CSV.
- More job sites after the first three. Wellfound and Y Combinator Jobs were reachable on 2026-11-22 and are not built yet. Indeed answered with a Cloudflare challenge and was left alone.

It runs entirely in your browser: no backend, no login, no paid API, no cloud service.

## Status

### Mandatory BSERC features

| Feature | Status | Planned phase |
| --- | --- | --- |
| One-click save of role, company, link and deadline | Manual entry and a detection preview are implemented. The preview was checked against public page HTML, not in an installed extension | 1 (manual), 4 (detect) |
| Every saved field editable | Implemented (Phase 2), not yet manually tested in Chrome | 2 |
| Kanban board: Saved, Applied, Interview, Result | Implemented (Phase 3), not yet manually tested in Chrome | 3 |
| Reminder before an application deadline | Implemented (Phase 5). Not yet seen as a real Chrome notification | 5 |
| Search and CSV export | Not implemented. Search was specified for Phase 3 and is not in this build. CSV remains Phase 6 | 3 (search), 6 (CSV) |

### BSERC completion criteria

| Criterion | Status |
| --- | --- |
| Works on three different job websites | Adapters for Internshala, LinkedIn Jobs and Naukri read public pages on 2026-11-22. Not run inside Chrome as an installed extension, so this is not Verified |
| Manual entry when details cannot be detected | Implemented and covered by automated tests; not yet manually tested in Chrome |
| A deadline reminder actually appears | Scheduled in automated tests. Not yet seen in Chrome |
| Exported CSV opens correctly in a spreadsheet | Not yet tested |

### Additional planned features

India eligibility is suggested in the popup from evidence on the page, and you can correct it before saving. The calendar and deadline reminders are implemented. JSON backup and import are still planned. Duplicate warnings are implemented. See [`PROJECT_SPEC.md`](PROJECT_SPEC.md) for details. The Northline-inspired dark dashboard and popup are implemented.

## Job site support

Listed in integration priority order. A site is marked **Verified** only after its adapter has been tested on at least three real, accessible listings, with the date and Chrome version recorded in the verification log below. Manual entry works on every website regardless of this table.

The first three sites were readable on 2026-11-22, so Wellfound and Y Combinator Jobs were not built. None of the rows below is Verified: that status needs the installed extension, a Chrome version, and at least three listings checked in that Chrome.

| # | Site | Tier | Status |
| --- | --- | --- | --- |
| 1 | Internshala | 1 | In development. Public detail pages returned HTTP 200 and the adapter read title, company, Apply By, location, stipend or CTC, skills and description. |
| 2 | LinkedIn Jobs | 1 | In development. Guest job pages returned HTTP 200. The adapter read title, company, location and employment type. No Apply By label on the pages checked. |
| 3 | Naukri | 1 | In development. A direct download is an empty client-rendered shell. In a browser, after the page rendered, the adapter read title, company, experience, location, salary when it was stated, skills and description. |
| 4 | Wellfound | 1 | Planned. A public listing returned HTTP 200 on 2026-11-22. Not implemented. |
| 5 | Indeed | 1 | Manual entry only. On 2026-11-22 a request returned HTTP 403 with a Cloudflare challenge. It was not bypassed. |
| 6 | Y Combinator Jobs | 1 | Planned. A public listing returned HTTP 200 on 2026-11-22. Not implemented. |
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

The extension requests only the permissions its shipped features use. This build requests five:

| Permission | Status | Why |
| --- | --- | --- |
| `storage` | Requested (Phase 1) | Save jobs and settings locally (`chrome.storage.local`) and keep popup drafts (`chrome.storage.session`). |
| `alarms` | Requested (Phase 5) | Schedule deadline reminders that survive the background worker being suspended. |
| `notifications` | Requested (Phase 5) | Show deadline reminder notifications. |
| `activeTab` | Requested (Phase 1) | Read the current tab's URL and title to prefill the popup, only when you click the extension icon or press its shortcut. |
| `scripting` | Requested (Phase 4) | After you open the popup, inject the read-only extractor into that tab. |

Updating from 0.4.0 to 0.5.0 asks Chrome to grant `alarms` and `notifications`. Reload the unpacked extension after building.

Deliberately **not** requested: access to all websites (`host_permissions`), `tabs`, `downloads`, `cookies`, `unlimitedStorage`. The extension makes no network requests, and its content security policy (`script-src 'self'`) allows only its own bundled scripts.

## Privacy

- All data stays on your device in `chrome.storage.local`. Nothing is sent anywhere.
- No analytics, tracking or remote code.
- The extension never reads cookies, passwords, session data or form inputs on job sites, and never bypasses login walls or bot checks. It reads only what you can already see on the page you clipped.
- Uninstalling the extension deletes its data. The planned JSON backup feature lets you keep a copy first.

## Known limitations

### Current build

- There is no search, filter or sort control. Cards in a column are ordered by the approaching deadline. Jobs with no deadline stay at the bottom of their column. Search was listed with Phase 3 in the specification; it is not in this build.
- Detection runs only for Internshala, LinkedIn and Naukri, and only after you open the popup. A deadline is stored from the page only when a label such as "Apply By" sits next to the date. Listing expiry (`validThrough`), a start date, and a date written in a sentence are ignored.
- Work arrangement and India applicant eligibility are separate. A generic "Remote" label, including Remote next to an Indian office, is Unknown — verify manually. "Work from home" only sets the arrangement to remote. On its own it never establishes Remote — India eligible, including on Internshala, Naukri, Unstop, and Cutshort. That outcome requires an applicant-location requirement of India, a phrase such as "Remote (India)" or "Anywhere in India", or India in the eligible-country list. An Indian city with no on-site, hybrid, or remote word stays Unknown. LinkedIn's guest location line often has the city and not the arrangement, even when the description says on-site. That description sentence is not used.
- Naukri's first HTML response is a loading shell. The extractor waits briefly for the rendered listing. If you open the popup before that paint, you get the manual form.
- "Clip another" returns to the tab's URL and title. It does not read the page again until you close and reopen the popup.
- CSV export and backup are not built yet.
- Reminders use this computer's local time zone. A deadline date means that local calendar day, ending at 23:59 when no time is set. There is no per-job time zone.
- Only the soonest 400 future reminders are armed at once. An hourly alarm fills in the rest. A job with no deadline, an impossible date, a passed deadline, or a reminder time that is not before the deadline gets no alarm.
- A Chrome notification has not been confirmed on this machine. The automated tests use an in-memory stand-in for `chrome.alarms` and `chrome.notifications`.
- "Explore opportunities" scrolls to the Overview panels.
- A similar title and company is only flagged for jobs saved in the last 60 days. Older ones are left alone unless the link matches.
- Not yet manually tested as an installed extension (see the checklists below). The page reads in the verification log used saved public HTML and a browser tab, not `chrome.scripting`.

### Planned behaviour

- Most job sites don't publish an application deadline, so many jobs will show "No deadline provided" until you add one. Those jobs get no reminder.
- Reminders fire only while Chrome is running; missed reminders appear the next time Chrome starts.
- On macOS, Chrome must be allowed to show notifications (System Settings → Notifications → Google Chrome), and Focus modes can hide them.
- Site layouts change, so automatic detection can break. Manual entry always remains available.
- Local storage is limited to about 10 MB, and there is no cross-device sync.

## Tech stack

In use: Chrome Extension Manifest V3, React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, date-fns, lucide-react icons, `@dnd-kit/core` (the Kanban board), Vitest 5 with Testing Library and jsdom, ESLint 10 and Prettier.

Fonts (Instrument Serif, Inter and JetBrains Mono, via Fontsource) and icons are bundled into the build, so the extension makes no remote requests and works offline.

Planned for later phases: `zod` (import validation), Playwright (end-to-end tests).

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
                   normalisation, India eligibility, duplicate detection, deadlines, reminder planning
  messaging/       the popup-to-background message, checked and rebuilt before use
  storage/         typed chrome.storage wrapper, job repository (create, read, update,
                   delete), settings, migrations, popup drafts
  popup/           popup app: detection preview, manual entry, duplicate warning, saved state
  dashboard/       dashboard app: hash router, layout, Overview, Kanban board,
                   calendar, reminder settings, job sheet (details, edit, delete)
  ui/              shared components, hooks, design tokens and global styles
tests/fixtures/    trimmed HTML used by the parser tests, not a live-site proof
scripts/           icon generator and the two-watch dev build
```

## Automated tests

`npm test` runs 269 tests in 30 files against an in-memory fake of the `chrome.*` APIs (`tests/fakes/chrome.ts`). They cover:

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
- **Background:** install initialisation, preservation of existing data on update, rejection of an extraction message that did not come from this extension, and one registration of the alarm, notification and startup listeners.

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

## Manual verification checklist (Phase 3)

These checks need a real Chrome profile and **have not been performed yet**. Pointer dragging, touch dragging and VoiceOver are not covered by the automated tests, which move cards with the Move to list and the bracket keys against an in-memory storage fake.

| # | Check | Result |
| --- | --- | --- |
| 1 | Reload the extension, open Applications, and confirm four columns: Saved, Applied, Interview, Result. A saved job shows its title, company, "No deadline provided" or a due date, and the India eligibility chosen in the editor. | Not yet performed |
| 2 | Drag a card from Saved to Applied. The applied date is filled. Reload the dashboard, quit Chrome, reopen the dashboard, and confirm the card is still in Applied. | Not yet performed |
| 3 | Move the same card with only the keyboard: focus it, press <kbd>]</kbd> until it reaches Interview, press Space on the drag handle and use the arrow keys as an alternative, and change stage with the Move to list. Skip the interview date, then move to Result and choose Rejected. Leave a second card's outcome unset and confirm it says "Outcome not set". | Not yet performed |
| 4 | Open a card from the board, edit the title and notes, and save. The card and the Overview update. Delete still asks for confirmation. | Not yet performed |
| 5 | After each move, Overview's Interviews count, Applied this week, Due in 7 days and the pipeline counts match the columns. A card in Result no longer counts as due. | Not yet performed |
| 6 | Narrow the window to 360 px. One stage shows at a time, the stage switcher changes column, and nothing overflows. With reduced motion on, the card does not scale while dragging. | Not yet performed |

## Manual verification checklist (Phase 4)

These checks need the extension installed in Chrome. **They have not been performed.** The HTML reads in the verification log are not a substitute.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, then reload the unpacked `dist/`. Accept the new `scripting` permission. The extension card has no errors, the service worker is active, and `dist/extractor.js` is present. | Not yet performed |
| 2 | Open an Internshala internship detail page that shows Apply By. The popup badge says Internshala, the fields are editable, the missing ones are named, and the deadline line quotes the label. Nothing appears on the dashboard until you press Save. | Not yet performed |
| 3 | Change the company and the India eligibility, leave the date, and save. The dashboard shows your company and your eligibility. The stored deadline still says it came from the page label. | Not yet performed |
| 4 | Open a public LinkedIn job (`/jobs/view/…`) with no Apply By. The deadline stays empty. A date in the description is not filled in. | Not yet performed |
| 5 | Open a Naukri `/job-listings-…` page and wait until the title is visible, then open the popup. Title, company and experience are filled. "Not disclosed" stays missing. A Remote label with only an Indian city stays "Unknown — verify manually". | Not yet performed |
| 6 | On an Internshala listing index, on a site that is not one of the three, and on `chrome://extensions`, the popup stays on manual entry and a typed job still saves. | Not yet performed |
| 7 | On the dashboard, drag or move a card between Saved, Applied, Interview and Result, edit it, and delete one with the confirmation. Overview counts follow the board. | Not yet performed |

## Manual verification checklist (Phase 5)

These checks need the extension installed in Chrome. **They have not been performed.** The automated alarm tests are not a substitute for a visible notification. No notification screenshot is recorded, because none was produced.

| # | Check | Result |
| --- | --- | --- |
| 1 | `npm run build`, reload the unpacked `dist/`, and accept the new `alarms` and `notifications` permissions. The service worker stays active. On the service worker's console, `chrome.alarms.getAll()` includes `jc:reconcile`. | Not yet performed |
| 2 | In Settings, choose a default lead time and press Save reminder settings. Press Send test notification. A Chrome notification appears. If it does not, allow Google Chrome under System Settings → Notifications and try again. Focus mode can hide it. | Not yet performed |
| 3 | Save a job with no deadline. In the service worker console, `chrome.alarms.getAll()` has no `jc:reminder:` alarm for that job. The card, the sheet and the calendar say "No deadline provided". The reminder control says to add a deadline. | Not yet performed |
| 4 | Add a deadline that is still ahead and save. `chrome.alarms.getAll()` shows one `jc:reminder:<id>` alarm. Change the date and confirm the alarm's `scheduledTime` moves. Clear the deadline and confirm that alarm is gone. | Not yet performed |
| 5 | On a job with a deadline at least a few minutes ahead, press Remind me in 1 minute. Within about a minute a notification appears. Click it. The dashboard opens with that job's sheet. Pressing it again does not stack a second notification for the same reminder. | Not yet performed |
| 6 | Quit Chrome after a reminder time has passed but before the deadline, then open Chrome. A missed-reminder notification appears. Repeat after the deadline has passed: no notification, and the sheet says the deadline has passed. | Not yet performed |
| 7 | Delete a job that has a reminder. Its alarm and notification are gone. Reload the extension (this clears alarms the way an update can). Open the dashboard or wait for the service worker. The alarm for a job that still has a future deadline is created again. | Not yet performed |
| 8 | Open Calendar. A deadline sits on its date. A job with no deadline is under "No deadline provided" and not on a day. The same deadline text appears on the Overview, the board card and the job sheet. | Not yet performed |

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

### 2026-11-22 — Phase 3, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. That runs typecheck (0 errors), ESLint (0 errors, 0 warnings), Prettier, Vitest (16 files, 123 tests, all passed) and the production build.
- No manual test in an installed extension was performed. The Phase 1, Phase 2 and Phase 3 checklists above are still open. Pointer drag, touch drag and VoiceOver were not run.

### 2026-11-22 — Phase 4, public pages (not an installed extension)

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (24 files, 220 tests, all passed), and the production build. `dist/extractor.js` is the read-only extractor. `dist/manifest.json` requests `storage`, `activeTab` and `scripting`.
- No Chrome version is recorded, because the extension was not installed.

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

_The extension has still not been tested as an installed extension in Chrome. The Phase 1, Phase 2, Phase 3 and Phase 4 checklists are open._

### 2026-11-22 — Phase 5, automated checks

- Environment: macOS 26 (Darwin 25.6), Node 25.9.0, npm 11.12.1.
- `npm run check`: passed. Typecheck 0 errors, ESLint 0 errors and 0 warnings, Prettier, Vitest (30 files, 269 tests, all passed), and the production build. `dist/manifest.json` requests `storage`, `alarms`, `notifications`, `activeTab` and `scripting`.
- No Chrome version is recorded, because the extension was not installed. A deadline notification was not shown, so there is no screenshot. The Phase 5 checklist is open.

_The extension has still not been tested as an installed extension in Chrome. The Phase 1 through Phase 5 checklists are open._

## Design reference

The visual direction is inspired by a screenshot of the Northline website ([`docs/design-reference/northline-reference.png`](docs/design-reference/northline-reference.png)). Job Clipper adapts its design language (near-black backgrounds, lime-green glow, editorial serif headlines) but does not copy Northline's branding, logo, content or exact interface. The screenshot is a reference only and is not bundled into the extension.
