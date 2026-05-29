# Return Window Buddy

A small local-first web app for tracking purchase return windows, receipt conditions,
and calendar reminders before the last safe day slips by.

## What it does

- Add an item, store or owner, purchase date, return window, condition, and return path.
- See urgent, soon, expired, open, and completed items sorted by deadline.
- Get a plain-language next action for each item, including when to test it or act now.
- Copy a ready-to-send checklist for a shopping trip or pickup errand.
- Download an `.ics` calendar file with one-day-before alerts.
- Keep data in `localStorage`; no login, account, server, or API key.

## Why it is useful

Return windows are easy to lose because the important detail is scattered across
email, receipts, packaging, and memory. This app turns each uncertain purchase
into one small decision record: what to test, what must stay intact, and when the
last return day is.

## Inspiration

This was built after a short scan of recent Show HN small-tool launches,
including simple day-planning, window-switching, and family-reference utilities.
The useful pattern was not another big workspace, but a single browser utility
that removes a specific recurring friction point. The implementation and copy are
original and do not reuse code, assets, or product text from those projects.

## Run locally

Open `index.html` directly, or run a local server:

```bash
npm run serve
```

Then open:

```text
http://localhost:4173
```

## Test

```bash
npm test
```

The tests cover deadline math, status labels, next-action cues, checklist output,
calendar export, and form validation.

## Core workflow

1. Add or edit a purchase.
2. Check the next deadline, urgency summary, and next action.
3. Copy the checklist before leaving home, or download the calendar reminder.
4. Mark the item done after returning, keeping, or resolving it.

## Possible extensions

- Receipt photo attachment with local-only storage.
- CSV import for bulk online orders.
- Browser notification reminders.
- Shared printable return checklist.
