# TrailNote — P0 Moderator Dashboard Implementation Plan

## Scope

This plan covers only the three P0 moderation improvements agreed for the current TrailNote beta:

1. **Revision-aware report review**
2. **Full report-detail review drawer**
3. **Clear, explicit moderation action names**

The goal is to make moderation decisions safe and understandable without expanding the dashboard into a large admin system.

This plan is based on the current `beta` branch, especially:

- `app/moderation/page.tsx`
- `app/moderation/actions.ts`
- `src/components/moderation/dashboard.tsx`
- `src/components/moderation/queue.tsx`
- `src/components/ui/overlays.tsx`
- `src/server/services/moderation.ts`
- `src/server/services/reports.ts`
- `src/server/services/contributions.ts`
- `src/server/queries/contributions.ts`
- `src/db/schema/travel.ts`
- `src/db/schema/operations.ts`
- `src/components/contributions/photo-gallery.tsx`
- `tests/integration/services.test.ts`

---

# 1. Current State and Main Problem

TrailNote already has most of the backend foundation needed for safe moderation.

A report stores:

```ts
contributionId
contributionRevision
reason
details
status
resolutionNote
moderatorId
createdAt
resolvedAt
```

Every contribution revision is stored separately in:

```ts
contributionRevisions
```

with:

```ts
contributionId
revision
editorId
snapshotJson
createdAt
```

Photos are also revision-specific through:

```ts
contributionPhotos.contributionId
contributionPhotos.revision
```

This is good and means **no new revision-history database system is needed**.

However, the current moderator queue joins the report to the live `contributions` row and displays:

```ts
s.contributions.body
```

That is the **current tip body**, not necessarily the version that was reported.

Example:

```text
Revision 2
Bus fare is ₹40
Traveller reports it as inaccurate.

Author edits the tip.

Revision 3
Bus fare is ₹50

Moderator opens the report.
```

The existing dashboard can show the Revision 3 body even though the report belongs to Revision 2.

There is a second race condition:

```text
Moderator opens Revision 3.
Author edits to Revision 4 while moderator is reviewing.
Moderator clicks Hide.
```

The current `resolveReport()` checks only that the report is still open. It does not verify that the contribution revision being hidden is still the one the moderator reviewed.

These two issues are the main reason revision-awareness is P0.

---

# 2. Product Decisions

Before implementation, use the following rules consistently.

## 2.1 A report always belongs to the revision it was created against

Continue using:

```ts
reports.contributionRevision
```

as the immutable version that the traveller reported.

Do not move the report to a newer revision when the author edits the tip.

---

## 2.2 Historical versions stay moderator-only

Do not expose old revisions publicly.

The existing public behavior remains:

```text
Travellers -> latest public version only
Moderators -> reported historical version + current version
```

---

## 2.3 Hiding acts on the current tip

A historical revision is already non-public, so there is nothing useful to "hide" about the old revision itself.

When a moderator confirms that moderation is required:

```text
reported revision -> evidence/context
current revision -> version that will actually become hidden
```

Therefore:

- if reported revision === current revision:
  - action label: **Hide tip**
- if reported revision !== current revision:
  - action label: **Hide current tip**

This difference should be visible to the moderator.

---

## 2.4 Never silently act on a version the moderator did not review

The mutation must include the current revision that was loaded into the review drawer.

Example:

```ts
expectedContributionRevision: 3
```

If the contribution becomes Revision 4 before the action reaches the server:

```text
CONFLICT
"This tip changed while you were reviewing it. Review the latest version before taking action."
```

The report should remain open and the contribution should remain unchanged.

---

## 2.5 No database migration is required for these three P0 changes

The current schema already contains:

- report revision
- full historical contribution snapshot
- revision-specific photos
- current contribution
- report status
- moderation events

Do not introduce another moderation-case or revision table for this work.

---

# 3. P0 Feature 1 — Revision-Aware Report Review

## 3.1 Add a dedicated moderator report-detail query

Do not overload the existing list query with full historical content for every row.

The dashboard shows up to 25 records. Loading full snapshots, photos and history for every report would unnecessarily increase the page payload.

Instead, add a dedicated service/query such as:

```ts
moderationReportDetail(
  db,
  moderatorUserId,
  reportId,
)
```

Recommended location:

```text
src/server/services/moderation.ts
```

or, if the file becomes too large:

```text
src/server/queries/moderation.ts
```

Prefer separating read/query logic if `moderation.ts` becomes difficult to maintain.

The function must call the existing moderator authorization check itself.

Do not depend only on `/moderation/page.tsx` having already checked authorization.

---

## 3.2 Proposed report-detail DTO

Return one deliberate moderation DTO rather than exposing raw database rows.

Example shape:

```ts
type ModerationReportDetail = {
  report: {
    id: string;
    reason:
      | "spam"
      | "inaccurate"
      | "unsafe"
      | "private_information"
      | "other";
    details: string | null;
    status: "open" | "resolved" | "dismissed";
    reportedRevision: number;
    createdAt: number;
    resolutionNote: string | null;
    resolvedAt: number | null;
  };

  tip: {
    id: string;
    status: "published" | "hidden" | "deleted";
    currentRevision: number;

    destination: {
      id: string;
      name: string;
      slug: string;
      state: string;
    };

    author: {
      id: string;
      displayName: string;
      username: string;
      status: "active" | "suspended";
    };

    reportedVersion: ModerationTipVersion;
    currentVersion: ModerationTipVersion;

    editedAfterReport: boolean;
  };

  history: Array<{
    targetType: string;
    targetId: string;
    action: string;
    reason: string;
    createdAt: number;
  }>;
};
```

Use a shared version type:

```ts
type ModerationTipVersion = {
  revision: number;
  createdAt: number;

  category: Category;
  body: string;
  visitedMonth: string | null;

  pricePaise: number | null;
  priceUnit: PriceUnit | null;
  priceUnitLabel: string | null;

  placeName: string | null;
  roomType: string | null;
  bookingMethod: string | null;
  dish: string | null;

  fromName: string | null;
  toName: string | null;
  transportMode: string | null;
  durationMinutes: number | null;
  walkMinutes: number | null;
  timingNote: string | null;
  boardingPoint: string | null;

  locationText: string | null;
  mapsUrl: string | null;

  photos: Array<{
    path: string;
    width: number;
    height: number;
    alt: string;
  }>;
};
```

The exact TypeScript shape may be adjusted to reuse existing TrailNote types, but keep the contract explicit.

---

## 3.3 Read the reported version from `contributionRevisions`

For:

```ts
report.contributionRevision
```

fetch:

```ts
contributionRevisions.snapshotJson
```

where:

```ts
contributionId = report.contributionId
revision = report.contributionRevision
```

Do **not** reconstruct the reported version from the current `contributions` row.

---

## 3.4 Use the full historical snapshot

The existing `readSnapshot()` in:

```text
src/server/queries/contributions.ts
```

currently reads only a subset:

```ts
body
visitedMonth
pricePaise
priceUnit
priceUnitLabel
```

That is sufficient for the public previous-version UI but not enough for moderation.

Moderators should be able to review all relevant historical fields.

Create a shared safe snapshot parser rather than duplicating loose `JSON.parse()` logic.

Recommended new file:

```text
src/server/contribution-snapshot.ts
```

Responsibilities:

```ts
export type PublicContributionSnapshot = ...
export function readPublicContributionSnapshot(value: string): PublicContributionSnapshot
```

It should understand all fields written by:

```ts
publicSnapshot(input)
```

from:

```text
src/server/services/contributions.ts
```

Important fields include:

```text
destinationId
category
body
visitedMonth
pricePaise
priceUnit
priceUnitLabel
placeName
roomType
bookingMethod
dish
fromName
toName
transportMode
durationMinutes
walkMinutes
timingNote
boardingPoint
locationText
mapsUrl
parentContributionId
parentRevision
```

Then update the existing public revision code to use the same parser where practical.

This avoids having two different interpretations of revision JSON.

---

## 3.5 Historical photos are already available

Do not put images into `snapshotJson`.

The current design correctly stores photos separately by revision.

For the reported version fetch from:

```text
contributionPhotos
```

using:

```ts
contributionId = report.contributionId
revision = report.contributionRevision
```

Join:

```text
uploadAssets
```

and only use assets that are still valid/attached.

Return:

```text
path
width
height
altText
position
```

ordered by:

```text
position
```

For the current version, query:

```ts
revision = contributions.revision
```

This gives the moderator the exact photos attached to each version.

---

## 3.6 Compare reported revision and current revision

The server should calculate:

```ts
editedAfterReport =
  report.contributionRevision !== contribution.revision;
```

Do not calculate this only in the client.

The UI should receive the explicit boolean.

---

## 3.7 Show a strong warning when the tip changed

If:

```ts
editedAfterReport === true
```

show near the top of the review drawer:

```text
This tip was edited after it was reported.

The report applies to Revision 2.
Travellers currently see Revision 3.
Review both versions before taking action.
```

Do not make this a subtle tooltip.

This information affects the moderator's decision and should remain visible.

---

## 3.8 Default the drawer to the reported version

When a report is opened:

```text
Reported version
Current version
```

If they are different, default to:

```text
Reported version
```

because that is the content the reporting traveller actually saw.

The moderator can then switch to:

```text
Current version
```

before deciding what to do.

If both revisions are the same, do not show a redundant version switcher.

---

# 4. Protect the Mutation Against Stale Reviews

This is required even after the historical UI is correct.

## 4.1 Change `reviewReport()` server-action contract

Current:

```ts
reviewReport(
  reportId,
  disposition,
  reason,
)
```

Change it to carry the revision that the moderator reviewed.

Recommended:

```ts
reviewReport(
  reportId,
  expectedContributionRevision,
  disposition,
  reason,
)
```

Optionally also send the currently reviewed status:

```ts
expectedContributionStatus
```

but revision is the critical requirement.

---

## 4.2 Change `resolveReport()` validation

Current input:

```ts
{
  reportId,
  expectedStatus: "open",
  disposition,
  reason,
}
```

Recommended:

```ts
{
  reportId,
  expectedStatus: "open",
  expectedContributionRevision,
  disposition,
  reason,
}
```

Inside the same database transaction:

1. authorize moderator
2. fetch report
3. verify report is still `open`
4. fetch contribution
5. verify contribution still exists
6. verify:

```ts
contribution.revision === expectedContributionRevision
```

7. only then apply the disposition
8. resolve/dismiss report
9. write moderation event

If the revision is different:

```ts
throw new DomainError(
  "CONFLICT",
  "This tip changed while you were reviewing it. Review the latest version before taking action.",
);
```

---

## 4.3 Do not automatically hide a newer unseen revision

This scenario must fail:

```text
Drawer loaded current Revision 3.
Author saves Revision 4.
Moderator clicks Hide current tip.
```

Expected:

```text
No tip visibility change.
Report remains open.
Moderator sees conflict message.
Drawer refreshes/reloads latest data.
```

This is one of the most important acceptance tests for the whole change.

---

## 4.4 An older report may still hide the current tip after deliberate review

This should still work:

```text
Report is about Revision 2.
Current revision is Revision 3.
Moderator opens drawer.
Moderator reviews Revision 2 and Revision 3.
Moderator clicks "Hide current tip".
```

Request sends:

```ts
expectedContributionRevision: 3
```

If the database still contains Revision 3, allow the action.

The system is not saying Revision 2 itself is currently visible.

It is saying:

```text
The report originated from Revision 2,
the moderator reviewed the current Revision 3,
and deliberately decided that the current tip should be hidden.
```

---

# 5. Contribution Status Safety

While touching `resolveReport()`, prevent an existing dangerous edge case.

Current code can run:

```ts
.update(contributions)
.set({ status: "hidden" })
```

without first protecting against a contribution that is already:

```text
deleted
```

A deleted contribution should never be changed back to hidden.

Recommended behavior:

### Current status = `published`

`Hide tip`:

```text
published -> hidden
report -> resolved
```

### Current status = `hidden`

The report may be resolved while keeping the tip hidden.

Do not unnecessarily toggle visibility.

UI wording can be:

```text
Keep hidden & resolve report
```

This is clearer than pretending the action is hiding something that is already hidden.

### Current status = `deleted`

Do not mutate:

```text
deleted -> hidden
```

Reject stale destructive actions and refresh the drawer.

At minimum:

```ts
if (contribution.status === "deleted") {
  throw new DomainError(
    "CONFLICT",
    "This tip was deleted after the report was opened. Refresh the report.",
  );
}
```

---

# 6. P0 Feature 2 — Full Report Review Drawer

## 6.1 Do not make the table itself carry the entire moderation decision

The current table should remain scannable.

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

The table is the queue.

The drawer is the decision surface.

---

# 7. Open the Drawer Through the URL

Avoid introducing a new client-side moderation API just to load detail data.

Use a query parameter such as:

```text
/moderation?section=reports&review=<report-id>
```

Benefits:

- server-side moderator authorization remains straightforward
- no new public/internal API route is required
- the review is deep-linkable
- refreshing the browser preserves the selected report
- browser/server data remains the source of truth
- filters and pagination can remain in the URL

---

## 7.1 Extend moderation query validation

Current `moderationQuery` handles:

```text
section
type
q
status
from
to
page
```

Add:

```ts
review: z.uuid().optional()
```

Only load a selected report when:

```ts
section === "reports"
```

If the selected report is invalid or unavailable, return a controlled unavailable state rather than crashing the entire dashboard.

---

## 7.2 Preserve filters while opening a report

If the moderator is viewing:

```text
Open reports
Tip reports only
Page 2
Search "auto fare"
```

opening a report should preserve that queue state.

Example:

```text
/moderation
  ?section=reports
  &status=open
  &type=tip
  &q=auto%20fare
  &page=2
  &review=<id>
```

Closing the drawer should remove only:

```text
review
```

and preserve the rest.

When changing page, section, type or filters, drop the `review` parameter so a stale drawer does not remain open.

---

# 8. Drawer Component

Recommended new component:

```text
src/components/moderation/report-review-drawer.tsx
```

Keep `dashboard.tsx` responsible for:

- queue layout
- filters
- pagination
- selecting/opening a report

Keep the drawer responsible for:

- report context
- historical/current versions
- photos
- metadata
- reason input
- moderation actions

This prevents `dashboard.tsx` from becoming too large.

---

# 9. Reuse the Existing Radix Dialog Foundation

TrailNote already uses:

```text
@radix-ui/react-dialog
```

through:

```text
src/components/ui/overlays.tsx
```

Do not add another drawer package.

Reuse the existing accessible `Dialog` primitive and give it a drawer-specific class:

```tsx
<Dialog
  open={...}
  onOpenChange={...}
  className="moderation-review-drawer"
  ...
>
```

Style the content so it behaves as a right-side review panel.

---

# 10. Drawer Responsive Behavior

## Desktop/tablet

Recommended:

```text
position: fixed
right: 0
top: 0
height: 100dvh
width: min(620px, calc(100vw - 32px))
border-radius: 0
overflow-y: auto
```

A width around 560–620px is enough to inspect a tip without hiding all dashboard context.

## Mobile

Use:

```text
width: 100vw
height: 100dvh
```

Treat it like a full-screen review page rather than trying to maintain a narrow side sheet.

Do not create a tiny bottom sheet for moderation.

The moderator needs enough room to inspect content safely.

---

# 11. Drawer Information Architecture

Recommended order:

## 11.1 Header

```text
Tip report                          [Open]

Reported 19 Sep 2026
Ooty, Tamil Nadu
```

Also include a close button.

---

## 11.2 Revision warning

Only when the tip was edited:

```text
⚠ This tip was edited after it was reported

Report concerns Revision 2.
Current tip is Revision 3.

Review both versions before taking action.
```

This should appear before the actual content.

---

## 11.3 Report context

Show:

```text
Reason
Inaccurate information

Traveller's details
"The shared-auto fare has changed to ₹80."
```

Map internal reason values to readable labels.

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

Do not display raw values such as:

```text
private_information
```

---

## 11.4 Version selector

Only show when:

```ts
reportedRevision !== currentRevision
```

Recommended:

```text
[ Reported version · Rev 2 ] [ Current version · Rev 3 ]
```

Default:

```text
Reported version
```

Avoid technical wording elsewhere, but revision numbers are acceptable in the moderator-only tool because they are operationally meaningful.

---

## 11.5 Full tip content

For the selected version show:

- category
- generated title
- full body
- price
- trip month
- all category-specific metadata
- location/maps information
- photos

Reuse the same humanization rules already used by the public tip page where practical.

Do not duplicate formatting logic differently in moderation.

Good candidates to extract/reuse:

```text
humanize()
price formatting
category labels
fact-label generation
```

If `factsFor()` from `app/tips/[id]/page.tsx` cannot be reused cleanly because it is page-local, move the generic formatting logic into a small shared helper.

For example:

```text
src/lib/contribution-display.ts
```

Do not copy/paste a second large switch of travel fields into the moderator component.

---

# 12. Historical Version Title

The public card title is derived from:

```text
placeName
or
fromName -> toName
or
category + destination
```

Generate the historical version title from the historical snapshot.

Do not use the current contribution's title when displaying the reported version.

Example:

```text
Revision 2:
Calicut -> Ooty

Revision 3:
Calicut -> Coonoor
```

If the fields changed, the moderator should see the correct historical title.

---

# 13. Photos in the Drawer

The moderator must be able to inspect the photos belonging to each version.

Use the returned version-specific photos.

The existing:

```text
PhotoGallery
```

can be reused initially because it already supports:

- one photo
- multiple photos
- full-size viewing
- keyboard navigation
- alt text

If used inside the moderation drawer, test carefully:

- opening the photo viewer from inside another Radix Dialog
- Escape handling
- focus restoration
- arrow-key navigation
- mobile sizing

If nested-dialog behavior proves awkward, extract the photo rendering/lightbox into a reusable component rather than adding a second image-viewer library.

Do not show current photos while the moderator is viewing the reported historical version.

---

# 14. Author Context

The P0 drawer only needs enough author context to understand the report.

Show:

```text
Shared by
Display Name @username

Account: Active
View public profile
```

Do not add the full user-moderation/blocking workflow in this change.

That is a separate feature.

Also avoid exposing user email in the report drawer unless a future moderation requirement genuinely needs it.

---

# 15. Moderation History in the Drawer

Reuse the existing `moderationEvents` data for the tip.

For this P0 change show at least:

```text
action
reason
date
```

Example:

```text
18 Sep 2026
Tip restored
Reason: Author corrected the timing.
```

Showing moderator identity is part of the later full audit-trail improvement and does not need to be added to this P0 scope.

Do not expand the database schema just for this drawer.

---

# 16. Resolved/Dismissed Reports

The drawer should also work when viewing report history.

If report is:

```text
resolved
```

or:

```text
dismissed
```

show it as read-only.

Include:

```text
Resolution
<resolutionNote>

Resolved
<date>
```

Do not show active moderation buttons for an already closed report.

This avoids separate UI paths for open and historical records.

---

# 17. P0 Feature 3 — Clear Action Names

The current Reports table uses:

```text
Resolve
Dismiss
```

These are too abstract because "Resolve" does not tell the moderator what will happen.

---

## 17.1 Report queue row

Replace the action buttons with one primary navigation action:

```text
Review
```

Clicking it opens the report-detail drawer.

Do not hide content directly from the queue row anymore.

A P0 moderation decision should happen only after opening the report context.

This change also reduces accidental destructive actions.

---

## 17.2 Open tip report drawer

When reported version === current version:

```text
Hide tip
Dismiss report
```

When reported version !== current version:

```text
Hide current tip
Dismiss report
```

When tip is already hidden:

```text
Keep hidden & resolve report
Dismiss report
```

Avoid:

```text
Resolve
Save
Submit
Confirm
```

as primary action names.

---

## 17.3 Contact-removal requests

The existing generic labels should also be corrected during this change.

Use:

```text
Hide contact
Dismiss request
```

instead of:

```text
Resolve
Dismiss
```

The contact-removal workflow does not need revision logic.

It can remain row-based for now if keeping the scope small.

A dedicated contact-removal drawer can be considered separately if moderation volume later justifies it.

---

## 17.4 Tips tab terminology

The current Tips section uses:

```text
Unpublish
Republish
```

This is already understandable, so changing it is not required for this P0 implementation.

If terminology is standardized during the same UI pass, preferred wording is:

```text
Hide tip
Restore tip
```

because those names match the backend concepts and moderation history.

Do not expand the task solely to rename every historical moderation label.

---

# 18. Action Reason UX

The action reason remains required.

In the report drawer place one field near the footer:

```text
Moderation reason
[ textarea ]
```

Helper text:

```text
Required. This is stored with the moderation action.
```

Then show:

```text
Hide tip
Dismiss report
```

Both actions use the entered reason.

Do not open one modal just to collect the reason and another modal to confirm the action.

The reason belongs to the review workflow itself.

---

# 19. Destructive Confirmation

TrailNote already requires confirmation before destructive moderation actions.

Keep that rule.

For hide:

```text
Hide this tip?

Travellers will no longer be able to see the current version.

[Cancel] [Hide tip]
```

When the report is about an older revision:

```text
Hide the current version?

This report was submitted against Revision 2.
You are about to hide the currently published Revision 3.

[Cancel] [Hide current tip]
```

This distinction is important.

`Dismiss report` is not destructive to public content and does not need the same danger treatment, although the required reason should still be present.

---

# 20. Avoid Accidental Nested-Modal Complexity

The review drawer itself uses Radix Dialog.

A photo lightbox or destructive confirmation can therefore become a nested Dialog.

Radix supports nested dialogs, but explicitly test:

- focus trapping
- Escape
- background scroll locking
- focus restoration
- screen-reader titles
- mobile viewport behavior

If destructive confirmation causes focus problems, prefer an inline confirmation state in the drawer footer rather than adding another dependency.

Do not add a new modal/drawer library.

---

# 21. Suggested Server Flow

Opening a report:

```text
GET /moderation?...&review=<report-id>
        |
        v
moderationDashboard(...)
        |
        +--> queue data
        |
        +--> if review exists:
               moderationReportDetail(...)
                    |
                    +--> report row
                    +--> current contribution
                    +--> reported snapshot
                    +--> reported photos
                    +--> current photos
                    +--> destination
                    +--> author
                    +--> moderation history
        |
        v
ModerationDashboard
        |
        v
ReportReviewDrawer
```

Hiding:

```text
Moderator reviews:
Reported Revision 2
Current Revision 3

        |
        v

reviewReport(
  reportId,
  expectedContributionRevision = 3,
  "hide",
  reason
)

        |
        v

resolveReport transaction

        |
        +--> report still open?
        +--> tip still Revision 3?
        +--> tip not deleted?
        |
        +--> yes -> hide current tip
        |          resolve report
        |          create moderation event
        |
        +--> no -> CONFLICT
```

---

# 22. File-by-File Implementation Plan

## `src/server/contribution-snapshot.ts` — NEW

Add a safe parser/type for the complete stored public contribution snapshot.

Responsibilities:

- parse `snapshotJson`
- expose all public historical contribution fields
- reject/handle malformed data safely
- remain server-only
- contain no contact/private-auth fields

Prefer one parser used by both public revision rendering and moderator historical rendering.

---

## `src/server/queries/contributions.ts`

Refactor the existing partial `Snapshot` / `readSnapshot()` code to use the shared snapshot parser where appropriate.

Do not change public behavior.

The purpose is to avoid inconsistent historical parsing.

---

## `src/server/services/moderation.ts`

Add:

```ts
moderationReportDetail(...)
```

It should:

- authorize moderator
- fetch report
- fetch current contribution
- fetch reported revision snapshot
- fetch destination
- fetch author basic information
- fetch reported-version photos
- fetch current-version photos
- fetch existing moderation events
- produce a safe DTO
- calculate `editedAfterReport`

Update:

```ts
resolveReport(...)
```

to:

- require `expectedContributionRevision`
- reject stale review actions
- never convert deleted tips back to hidden
- retain transaction semantics
- retain open-report conflict protection

---

## `app/moderation/actions.ts`

Change:

```ts
reviewReport(...)
```

to accept the reviewed current revision.

Example:

```ts
reviewReport(
  reportId: string,
  expectedContributionRevision: number,
  disposition: "hide" | "dismiss",
  reason: string,
)
```

Pass it into `resolveReport()`.

Keep:

```ts
revalidatePath("/moderation")
```

after successful mutation.

---

## `app/moderation/page.tsx`

Continue server-side page loading.

Pass the query parameter through validated moderation service logic.

The page should receive:

```ts
selectedReport
```

or equivalent as part of the moderation data.

Do not add a client-only authorization path.

---

## `src/components/moderation/dashboard.tsx`

Refactor the Reports section.

Current:

```text
Resolve
Dismiss
```

Replace with:

```text
Review
```

for contribution reports.

`Review` should add:

```text
review=<reportId>
```

while preserving active filters/page.

Pass selected report data into the new drawer.

Ensure changing:

- section
- page
- filter
- search

drops any selected `review` ID.

Rename contact actions:

```text
Hide contact
Dismiss request
```

---

## `src/components/moderation/report-review-drawer.tsx` — NEW

Responsibilities:

- controlled open/close behavior
- report header
- report reason/details
- edit-after-report warning
- reported/current version selector
- full tip content
- version-specific photos
- author context
- moderation history
- required moderation reason
- explicit hide/dismiss actions
- conflict/error states
- resolved/dismissed read-only state

Keep business rules on the server.

The component should not decide whether an action is safe solely from client state.

---

## `src/components/ui/overlays.tsx`

A new dependency is not needed.

Only change this file if a small reusable drawer capability clearly improves the API.

For example, an optional variant could be introduced:

```tsx
variant?: "dialog" | "drawer"
```

However, this is not necessary if:

```tsx
className="moderation-review-drawer"
```

plus CSS is sufficient.

Prefer the smaller change first.

---

## `app/globals.css`

Add styles for:

```text
moderation-review-drawer
moderation-review-header
moderation-revision-warning
moderation-version-tabs
moderation-review-section
moderation-review-content
moderation-review-meta
moderation-review-photos
moderation-review-footer
```

Use existing TrailNote design tokens.

Do not introduce a separate admin-dashboard visual system.

Test at:

```text
320px
390px
768px
1024px
1440px
```

---

# 23. Error and Race-Condition Handling

## Report already handled by another moderator

Current behavior already protects against this using:

```ts
expectedStatus: "open"
```

Keep it.

Message:

```text
This report was already reviewed.
```

Refresh the queue/drawer.

---

## Tip edited while drawer is open

Return:

```text
CONFLICT
```

Message:

```text
This tip changed while you were reviewing it. Review the latest version before taking action.
```

Do not close the drawer immediately.

Refresh the report detail so the moderator can see the new revision.

---

## Tip deleted while drawer is open

Do not change:

```text
deleted -> hidden
```

Return conflict and refresh.

---

## Historical snapshot unavailable

This should be extremely rare because the report has a foreign key to the revision.

If the snapshot cannot be safely reconstructed:

- show a review error
- do not allow a destructive hide action based on incomplete historical data
- log the server-side failure using the project's normal redacted logging approach

Do not silently substitute the current version as the reported version.

---

## Historical image unavailable

If one old asset can no longer be loaded:

- still show the historical text/metadata
- indicate that the image is unavailable
- do not replace it with a current-version image

Wrong evidence is worse than missing evidence.

---

# 24. Testing Plan

## Integration tests — `tests/integration/services.test.ts`

Add focused tests for revision-aware moderation.

### Test 1 — Report detail returns the reported revision

1. create/pick Revision 1
2. report Revision 1
3. edit tip to Revision 2
4. load `moderationReportDetail`
5. assert:

```text
reportedVersion.revision === 1
currentVersion.revision === 2
editedAfterReport === true
reportedVersion.body === Revision 1 body
currentVersion.body === Revision 2 body
```

This proves the dashboard no longer substitutes the live body.

---

### Test 2 — Historical photos belong to the correct revision

1. Revision 1 contains photo A
2. report Revision 1
3. edit to Revision 2 containing photo B
4. fetch report detail

Assert:

```text
reportedVersion.photos -> A
currentVersion.photos -> B
```

---

### Test 3 — Same-revision report

If no edit occurred:

```text
reportedRevision === currentRevision
editedAfterReport === false
```

The DTO should remain simple and valid.

---

### Test 4 — Stale moderator hide is rejected

1. moderator loads Revision 2
2. author edits to Revision 3
3. moderator submits:

```ts
expectedContributionRevision: 2
```

Assert:

```text
resolveReport -> CONFLICT
tip remains published
tip remains Revision 3
report remains open
```

This is a mandatory P0 test.

---

### Test 5 — Explicitly reviewed newer revision may be hidden

1. report belongs to Revision 1
2. current is Revision 2
3. moderator loads both
4. submit:

```ts
expectedContributionRevision: 2
```

Assert:

```text
current tip becomes hidden
report becomes resolved
```

---

### Test 6 — Deleted tip is never resurrected

1. open report exists
2. contribution becomes deleted
3. moderator attempts hide

Assert contribution remains:

```text
deleted
```

Never:

```text
hidden
```

---

### Test 7 — Report conflict still works

Retain the current test that a report cannot be resolved/dismissed twice.

---

### Test 8 — Non-moderator cannot fetch report detail

Assert:

```text
FORBIDDEN
```

This protects the historical snapshots and private moderation context.

---

# 25. Component / UI Tests

Add tests for `ReportReviewDrawer`.

At minimum:

### Unedited report

Shows:

```text
Hide tip
Dismiss report
```

Does not show the edited-after-report warning.

---

### Edited report

Shows warning:

```text
This tip was edited after it was reported
```

Shows:

```text
Reported version
Current version
```

Shows:

```text
Hide current tip
```

---

### Version switching

Selecting Reported version shows historical:

```text
body
price
metadata
photos
```

Selecting Current version shows current values.

---

### Required reason

Action button remains disabled until:

```ts
reason.trim().length > 0
```

---

### Closed report

Resolved/dismissed report has no active hide/dismiss buttons.

---

# 26. E2E / Manual Moderator Checks

At minimum manually verify:

1. report a tip
2. edit that tip
3. open moderator dashboard
4. open report
5. reported version is correct
6. current version is correct
7. images switch with version
8. hide current tip
9. public tip becomes unavailable
10. report becomes resolved

Then repeat the race case:

1. moderator opens report
2. author edits tip in another session/tab
3. moderator tries to hide
4. action is rejected
5. latest version appears after refresh

---

# 27. Accessibility Requirements

Because moderation actions can remove public content, keyboard accessibility is especially important.

Verify:

- `Review` can be opened with keyboard
- focus moves into drawer
- drawer has a meaningful title
- Escape closes drawer
- close returns focus to the originating Review action where possible
- version controls expose selected state
- all status information has text, not color alone
- reason textarea has a real label
- destructive confirmation is keyboard accessible
- nested photo viewer returns focus correctly
- background page is not keyboard reachable while modal drawer is open
- drawer remains usable at 200% zoom

---

# 28. Performance Requirements

Do not fetch complete report detail for all 25 queue rows.

Queue request should remain lightweight.

Only load historical snapshot/photo data for:

```text
review=<selected-report-id>
```

The selected-detail query should use a small fixed number of queries and should not introduce per-photo or per-history N+1 queries.

Maximum images per tip are already small, so fetching the two relevant revisions is inexpensive.

---

# 29. Security Requirements

All historical moderation data is private.

Rules:

- authorization happens on the server
- moderator detail query calls moderator check itself
- never trust client-provided author/revision/status values except as optimistic-concurrency expectations
- server re-fetches the report and contribution before mutation
- do not expose reporter email
- do not expose private contact values through a normal tip report
- historical `snapshotJson` must never contain phone/contact data
- do not use current content as a fallback for a missing historical revision
- reject stale destructive actions

---

# 30. Recommended Implementation Sequence

## Step 1 — Shared snapshot parsing

Add:

```text
src/server/contribution-snapshot.ts
```

and make historical snapshots reliably readable.

No UI change yet.

---

## Step 2 — Add `moderationReportDetail()`

Return:

```text
report context
reported version
current version
photos
author
destination
history
editedAfterReport
```

Add integration tests before UI work.

---

## Step 3 — Make `resolveReport()` revision-safe

Add:

```text
expectedContributionRevision
```

and stale-review conflict behavior.

Also prevent:

```text
deleted -> hidden
```

Add integration tests.

---

## Step 4 — Add `review` URL state

Extend the moderation query and page data.

Opening a report loads only that report's full detail.

---

## Step 5 — Build `ReportReviewDrawer`

Implement:

```text
report context
revision warning
version selector
full tip display
photos
author
history
reason
actions
```

---

## Step 6 — Remove direct destructive report actions from queue rows

Queue action becomes:

```text
Review
```

Actual tip report actions live in the drawer.

---

## Step 7 — Rename remaining ambiguous actions

Contact request:

```text
Resolve -> Hide contact
Dismiss -> Dismiss request
```

Tip report:

```text
Hide tip / Hide current tip
Dismiss report
```

---

## Step 8 — Accessibility and race-condition pass

Test:

```text
keyboard
mobile
zoom
nested photo viewer
stale revision conflict
two-moderator conflict
```

---

# 31. Acceptance Criteria

The P0 work is complete only when all of the following are true.

## Revision safety

- [ ] A report always displays the exact revision that was reported.
- [ ] If the tip has since changed, the current version is also available.
- [ ] Historical photos come from the reported revision.
- [ ] Current photos come from the current revision.
- [ ] The UI clearly says when the tip changed after the report.
- [ ] A moderator action is rejected if the current tip revision changed after the drawer loaded.
- [ ] A deleted tip can never be changed back to hidden by report resolution.

## Review drawer

- [ ] Queue remains compact.
- [ ] Clicking Review opens a full moderation drawer.
- [ ] Active queue filters/page are preserved.
- [ ] Closing the drawer returns to the same queue.
- [ ] Drawer shows report reason and traveller details.
- [ ] Drawer shows full tip content.
- [ ] Drawer shows useful metadata.
- [ ] Drawer shows version-specific photos.
- [ ] Drawer shows destination.
- [ ] Drawer shows author.
- [ ] Drawer shows existing moderation history.
- [ ] Resolved/dismissed reports open read-only.
- [ ] Mobile drawer is fully usable.

## Action clarity

- [ ] No generic `Resolve` button remains for tip reports.
- [ ] Tip report actions say `Hide tip` or `Hide current tip`.
- [ ] Tip report dismissal says `Dismiss report`.
- [ ] Contact action says `Hide contact`.
- [ ] Contact dismissal says `Dismiss request`.
- [ ] Destructive confirmation explains exactly what becomes hidden.
- [ ] Success/error toasts describe the action specifically.

## Quality

- [ ] Existing moderation integration tests still pass.
- [ ] New revision/race-condition tests pass.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Build passes.
- [ ] Drawer is keyboard accessible.
- [ ] 320/390/768/1024/1440 layouts are checked.
- [ ] 200% zoom is checked.

---

# 32. What Is Explicitly Out of Scope

Do not include these in this implementation:

- contributor moderation notifications
- showing moderation reason in `/me`
- user-detail/blocking drawer
- moderator assignment
- internal moderator notes
- appeals
- temporary suspension
- warnings
- duplicate-report grouping
- report-count scoring
- moderation analytics
- bulk actions
- AI moderation
- expanded moderator roles
- new public revision history
- contact-removal revision history

Those can be evaluated after the three P0 safeguards are complete.

---

# Final Recommended Architecture

Keep the architecture simple:

```text
Reports table
    |
    | Review
    v
Server-selected report detail
    |
    v
Accessible review drawer
    |
    +--> exact reported revision
    +--> current revision
    +--> exact photos for each revision
    +--> report context
    +--> author/destination
    +--> moderation history
    |
    v
Explicit moderation action
    |
    v
Server transaction checks
    |
    +--> report still open
    +--> contribution still the reviewed revision
    +--> contribution not deleted
    |
    v
Hide current tip OR dismiss report
```

The most important invariant is:

> **A moderator must never unknowingly take action on a version of a tip that they did not review.**

The existing TrailNote data model already supports that invariant. The work is mainly to query and present the historical data correctly, and then enforce the reviewed revision again when the moderation action reaches the server.
