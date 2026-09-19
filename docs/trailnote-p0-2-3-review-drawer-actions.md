# TrailNote — Combined P0 #2 + #3 Implementation Spec
## Full Report Review Drawer + Explicit Moderation Actions

## Purpose

This document defines the implementation plan for the remaining two P0 moderation improvements:

1. **Full report review drawer**
2. **Clear, explicit moderation action names and outcomes**

These two features should be implemented together because the review drawer is the place where the moderator makes the final moderation decision.

This document assumes **P0 #1 — revision-aware moderation** is already implemented and working.

Do not reimplement or weaken the P0 #1 safeguards.

---

# 0. Instructions for the Coding Model

You are implementing this against the current TrailNote codebase.

Before changing any code:

1. Read the current moderation implementation.
2. Read the already-implemented revision-aware moderation logic.
3. Identify the existing data flow for:
   - report listing
   - selected report detail
   - reported/current revision data
   - report actions
   - moderation history
   - dialogs
   - photo display
4. Reuse current patterns wherever possible.
5. Do not blindly replace working code with the examples in this document.
6. Treat this file as the **product and engineering specification**, not as literal code that must be copied.

Important constraints:

- Do not remove or weaken revision safety.
- Do not introduce unrelated features.
- Do not refactor unrelated code.
- Do not add a new UI library if existing Radix/dialog components are sufficient.
- Do not add a new image-viewer package.
- Do not add a database migration unless the current code genuinely requires one.
- Do not expose historical revisions publicly.
- Do not expose reporter/private user information unnecessarily.
- Do not make destructive moderation possible directly from a compact table row.
- Do not consider the task complete until tests, typecheck, lint, and build pass.

The implementation should match the existing TrailNote UI style and reuse existing tokens/components.

---

# 1. Product Goal

The moderation dashboard should separate two responsibilities:

## Reports table

Answers:

> What needs the moderator's attention?

It should remain compact and scannable.

## Report review drawer

Answers:

> What exactly happened, what do travellers see now, and what should the moderator do?

The drawer is the decision surface.

Do not make major moderation decisions from an abbreviated table row.

---

# 2. Current Problem

A report row typically shows summary information such as:

```text
Reason
Tip excerpt
Destination
Author
Reported
Status
Action
```

This is enough to find reports, but not enough to safely decide whether content should remain public.

The moderator may need:

- the full report
- the complete tip
- reported revision
- current revision
- photos
- price
- category-specific details
- trip month
- location data
- author context
- previous moderation history

Also, action labels such as:

```text
Resolve
Dismiss
```

are too vague.

A moderator must understand exactly what will happen.

---

# 3. Main UX Decision

Use a **right-side review drawer** rather than a separate report details page.

Desktop concept:

```text
┌──────────────────────────────────────────────┬───────────────────────────────┐
│ Reports                                      │ Tip report                    │
│                                              │                               │
│ Inaccurate  Auto fare...  Ooty      Review │ Reason                        │
│ Spam        Visit my...   Hampi     Review │ Inaccurate information        │
│ Unsafe      Trail...      Manali    Review │                               │
│                                              │ Traveller's report            │
│                                              │ Fare changed to ₹80...        │
│                                              │                               │
│                                              │ [Reported] [Current]          │
│                                              │                               │
│                                              │ Full tip                      │
│                                              │ Photos                        │
│                                              │ Details                       │
│                                              │ Author                        │
│                                              │ History                       │
│                                              │                               │
│                                              │ Resolution note               │
│                                              │ [.........................]   │
│                                              │                               │
│                                              │ Issue fixed                   │
│                                              │ Dismiss report                │
│                                              │ Hide current tip              │
└──────────────────────────────────────────────┴───────────────────────────────┘
```

The queue remains visible behind the drawer on larger screens.

---

# 4. Reports Table Changes

For contribution reports, the table action should become:

```text
Review
```

Do not keep destructive actions such as:

```text
Resolve
Hide
Dismiss
```

directly in the table row.

Recommended columns:

```text
Reason
Tip excerpt
Destination
Author
Reported
Status
Action
```

The table is for scanning.

The drawer is for decisions.

---

# 5. Drawer URL State

Represent the selected report in the URL.

Recommended:

```text
/moderation?section=reports&review=<report-id>
```

If filters are active:

```text
/moderation
?section=reports
&status=open
&type=tip
&q=auto
&page=2
&review=<report-id>
```

Opening the drawer should add only:

```text
review=<report-id>
```

Closing the drawer should remove only:

```text
review
```

and preserve:

```text
section
status
type
q
from
to
page
```

---

# 6. Why URL State Is Preferred

Benefits:

- refresh preserves the selected report
- browser Back/Forward works correctly
- selected report can be deep-linked internally
- existing server-side authorization remains simple
- no unnecessary client API is required
- queue state stays deterministic
- closing returns the moderator to the same queue position

---

# 7. Query Validation

Extend the existing moderation query schema with:

```ts
review: z.uuid().optional()
```

Only process it when:

```ts
section === "reports"
```

If the selected report:

- no longer exists
- cannot be accessed
- has invalid related data

show a controlled unavailable state.

Do not crash the entire dashboard.

---

# 8. Full Detail Loading

Do not fetch full report details for every queue row.

Only load the complete detail when:

```text
review=<report-id>
```

is present.

If the P0 #1 implementation already introduced:

```ts
moderationReportDetail(...)
```

reuse it.

Do not create a second competing report-detail query.

The selected-report query should remain server-authorized.

---

# 9. Drawer Data

Use the existing P0 #1 report-detail DTO if already available.

The drawer should have access to at least:

```ts
report: {
  id
  reason
  details
  status
  createdAt
  resolvedAt
  resolutionNote
  reportedRevision
}

tip: {
  id
  status
  currentRevision
  editedAfterReport
  destination
  author
  reportedVersion
  currentVersion
}

history
```

Do not pass raw DB rows directly to the client if a safe DTO already exists.

---

# 10. Drawer Structure

Use this order:

```text
1. Header
2. Report context
3. Edited-after-report warning
4. Version selector
5. Full tip content
6. Photos
7. Author context
8. Moderation history
9. Resolution note
10. Moderation actions
```

The moderator should understand the report before seeing action buttons.

---

# 11. Header

Show:

```text
Tip report                              [Open]

Reported 19 Sep 2026
Ooty, Tamil Nadu
```

Include an accessible close button.

Use clear wording.

Avoid generic labels such as:

```text
Details
Information
Item
```

Prefer:

```text
Tip report
```

---

# 12. Report Context

Show the report itself before the tip.

Example:

```text
Reason
Inaccurate information

Traveller's report
"The shared-auto fare has changed to ₹80."
```

Map internal values to readable labels.

Example:

```ts
const reportReasonLabels = {
  spam: "Spam",
  inaccurate: "Inaccurate information",
  unsafe: "Unsafe information",
  private_information: "Private information",
  other: "Other",
};
```

Do not display raw backend values such as:

```text
private_information
```

---

# 13. Edited-After-Report Warning

P0 #1 should already expose whether:

```ts
reportedRevision !== currentRevision
```

If true, show a prominent warning:

```text
This tip was edited after it was reported.

The report applies to Revision 1.
Travellers currently see Revision 2.

Review both versions before taking action.
```

Do not place this only inside a tooltip.

---

# 14. Version Selector

Only show the selector when the tip changed after the report.

Use:

```text
[ Reported version · Rev 1 ] [ Current version · Rev 2 ]
```

Default to:

```text
Reported version
```

because that is what the reporting traveller actually saw.

If both revisions are the same, do not render redundant version tabs.

---

# 15. Full Tip Content

For the selected version show:

```text
Category
Title
Body
Trip month
Price
Category-specific fields
Location information
Photos
```

Do not display empty metadata rows.

---

# 16. Category-Specific Details

Examples:

## Transport

```text
From
To
Transport mode
Duration
Boarding point
Timing
Price
```

## Stay

```text
Place
Room type
Booking method
Price
Location
```

## Food

```text
Dish
Place
Price
Location
```

## Explore

```text
Place
Walking time
Timing
Location
Price
```

Reuse existing TrailNote display formatting wherever possible.

---

# 17. Shared Display Helpers

Avoid duplicating logic already used by the public tip page.

If necessary, extract generic helpers into something such as:

```text
src/lib/contribution-display.ts
```

Possible helpers:

```ts
humanizeContributionValue(...)
buildContributionFacts(...)
buildContributionTitle(...)
```

Do not create a second independent formatting system for moderation.

---

# 18. Historical Version Title

When viewing the reported version, derive the title from the reported snapshot.

Do not reuse the current title.

Example:

```text
Revision 1
Calicut → Ooty

Revision 2
Calicut → Coonoor
```

The moderator must see the correct historical context.

---

# 19. Photos

Show photos belonging to the selected revision.

When viewing:

```text
Reported version
```

show:

```text
reported-version photos
```

When viewing:

```text
Current version
```

show:

```text
current-version photos
```

Never mix them.

Reuse the existing photo viewer if possible.

Test:

- 0 photos
- 1 photo
- multiple photos
- lightbox
- arrow navigation
- Escape
- keyboard focus
- mobile
- nested dialog behavior

Do not add another photo library unless absolutely necessary.

---

# 20. Missing Historical Image

If an old image is unavailable:

show:

```text
Historical photo unavailable
```

Do not silently substitute a current-version image.

Historical accuracy matters more than visual completeness.

---

# 21. Author Context

For this P0 scope show only:

```text
Shared by
Amal Raj @amalraj

Account status
Active

View public profile
```

Do not add:

- email
- user-blocking workflow
- full user report history
- user scoring
- trust score

Those are separate features.

---

# 22. Destination Context

Show:

```text
Destination
Ooty, Tamil Nadu
```

If the contribution itself contains location/maps information, include it in the tip details.

---

# 23. Moderation History

Show previous moderation actions related to the contribution.

Minimum:

```text
date
action
reason
```

Example:

```text
18 Sep 2026

Tip restored

Reason:
Author corrected the timing information.
```

Do not expand this into a full audit dashboard in this task.

---

# 24. Resolution Note

For open reports show:

```text
Resolution note
[ textarea ]
```

Helper:

```text
Required. Briefly explain the moderation decision.
```

Keep the existing maximum:

```text
1000 characters
```

Validation must remain server-side as well as client-side.

---

# 25. Explicit Moderation Actions

This is P0 #3.

Do not use vague actions such as:

```text
Resolve
Save
Submit
Confirm
```

The moderator must understand the consequence.

---

# 26. Actions — Report Against Current Revision

If:

```ts
reportedRevision === currentRevision
```

show:

```text
Dismiss report
Hide tip
```

Do not show:

```text
Issue fixed
```

because there is no newer revision that could have fixed the original report.

---

# 27. Actions — Report Against Older Revision

If:

```ts
reportedRevision !== currentRevision
```

show:

```text
Issue fixed
Dismiss report
Hide current tip
```

Meaning:

## Issue fixed

Use when:

- the original report was valid
- the author edited the tip
- the current version no longer contains the reported problem

Result:

```text
report -> resolved
current tip -> unchanged
```

## Dismiss report

Use when:

- report was invalid
- report was not actionable
- reported content was not actually problematic
- report was abuse/spam

Result:

```text
report -> dismissed
current tip -> unchanged
```

## Hide current tip

Use when:

- the current version still has the reported problem
- or the current version remains unsuitable for travellers

Result:

```text
report -> resolved
current tip -> hidden
```

The P0 #1 revision-safety check must remain active.

---

# 28. Important Semantic Difference

These are not the same:

```text
Issue fixed
```

means:

```text
The report was valid, but the author corrected the problem.
```

Status:

```text
resolved
```

Whereas:

```text
Dismiss report
```

means:

```text
The report itself did not require moderation action.
```

Status:

```text
dismissed
```

Do not treat valid corrected reports as dismissed.

---

# 29. Action Visual Hierarchy

For an edited report:

```text
Issue fixed
Dismiss report
Hide current tip
```

Recommended hierarchy:

```text
Issue fixed        -> normal positive/primary action
Dismiss report     -> secondary action
Hide current tip   -> danger/destructive action
```

Do not make hiding look like the default expected outcome.

---

# 30. Existing Hidden Tip

If the current tip is already hidden, avoid showing:

```text
Hide current tip
```

as though it is still published.

Use wording such as:

```text
Keep hidden & resolve report
```

if the existing implementation supports this state.

Do not change the visibility unnecessarily.

---

# 31. Destructive Confirmation

Hiding remains destructive.

Require confirmation.

Current revision case:

```text
Hide this tip?

Travellers will no longer be able to see this tip.

[Cancel] [Hide tip]
```

Older report case:

```text
Hide the current version?

This report was submitted against Revision 1.
You are about to hide the currently published Revision 2.

[Cancel] [Hide current tip]
```

Use the resolution note already entered in the drawer.

Do not ask for a second reason.

---

# 32. Issue Fixed Confirmation

A second danger modal is not required for:

```text
Issue fixed
```

because it does not remove public content.

However:

- require a resolution note
- preserve stale-revision protection
- show clear success feedback

Example:

```text
Report resolved. Current tip remains published.
```

---

# 33. Dismiss Report

Dismissal is not destructive to the tip.

It should:

```text
keep tip unchanged
mark report dismissed
store resolution note
```

Do not use destructive styling.

Show feedback:

```text
Report dismissed.
```

---

# 34. Sticky Footer

For long reports, keep decision controls accessible.

Use a sticky footer containing:

```text
Resolution note
Actions
```

Recommended:

```css
position: sticky;
bottom: 0;
```

Use an appropriate background and top border.

The drawer body should scroll.

---

# 35. Resolved / Dismissed Reports

The drawer should also support historical review.

If status is:

```text
resolved
```

or:

```text
dismissed
```

show read-only information.

Example:

```text
Status
Resolved

Resolution
Issue fixed in a later revision

Moderator note
Author updated the fare from ₹40 to ₹80.

Resolved
19 Sep 2026
```

Do not show active moderation actions.

---

# 36. Drawer Component

Recommended:

```text
src/components/moderation/report-review-drawer.tsx
```

Responsibilities:

- controlled open/close state
- report context
- revision warning
- version switcher
- tip content
- photos
- author
- history
- resolution note
- explicit actions
- pending/error/conflict state

Do not put DB logic in the component.

---

# 37. `dashboard.tsx` Responsibilities

Keep:

```text
tabs
filters
queue rows
pagination
open/close selected report
pass selected detail to drawer
```

Do not put the full detailed review UI directly in `dashboard.tsx`.

---

# 38. Reuse Existing Dialog System

TrailNote already uses Radix Dialog.

Reuse the current overlay infrastructure.

Do not add a drawer package.

Example:

```tsx
<Dialog
  open={open}
  onOpenChange={handleOpenChange}
  title="Tip report"
  className="moderation-review-drawer"
>
  ...
</Dialog>
```

Only introduce a generic Drawer abstraction if the current Dialog API genuinely becomes awkward.

---

# 39. Desktop Layout

Recommended:

```css
.moderation-review-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100dvh;
  width: min(620px, calc(100vw - 32px));
  overflow-y: auto;
  border-radius: 0;
}
```

Target width:

```text
560–620px
```

The moderator should retain some queue context behind it.

---

# 40. Mobile Layout

At smaller widths:

```text
width: 100vw
height: 100dvh
```

Treat it as a full-screen review experience.

Do not force a narrow desktop drawer onto mobile.

---

# 41. Close Behavior

Closing should:

```text
remove review query param
keep filters
keep page
keep section
```

Example:

Before:

```text
/moderation?section=reports&status=open&page=2&review=abc
```

After:

```text
/moderation?section=reports&status=open&page=2
```

---

# 42. Filter / Pagination Behavior

If the moderator changes:

```text
search
filter
page
section
```

remove:

```text
review
```

Do not leave a stale report drawer open after changing queue context.

---

# 43. Conflict Handling

P0 #1 should already detect stale revision actions.

Preserve it.

If the author edits while the moderator is reviewing:

```text
This tip changed while you were reviewing it.

Review the latest version before taking action.
```

The report should remain open.

Refresh/reload the selected report data.

Do not silently apply the action to a newer revision.

---

# 44. Loading State

If selected report navigation/loading takes noticeable time, show:

```text
Loading report…
```

Do not present blank content that looks broken.

Use existing Next.js loading patterns where practical.

---

# 45. Accessibility

Verify:

- Review button is keyboard reachable
- focus enters drawer
- drawer has a meaningful title
- background is inaccessible while modal is open
- Escape closes the drawer
- focus returns appropriately
- close button has accessible text
- version controls expose selected state
- resolution note has a proper label
- statuses include text
- action buttons are keyboard usable
- destructive confirmation is accessible
- photo viewer remains accessible
- reported/current versions are understandable to screen readers
- UI works at 200% zoom

---

# 46. Security

Requirements:

- server authorizes moderator access
- report ID is validated
- historical revision data stays private
- report details do not enter public DTOs
- do not expose reporter email
- do not expose private contact values in a normal tip report
- actions re-check server state
- client state is never authorization
- P0 #1 revision checks remain enforced

---

# 47. Performance

Do not fetch full drawer content for all rows.

Use:

```text
queue -> lightweight
selected report -> full detail
```

Avoid:

```text
N+1 photo queries
N+1 history queries
one query per metadata field
```

A selected report should be fetched with a small fixed number of queries.

---

# 48. File-by-File Changes

## `src/components/moderation/dashboard.tsx`

Change contribution-report row action to:

```text
Review
```

Preserve filters when building the review URL.

Render the selected drawer.

Remove direct destructive contribution-report actions from the queue row.

Rename contact actions if generic wording still exists:

```text
Hide contact
Dismiss request
```

instead of:

```text
Resolve
Dismiss
```

---

## `src/components/moderation/report-review-drawer.tsx`

NEW if not already created.

Implement:

```text
report context
revision warning
version selector
full content
photos
author
history
resolution note
Issue fixed
Dismiss report
Hide tip / Hide current tip
read-only closed state
```

---

## `app/moderation/page.tsx`

Load the selected report using:

```text
review
```

only when necessary.

Pass selected detail into the dashboard.

---

## `src/server/services/moderation.ts`

Reuse existing P0 #1 report-detail query.

Only extend server behavior if needed for:

```text
Issue fixed
```

or action labels/outcomes.

Do not duplicate revision logic.

---

## `app/moderation/actions.ts`

Ensure the report action supports all required dispositions:

```text
hide
issue fixed / resolved
dismiss
```

Preserve:

```text
expectedContributionRevision
```

from P0 #1.

---

## `src/lib/contribution-display.ts`

OPTIONAL.

Extract shared display helpers if moderation currently duplicates public contribution formatting.

---

## `app/globals.css`

Add drawer-specific and responsive styles.

Use existing TrailNote tokens.

---

# 49. Action Contract

If the existing code currently supports:

```ts
"hide" | "dismiss"
```

extend it to support the "Issue fixed" outcome.

Recommended internal shape:

```ts
type ReportDisposition =
  | "hide"
  | "resolved"
  | "dismiss";
```

UI labels:

```text
hide      -> Hide tip / Hide current tip
resolved  -> Issue fixed
dismiss   -> Dismiss report
```

The internal naming may differ if the current implementation already chose another safe value.

Do not change working backend naming purely to match this example.

---

# 50. Server Outcome — Issue Fixed

For:

```text
Issue fixed
```

server must:

1. verify moderator
2. verify report still open
3. verify current revision still matches reviewed revision
4. leave contribution visibility unchanged
5. set report status to `resolved`
6. store resolution note
7. write appropriate moderation history
8. return success

If revision changed:

```text
CONFLICT
```

and report remains open.

---

# 51. Server Outcome — Hide

Server must preserve P0 #1 behavior:

1. verify moderator
2. verify report still open
3. verify reviewed contribution revision
4. ensure deleted tip is not resurrected
5. hide current tip if applicable
6. resolve report
7. store reason
8. write moderation event

---

# 52. Server Outcome — Dismiss

Server should:

1. verify moderator
2. verify report still open
3. preserve current contribution
4. mark report `dismissed`
5. store reason
6. write appropriate history if current implementation does so

---

# 53. Testing

## UI — Report row

Contribution report shows:

```text
Review
```

and no direct destructive action.

---

## UI — Current revision report

Shows:

```text
Dismiss report
Hide tip
```

Does not show:

```text
Issue fixed
```

---

## UI — Edited report

Shows:

```text
Issue fixed
Dismiss report
Hide current tip
```

---

## UI — Version switching

Reported version shows historical:

```text
title
body
metadata
photos
```

Current version shows current equivalents.

---

## UI — Resolution note

Actions disabled until:

```ts
reason.trim().length > 0
```

if current product behavior requires a note for all outcomes.

---

## UI — Closed report

Resolved/dismissed reports are read-only.

---

## Navigation

Starting from:

```text
/moderation?section=reports&status=open&q=auto&page=2
```

click Review.

Expected:

```text
/moderation?section=reports&status=open&q=auto&page=2&review=<id>
```

Close.

Expected:

```text
/moderation?section=reports&status=open&q=auto&page=2
```

---

# 54. Integration Tests

Keep all existing P0 #1 tests.

Add or verify:

## Issue fixed

Report on V1.

Author creates V2.

Moderator resolves as:

```text
Issue fixed
```

Assert:

```text
report.status === "resolved"
tip.status remains "published"
tip.revision remains V2
```

---

## Issue fixed is not dismissed

Assert:

```text
resolved
```

not:

```text
dismissed
```

---

## Stale Issue Fixed

Moderator reviews V2.

Author creates V3.

Moderator tries:

```text
Issue fixed
```

with expected revision V2.

Assert:

```text
CONFLICT
report remains open
tip unchanged
```

---

## Stale Hide

Keep existing P0 #1 stale-hide test.

---

## Resolved Report Read

Selected resolved report should still load enough data for read-only drawer display.

---

# 55. Manual QA

Test:

```text
320px
390px
768px
1024px
1440px
200% zoom
keyboard only
```

Scenarios:

- current revision report
- edited report
- issue fixed
- dismiss
- hide
- already hidden tip
- resolved report
- dismissed report
- no photos
- single photo
- multiple photos
- long report details
- long tip body
- stale revision conflict
- browser Back/Forward
- opening and closing multiple reports
- filters + pagination preserved

---

# 56. Completion Criteria

Do not mark this task complete until:

- [ ] contribution report rows use `Review`
- [ ] direct destructive report actions are removed from queue rows
- [ ] full review drawer exists
- [ ] drawer uses URL `review` state
- [ ] filters/page survive open/close
- [ ] report reason/details are visible
- [ ] full selected revision content is visible
- [ ] revision-specific photos work
- [ ] author context is visible
- [ ] moderation history is visible
- [ ] resolution note is required where expected
- [ ] current-version report uses `Hide tip`
- [ ] edited report uses `Hide current tip`
- [ ] edited report supports `Issue fixed`
- [ ] report dismissal uses `Dismiss report`
- [ ] no vague `Resolve` button remains for contribution reports
- [ ] contact action uses `Hide contact`
- [ ] contact dismissal uses `Dismiss request`
- [ ] closed reports are read-only
- [ ] stale revision protection remains intact
- [ ] historical revisions remain moderator-only
- [ ] tests pass
- [ ] typecheck passes
- [ ] lint passes
- [ ] build passes
- [ ] no unrelated functionality was changed

---

# 57. Out of Scope

Do not implement:

- user detail drawer
- redesigned user suspension workflow
- contributor notification
- appeals
- moderator assignment
- internal moderator notes
- moderation analytics
- report scoring
- duplicate report grouping
- bulk moderation
- AI moderation
- public revision history
- separate details page for every Users row
- separate details page for every Tips row

---

# 58. Final Invariant

The implementation should preserve this rule:

> A moderator should first understand the complete report and current traveller-visible state, then take an action whose label clearly describes its consequence.

The queue identifies the case.

The drawer explains the case.

The action label states exactly what will happen.

Do not collapse these responsibilities back into a single compact table row.
