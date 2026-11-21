# Prompt Log — Job Clipper

BSERC GenAI Internship — Week 2, Project 10.

Every prompt given to the AI assistant during this project is recorded here in chronological order, verbatim. Each prompt is wrapped in a fenced block so its own Markdown headings do not interfere with this file's structure. Attachments are noted beneath the prompt they belong to.

---

## Prompt 1 — Phase 0: Complete product planning and architecture

- **Date:** 2026-11-21
- **Phase:** 0 (planning)
- **Attachment:** screenshot of the Northline website, used as the primary visual reference. Saved at [`docs/design-reference/northline-reference.png`](docs/design-reference/northline-reference.png) (reference only; not bundled into the extension).
- **Outcome:** initial Phase 0 plan produced for review. No files created.

````text
# JOB CLIPPER — PHASE 0: COMPLETE PRODUCT PLANNING & ARCHITECTURE

Act as a senior product architect, Chrome extension engineer, frontend architect and UI/UX designer.

I want to build a production-quality Chrome extension called **Job Clipper** as part of the Bharat Space Education Research Centre (BSERC) GenAI Internship — Week 2, Project 10.

This is a real personal productivity tool that I intend to use to track off-campus internships and full-time job opportunities before completing my B.Tech at SRM Institute of Science and Technology in May 2027.

I want the application to be genuinely useful, technically well-engineered, visually distinctive and suitable for showcasing in my portfolio.

IMPORTANT: This is Phase 0 only. Do not implement the application yet. First create a complete, detailed and technically realistic implementation plan.

---

# 1. PRODUCT VISION

Build an offline-first job and internship tracking Chrome extension.

The user should be able to:

- Save a job from a job website with one click.
- Automatically detect job information where supported.
- Enter missing information manually.
- Edit every saved field.
- Organise opportunities using a Kanban board.
- Track application progress.
- Monitor deadlines.
- Receive actual deadline reminders.
- Search and filter saved opportunities.
- Export applications to CSV.
- Track whether a job is genuinely eligible for an applicant based in India.

The application must work locally without requiring a backend, login, paid API or cloud service.

The primary objective is to help an Indian university student find and manage eligible internships and entry-level full-time opportunities.

# 2. OFFICIAL BSERC REQUIREMENTS

Follow the official Week 2 Project 10 — Job Clipper requirements.

The following five features are mandatory:

1. One-click saving of job role, company, link and deadline.
2. Every saved field must be editable.
3. A Kanban board with four stages:
   - Saved
   - Applied
   - Interview
   - Result
4. A reminder before an application deadline.
5. Search and CSV export.

The official completion criteria are:

- The application works on three different job websites.
- When details cannot be detected, the user can enter them manually.
- A deadline reminder actually appears.
- The exported CSV opens correctly in a spreadsheet.

Do not compromise these requirements while adding extra functionality.

# 3. TARGET USERS AND JOB SEARCH CONTEXT

The primary user is an Indian B.Tech student graduating in May 2027.

The main job-search focus is:

- Data Engineering Internships
- Data Analyst Internships
- Business Intelligence Internships
- Python Developer Internships
- SQL Developer Internships
- Software Engineering Internships
- Graduate Trainee positions
- Entry-level Data Engineering roles
- Entry-level Data Analyst roles
- Graduate and new-grad full-time positions

The application should support opportunities in:

- India — On-site
- India — Hybrid
- Remote — India eligible
- Remote — Worldwide
- Remote — Restricted countries
- International on-site opportunities, if the applicant is eligible
- Unknown eligibility — Requires verification

Do not assume that every listing labelled "Remote" accepts applicants from India.

# 4. JOB WEBSITE PRIORITIES

Design a modular job-site integration architecture.

All websites below should be represented in the product roadmap.

## Tier 1 — Core job sources

These are the first six websites to prioritise:

1. LinkedIn Jobs
2. Internshala
3. Naukri
4. Wellfound
5. Indeed
6. Y Combinator Jobs

These should receive the highest implementation priority because they are the most relevant starting points for India-based internships, startup opportunities and entry-level jobs.

## Tier 2 — Additional job sources

7. Himalayas
8. We Work Remotely
9. Unstop
10. Cutshort

Implement these after the core integrations.

## Tier 3 — Optional job sources

11. HiringCafe
12. Glassdoor
13. ZipRecruiter

Keep these in the extended roadmap, but do not let them delay the core product.

## Important integration rules

- Create a separate extraction adapter for every supported website.
- Use a common normalized job data schema.
- Do not assume all websites use the same HTML structure.
- Do not promise that all fields will always be detectable.
- Use accessible page content and permitted browser APIs.
- Respect each website's terms, authentication requirements and access restrictions.
- Never bypass login walls, anti-bot protections or technical restrictions.
- Do not scrape private or unrelated user information.
- Do not collect passwords, cookies or session credentials.
- Avoid excessive requests to job websites.
- Do not depend on fragile CSS selectors when more robust extraction approaches are available.

Manual clipping must always work, even when a dedicated website adapter does not exist.

The extension should provide a reliable manual-entry fallback for every website.

Do not claim support for any website until the adapter has been implemented and tested on actual accessible job listings.

# 5. INDIA-FOCUSED JOB ELIGIBILITY

This is an important differentiating feature.

Include structured fields for:

- Work location
- Country
- City
- Remote / Hybrid / On-site
- Eligible applicant countries
- India eligibility
- Work authorisation requirement, when available
- Experience requirement
- Internship / Full-time / Contract
- Student eligibility
- Graduation-year requirement
- Job category

Create an India eligibility field with the following values:

- India — On-site
- India — Hybrid
- Remote — India eligible
- Remote — Worldwide
- Remote — Restricted region
- International — Relocation required
- Unknown — Verify manually

Do not automatically label a job as India eligible simply because it is remote.

When the website does not provide enough information, mark eligibility as Unknown rather than guessing.

Allow the user to edit the eligibility classification manually.

# 6. JOB DATA MODEL

Design a normalized job application data model.

Each saved application should support:

## Basic details
- Unique ID
- Job title
- Company
- Job URL
- Source website
- Job description
- Company website

## Location and eligibility
- Country
- City
- Work arrangement
- Eligible countries
- India eligibility
- Work authorisation information

## Employment details
- Employment type
- Experience requirement
- Salary or stipend
- Required skills
- Job category

## Application tracking
- Application status
- Date saved
- Application date
- Deadline
- Interview date
- Result
- Notes
- Contact information, if manually entered

## Reminders
- Reminder enabled/disabled
- Reminder date and time
- Reminder status

Every field must be editable.

The four mandatory fields — job title, company, job URL and deadline — must be supported even when no other information is available.

Support optional fields without breaking the application.

Plan duplicate detection using a combination of normalized job URL, company and job title. Avoid accidental duplicate saves while allowing the user to override when appropriate.

# 7. APPLICATION BOARD

Design a Kanban board with these four mandatory columns:

1. Saved
2. Applied
3. Interview
4. Result

Each job card should display:

- Job title
- Company
- Location
- Employment type
- Deadline
- India eligibility
- Source website
- Application status

Support:

- Drag-and-drop between columns.
- Moving cards using accessible keyboard controls.
- Editing cards.
- Deleting cards with confirmation.
- Opening the original job listing.
- Adding notes.
- Filtering by source, category, eligibility and deadline.

Moving a card must persist its new status.

The Result column should support outcomes such as Selected, Rejected, Withdrawn and No Response, without creating unnecessary extra Kanban columns.

# 8. DEADLINE MANAGEMENT

Implement real deadline reminders.

Use Chrome's supported extension APIs, such as:

- chrome.alarms
- chrome.notifications

Plan:

- Configurable reminder timing.
- Default reminder before a deadline.
- Notification when the reminder is due.
- Handling of expired deadlines.
- Rescheduling after deadline edits.
- Handling of deleted applications.
- Recovery and reconciliation after Chrome restarts or extension updates.

Do not rely on JavaScript setTimeout as the only reminder mechanism.

Explain Chrome alarm limitations and how the implementation will recover scheduled reminders.

The reminder must actually appear in Chrome during testing.

# 9. SEARCH AND FILTERS

Provide a fast search interface that searches:

- Job title
- Company
- Location
- Skills
- Job description
- Notes

Provide filters for:

- Application status
- Website/source
- Employment type
- Job category
- India eligibility
- Remote / Hybrid / On-site
- Experience level
- Deadline range

Allow sorting by:

- Recently saved
- Deadline approaching
- Recently updated
- Company
- Job title

# 10. CSV EXPORT

Implement a proper CSV export.

Include useful application fields such as:

- Job title
- Company
- Job URL
- Source
- Location
- Employment type
- India eligibility
- Experience requirement
- Deadline
- Application status
- Date applied
- Notes

Requirements:

- Correct CSV escaping.
- Proper quotation of commas, quotes and multiline fields.
- UTF-8 support.
- Spreadsheet-friendly output.
- Sensible filename.
- Export all applications or filtered applications.
- No server-side processing.

Plan tests for special characters, commas, quotation marks, multiline text and Indian currency values.

# 11. VISUAL DESIGN — NORTHLINE REFERENCE

IMPORTANT: I have attached a screenshot of the Northline website.

Use this screenshot as the primary visual reference for Job Clipper.

I want a strong visual resemblance in its overall design language, visual hierarchy, colour atmosphere, typography, glow effects and premium presentation.

Do not copy Northline branding, logo, content or exact interface.

Adapt its design language to Job Clipper.

## Overall design identity

Create a premium, cinematic, editorial-style dark SaaS experience.

The application should feel like a polished startup product.

### Colour palette

- Main background: near-black (#080908).
- Secondary surfaces: dark charcoal.
- Elevated cards: translucent dark grey.
- Primary accent: vivid lime green.
- Supporting accent: muted olive green.
- Main text: warm off-white.
- Secondary text: muted grey.
- Borders: subtle charcoal-grey.

Use lime-green radial lighting and ambient glow behind the hero and selected dashboard elements.

Avoid excessive gradients or bright green surfaces everywhere.

### Typography

Use a combination of:

- Elegant editorial serif typography for major headlines.
- Modern sans-serif typography for application data, navigation, forms and buttons.
- Monospaced or technical typography for small metadata where appropriate.

Plan locally bundled fonts or reliable system fallbacks so the extension works offline.

### Hero section

Use this headline:

"Your next opportunity starts here."

Supporting text:

"Discover, organise and track every opportunity. One clear view of your career journey."

Primary CTA:

"Add an application"

Secondary CTA:

"Explore opportunities"

The layout should feel spacious, editorial and cinematic.

### Dashboard composition

Adapt the reference's three-panel composition:

LEFT PANEL:
Application activity or recently saved jobs.

CENTRE PANEL:
Main application overview, statistics and application progress.

RIGHT PANEL:
Upcoming deadlines and reminders.

Use large numerical statistics, subtle dividers and minimal status indicators.

### Main navigation

Include:

- Overview
- Applications
- Calendar
- Settings

Use a clean navigation bar inspired by the attached reference.

### Kanban design

The Kanban board must remain highly functional.

Use:

- Dark elevated cards.
- Subtle borders.
- Lime-green status accents.
- Clear company and job information.
- Readable deadlines.
- Small source indicators.
- Smooth but restrained drag-and-drop feedback.

Do not sacrifice usability for decoration.

### Chrome popup

The extension popup should use the same visual identity.

Include:

- Job Clipper branding.
- Detected job title.
- Company.
- Deadline.
- Eligibility information.
- Editable fields.
- Save to Job Clipper action.
- Open full dashboard action.

When automatic detection fails, show manual entry.

### Responsive design

The dashboard should work on:

- Desktop.
- Laptop.
- Tablet.
- Narrow browser windows.

The popup should remain compact and usable.

Respect reduced-motion settings.

Provide accessible contrast, keyboard focus states and semantic controls.

# 12. TECHNOLOGY STACK

Plan the architecture around:

- Chrome Extension Manifest V3.
- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Chrome extension APIs.
- chrome.storage.local.
- chrome.alarms.
- chrome.notifications.
- Content scripts.
- Background service worker.
- Site-specific extraction adapters.

Use a shared design-token system for the dashboard and popup.

Keep the project structure maintainable. Avoid unnecessary framework complexity.

Do not introduce a backend, login, cloud database, paid API or external service dependency.

The extension must work offline for its installed features.

All required fonts, icons and frontend assets should be bundled locally.

# 13. ARCHITECTURE AND SECURITY

Plan a clear separation between:

- Popup UI.
- Full dashboard.
- Background service worker.
- Content scripts.
- Website adapters.
- Storage layer.
- Job normalization.
- Kanban functionality.
- Search and filters.
- Deadline scheduling.
- Notifications.
- CSV export.
- Shared UI components.
- Design tokens.

Use least-privilege permissions.

Justify every permission in the Manifest V3 file.

Do not request broad website access unless essential.

Use secure communication between content scripts, popup and service worker.

Treat all website content as untrusted data.

Avoid unsafe HTML injection.

Validate imported or externally extracted content.

Prevent duplicate event listeners and duplicate reminder scheduling.

Explain how data is preserved through Chrome restarts and extension updates.

# 14. PROMPT AND DOCUMENTATION MANAGEMENT

The BSERC instructions require every prompt to be saved in chronological order in prompts.md.

Plan to create:

- README.md
- prompts.md
- PROJECT_SPEC.md
- CHANGELOG.md, if useful

The documentation must distinguish implemented features from planned features.

Do not fabricate test results or claim integrations work before they are tested.

# 15. REQUIRED PHASED IMPLEMENTATION PLAN

Divide implementation into clear phases.

Suggested sequence:

Phase 0 — Product requirements, architecture and planning.

Phase 1 — Chrome extension foundation, dashboard shell, design system and manual job entry.

Phase 2 — Job application data model, storage and complete editable application management.

Phase 3 — Kanban board, drag-and-drop, search and filters.

Phase 4 — Job-site extraction adapters, beginning with the highest-priority websites.

Phase 5 — Additional website integrations and eligibility classification.

Phase 6 — Deadline management and real Chrome notifications.

Phase 7 — CSV export, data management and reliability improvements.

Phase 8 — Comprehensive testing, security review, documentation and final packaging.

You may recommend a better sequence if technically justified, but preserve all mandatory requirements.

For every phase specify:

- Objective.
- Files/modules to create or modify.
- Features included.
- Dependencies.
- Acceptance criteria.
- Manual test cases.
- Automated test cases.
- Potential risks.
- Definition of done.

# 16. PHASE 0 DELIVERABLES

Before implementation, produce a detailed planning document covering:

1. Product requirements document.
2. User stories and user journeys.
3. Functional requirements.
4. Non-functional requirements.
5. Full technology architecture.
6. Folder and file structure.
7. Data model and storage design.
8. Chrome Manifest V3 permission plan.
9. Popup and dashboard component hierarchy.
10. Complete design system inspired by the attached Northline reference.
11. Responsive layout strategy.
12. Job website integration strategy for all 13 listed sources.
13. India-focused job eligibility classification.
14. Kanban and drag-and-drop design.
15. Deadline reminder and alarm recovery strategy.
16. Search and filtering strategy.
17. CSV export specification.
18. Security and privacy considerations.
19. Offline functionality plan.
20. Testing strategy.
21. Detailed implementation roadmap with acceptance criteria.

# 17. IMPORTANT EXECUTION RULES

- This is a planning-only task.
- Do not start implementing the application.
- Do not generate placeholder functionality.
- Do not create a partial implementation.
- Do not silently remove any mandatory requirement.
- Do not claim that any website integration is guaranteed before testing.
- Do not overengineer the project.
- Prioritise reliability, usability, maintainability and visual quality.
- Make technically realistic recommendations.
- Identify limitations honestly.

First inspect the existing project folder without modifying implementation files.

If the folder is empty, state that clearly.

Produce the complete Phase 0 plan as a structured document, preferably PROJECT_SPEC.md, and provide a concise summary in your response.

Then STOP and wait for my explicit approval before Phase 1 implementation.
````

---

## Prompt 2 — Phase 0: Plan refinements

- **Date:** 2026-11-22
- **Phase:** 0 (planning)
- **Outcome:** plan revised (Revision 1): fixed 13-site integration priority, three-site first milestone, deadline-optional policy, reminders only with a valid deadline, manual clipping guarantee. No files created.

````text
Review the existing Job Clipper Phase 0 plan and make the following refinements without changing its overall architecture or visual direction.

1. Preserve all 13 target job websites and their current three-tier structure, but explicitly use this integration priority:

   1. Internshala
   2. LinkedIn Jobs
   3. Naukri
   4. Wellfound
   5. Indeed
   6. Y Combinator Jobs
   7. Himalayas
   8. We Work Remotely
   9. Unstop
   10. Cutshort
   11. HiringCafe
   12. Glassdoor
   13. ZipRecruiter

2. Make it explicit that the first integration milestone is three genuinely tested websites. The remaining integrations must not block delivery of the mandatory BSERC features.

3. Clarify deadline handling:
   - A job can be saved even if its deadline is unavailable.
   - Display "No deadline provided" when the deadline is unknown.
   - Never invent or infer an unverified deadline.
   - Allow the user to enter or edit a deadline later.
   - Reminders should only be scheduled when a valid deadline exists.

4. Preserve the India eligibility classification and its evidence-based approach. Remote must never automatically mean India eligible.

5. Keep manual clipping available on every website, including websites without a verified adapter.

6. Keep the Northline-inspired dark editorial design, lime-green glow, typography, three-panel dashboard and shared design tokens unchanged.

7. Review the roadmap for contradictions after making these changes. Keep all five mandatory BSERC requirements and the four completion criteria intact.

This is still Phase 0 planning only. Do not implement the application.

Update the existing plan and show me the revised Phase 0 plan for approval.
````

---

## Prompt 3 — Phase 0: Approval to write the Phase 0 documents

- **Date:** 2026-11-22
- **Phase:** 0 (planning)
- **Attachment:** the approved Phase 0 plan (Revision 1), now stored as [`PROJECT_SPEC.md`](PROJECT_SPEC.md).
- **Outcome:** `PROJECT_SPEC.md`, `prompts.md`, `README.md` and `CHANGELOG.md` written. No application code written; Phase 1 awaits explicit approval.

````text
Job Clipper — Phase 0 Specification (to be written to PROJECT_SPEC.md)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.
````
