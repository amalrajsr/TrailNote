# TrailNote — Hidden & Deleted Tip Management V1

## Objective

Improve how authors manage **Hidden** and **Deleted** tips from `/me` without introducing a new moderation-reason data model.

This implementation should stay intentionally small and reuse the current `beta` branch architecture.

### Final product behaviour

| Tip status | Appears in All | Own tab | Public tip link | Edit | Delete | Extra action |
|---|---:|---:|---:|---:|---:|---|
| Published | Yes | Published | Yes | Yes | Yes | — |
| Hidden | Yes | Hidden | No | No | Yes | `Why was this hidden?` |
| Deleted | No | Deleted | No | No | No | — |

### Explicit V1 decision

Do **not** introduce a separate `hiddenReason` field now.

For this release:

- Report-driven hides use the existing `reports.resolutionNote` as the author-facing explanation.
- Direct moderator hides use the existing `moderationEvents.reason` as the author-facing explanation.
- When a moderator is hiding a tip, the UI must clearly state that the entered reason/note may be shown to the tip author.
- A dedicated public hidden-reason field can be introduced later if TrailNote eventually needs separate internal moderator notes and user-facing explanations.

No schema migration is required for this feature unless implementation reveals an unrelated existing schema requirement.

---

## 1. Current implementation to preserve

The current `beta` branch already provides most of the required infrastructure.

Relevant existing behaviour:

- `contributions.status` supports:
  - `published`
  - `hidden`
  - `deleted`
- `/me` currently has:
  - All
  - Published
  - Hidden
- `accountContributions()` already returns an author's contributions including hidden/deleted records.
- `deleteOwnTip()` already calls `deleteContribution()`.
- `deleteContribution()` already performs a soft delete:
  - `status = "deleted"`
  - `deletedAt = now`
- Contribution revisions, report records, and moderation history are retained.
- Public contribution queries already expose only Published tips.
- `editContribution()` already rejects Hidden tips indirectly through `visibleContribution()`.
- `/tips/[id]/edit` currently allows the Hidden tip editor to load and only fails when saving.
- `/me` currently renders an Edit action for Hidden tips.
- Deleted tips currently appear in the account contribution result.
- Report resolutions already store `resolutionNote`.
- Direct moderation visibility changes already store a reason in `moderationEvents.reason`.

Do not replace these systems unnecessarily.

---

## 2. `/me` tabs

Change `/me` to contain four tabs:

```text
All
Published
Hidden
Deleted
```

Supported URLs:

```text
/me
/me?status=published
/me?status=hidden
/me?status=deleted
```

Update the filter parsing in:

```text
app/me/page.tsx
```

to accept:

```ts
"published" | "hidden" | "deleted"
```

Anything else should continue to fall back to:

```ts
"all"
```

Use the existing tab component/style. Do not introduce a new tab implementation.

---

## 3. Meaning of the All tab

`All` must contain:

```text
Published + Hidden
```

It must **not** contain Deleted tips.

Deleted contributions still need to be available to the `/me` page because they are displayed in the Deleted tab.

A simple approach is to load the account contributions once and derive active contributions:

```ts
const allAccountTips = await accountContributions(db, user.id);

const activeTips = allAccountTips.filter(
  (tip) => tip.status !== "deleted",
);

const tips =
  filter === "all"
    ? activeTips
    : allAccountTips.filter((tip) => tip.status === filter);
```

Do not physically delete or hide Deleted records from the account query in a way that prevents the Deleted tab from accessing them.

---

## 4. Tab counts

Counts must be:

```text
All       = Published + Hidden
Published = Published only
Hidden    = Hidden only
Deleted   = Deleted only
```

Example:

```text
All 12
Published 10
Hidden 2
Deleted 4
```

Do not include Deleted tips in the All count.

---

## 5. `/me` profile statistics

Deleted tips should not contribute to the active account statistics at the top of `/me`.

Use:

```text
Published + Hidden
```

for:

- Tips shared
- Places

Conceptually:

```tsx
tipsSharedCount={activeTips.length}

placesCount={
  new Set(activeTips.map((tip) => tip.destination.slug)).size
}
```

Do not count Deleted tips.

Do not modify unrelated public profile statistics unless the current code shares exactly the same data path and requires an adjustment for consistency.

---

## 6. Published tip card

Published cards should retain the current behaviour.

Actions:

```text
Read tip
Edit
Delete
```

The title/read action may continue navigating to:

```text
/tips/[id]
```

Avoid unrelated changes to Published cards.

---

## 7. Hidden tip card

Hidden tips remain visible to their author in:

```text
All
Hidden
```

Keep the existing card layout.

Do **not** insert a large warning panel into the card body.

Do **not** make Hidden cards structurally different from Published cards.

Continue using the existing:

```text
Hidden
```

status badge.

Hidden cards should:

- show destination
- show category
- show title
- show body preview
- show the existing Hidden badge
- have no public tip link

Hidden tips are not publicly available, so the title must not link to `/tips/[id]`.

---

## 8. Hidden tip actions

Hidden tips should show:

```text
Why was this hidden?                    Delete
```

Hidden tips must **not** show:

```text
Read tip
Edit
```

Do not show a disabled Edit button.

Completely remove the Edit action for Hidden tips.

Use `Why was this hidden?` in the left-side contextual-action position where Published cards currently use `Read tip`.

This preserves a consistent footer structure:

```text
Published:
Read tip                              Edit  Delete

Hidden:
Why was this hidden?                       Delete

Deleted:
Deleted 19 Sep 2026
```

`Why was this hidden?` must be an accessible `<button>`, not a clickable `<span>`.

Style it as a quiet text action so it does not compete visually with Delete.

---

## 9. `Why was this hidden?` dialog

Clicking:

```text
Why was this hidden?
```

must open an informational dialog using TrailNote's existing:

```text
Dialog
```

component.

Do not add another modal/dialog dependency.

Recommended structure:

```text
Why was this tip hidden?

This tip is no longer visible to other travellers because it didn't meet TrailNote's community guidelines.

Reason

[resolved moderation reason]

Editing hidden tips isn't available right now. You can delete this tip from your account.

View community guidelines                         Got it
```

Recommended title:

```text
Why was this tip hidden?
```

Recommended explanation:

```text
This tip is no longer visible to other travellers because it didn't meet TrailNote's community guidelines.
```

Show the actual reason beneath a small:

```text
Reason
```

label.

Include a link to:

```text
/community-guidelines
```

Use:

```text
Got it
```

or:

```text
Close
```

for the dialog button.

This is an informational dialog. Do not style the entire dialog as a destructive/error dialog.

---

## 10. Source of the hidden reason

Do not add a new database column.

Derive an author-safe `hiddenReason` string for the `/me` DTO from existing moderation data.

### Report-driven hide

If the tip was hidden when a report was resolved with the Hide action:

```text
Use reports.resolutionNote
```

Use the resolution note belonging to the report/hide decision that caused the current hidden state.

### Direct moderator hide

If the tip was hidden directly through the moderation visibility controls instead of report resolution:

```text
Use moderationEvents.reason
```

Use the relevant/latest `hide` moderation event for the current hidden state.

### Fallback

If no suitable reason can be resolved, use:

```text
This tip was hidden because it didn't meet TrailNote's community guidelines.
```

Do not fail the `/me` page because historical Hidden records do not have a resolvable reason.

---

## 11. Privacy rules for the hidden-reason dialog

The owner-facing DTO/dialog must **not** expose:

- reporter identity
- reporter ID
- reporter username
- raw reporter details
- moderator identity
- moderator ID
- complete report objects
- complete moderation history
- unrelated resolution notes
- number of reports

The client should receive only the final derived string required by the dialog, for example:

```ts
hiddenReason: string | null
```

This is a DTO field only.

It is **not** a new database column.

---

## 12. Moderator note behaviour for Hide

Because `resolutionNote` is being reused as the author-facing explanation for report-driven hides, the moderation UI must make this explicit.

When the moderator is choosing **Hide**, update the note field label/helper text so the moderator understands that the text may be shown to the author.

Example label:

```text
Reason for hiding
```

Example helper:

```text
Explain briefly why this tip is being hidden. This reason will be visible to the tip author.
```

The moderator should write an author-safe explanation such as:

```text
The transport fare in this tip appears to be inaccurate.
```

Avoid internal-only wording such as:

```text
Reporter says fare changed. Checked account history. Second complaint this week.
```

For `dismiss` or `issue fixed`, existing resolution-note behaviour can remain because those notes are not exposed through the Hidden-tip dialog.

Do not introduce a separate `publicReason` parameter or field in this V1 task.

---

## 13. Direct moderator hide reason

The existing direct visibility-change flow stores its reason in:

```text
moderationEvents.reason
```

For a direct:

```text
published → hidden
```

action, ensure the moderator UI/helper copy also makes it clear that the reason may be shown to the author.

Do not add a new field.

For a:

```text
hidden → published
```

restore action, no hidden-reason cleanup field is necessary because the reason is derived from moderation history and is only queried/displayed while the contribution is currently Hidden.

---

## 14. Resolve the current Hidden reason carefully

Do not simply fetch the latest report resolution note for the tip.

A tip can have multiple reports.

The query/service should identify the explanation associated with the moderation action that resulted in the tip's **current Hidden state**.

Use the existing moderation/report timestamps/actions to correlate the hide action.

The expected priority is:

1. The report resolution associated with the current/latest effective `hide` action.
2. If there is no report-driven hide, the relevant `moderationEvents.reason` for the current/latest effective `hide`.
3. Generic fallback text.

Do not accidentally show a note from:

- a dismissed report
- an `issue_fixed` report
- an older hide that was later restored
- a report unrelated to the current hide state

Keep this logic server-side.

---

## 15. Hidden tips cannot be edited

For this early release:

- no Edit
- no Edit & resubmit
- no Restore
- no Republish

A Hidden tip can only:

- remain Hidden
- be viewed by its author in `/me`
- show the hidden reason
- be Deleted by its author
- be restored by a moderator through the existing moderation tools if applicable

Do not add an author-facing restore flow.

---

## 16. Protect the direct edit route

UI hiding is not sufficient.

Current file:

```text
app/tips/[id]/edit/page.tsx
```

currently allows an owned Hidden contribution to load because it only rejects Deleted records.

Change the guard from the current concept:

```ts
if (!tip || tip.status === "deleted") notFound();
```

to:

```ts
if (!tip || tip.status !== "published") notFound();
```

Final behaviour:

```text
Published → editor allowed
Hidden    → editor unavailable
Deleted   → editor unavailable
```

A user manually visiting:

```text
/tips/{hidden-id}/edit
```

must not reach the editor.

---

## 17. Preserve server-side edit protection

Do not weaken the existing protection in:

```text
editContribution()
```

It already relies on `visibleContribution()`, which only operates on Published contributions.

Final protection should exist at all three levels:

```text
UI:
No Edit action for Hidden/Deleted tips

Route:
Hidden/Deleted tips cannot load the edit page

Service:
Non-published tips still cannot be edited
```

---

## 18. Hidden tip deletion

Authors can Delete their Hidden tips.

Reuse the existing:

```text
deleteOwnTip()
```

and:

```text
deleteContribution()
```

Do not create:

```text
deleteHiddenTip()
```

or another duplicate server action/service.

The existing delete path should remain the single author deletion mechanism.

---

## 19. Deletion remains soft deletion

Continue using the existing behaviour:

```ts
status: "deleted"
deletedAt: now
updatedAt: now
```

Do not hard-delete the contribution row.

Preserve:

- contribution
- contribution revisions
- reports
- moderation events
- moderation history

Keep the existing media cleanup behaviour unchanged unless an actual bug is discovered.

The Deleted tab does not require preserving deleted media indefinitely.

---

## 20. Published tip delete confirmation

For a Published tip:

### Title

```text
Delete this tip?
```

### Description

```text
It will no longer be visible to travellers and will move to your Deleted tips. This action can't be undone.
```

Buttons:

```text
Cancel
Delete tip
```

Keep the existing destructive styling.

---

## 21. Hidden tip delete confirmation

For a Hidden tip:

### Title

```text
Delete this hidden tip?
```

### Description

```text
This tip is already hidden from travellers. Deleting it will move it to your Deleted tips. This action can't be undone.
```

Buttons:

```text
Cancel
Delete tip
```

Do not say that it will be permanently removed from the user's account because it remains visible in the Deleted tab.

---

## 22. Deleted tab

Add:

```text
Deleted
```

as the fourth tab.

Deleted contributions should appear **only** in this tab.

They must not appear in:

```text
All
Published
Hidden
```

---

## 23. Deleted tip card

Deleted cards are read-only account-history records.

Show:

- destination
- Deleted status badge
- category
- title
- body preview
- deletion date

Do not show:

- Read tip
- Edit
- Delete again
- Restore
- Republish
- `Why was this hidden?`
- public detail link

The card should not navigate to `/tips/[id]`.

---

## 24. Deleted date

Expose the existing `deletedAt` value through the account contribution DTO.

`accountContributions()` currently combines `cardsForRows()` output with values from the raw contribution row.

Extend the mapped DTO with:

```ts
deletedAt: rows[index]!.deletedAt
```

Also expose the derived:

```ts
hiddenReason: string | null
```

for Hidden contributions.

Example Deleted-card footer:

```text
Deleted 19 Sep 2026
```

Use TrailNote's existing `en-IN` date formatting conventions.

---

## 25. Account contribution type safety

The current account component uses:

```ts
status: string
```

Tighten it while modifying the component:

```ts
status: "published" | "hidden" | "deleted";
```

Include:

```ts
deletedAt: number | null;
hiddenReason: string | null;
```

Do not use `any`.

---

## 26. Card layout consistency

This is an important UX requirement.

Do not redesign the card body by status.

Maintain the same major structure:

```text
Destination                            Status

Category

Title

Body

--------------------------------------------

Contextual action                     Actions
```

Examples:

### Published

```text
Kochi                              Published
Food
Best breakfast...
Body...

Read tip                            Edit  Delete
```

### Hidden

```text
Kochi                                 Hidden
Food
Best breakfast...
Body...

Why was this hidden?                       Delete
```

### Deleted

```text
Kochi                                Deleted
Food
Best breakfast...
Body...

Deleted 19 Sep 2026
```

The status should change the available actions, not the card's basic visual structure.

---

## 27. Filter-aware empty states

`MyContributions` currently has a generic empty state.

Once the page has four tabs, make the empty state aware of the active filter.

Pass the filter into the component.

### All

Keep the existing first-tip CTA:

```text
Your first tip could make someone's trip easier.
```

Keep the existing Find a place/share action.

### Published

Use:

```text
No published tips yet.
```

A share-tip CTA is optional because the page already has the top-level Share a tip action.

### Hidden

Use:

```text
No hidden tips.
```

Optional supporting text:

```text
Tips hidden by TrailNote will appear here.
```

No CTA required.

### Deleted

Use:

```text
No deleted tips.
```

Optional supporting text:

```text
Tips you delete will appear here.
```

No CTA required.

Do not show the "first tip" CTA inside Hidden or Deleted.

---

## 28. Styling

Use the existing TrailNote UI tokens and components.

Reuse:

- existing account card styles
- existing status badge styles
- existing tab styles
- `Dialog`
- `Button`
- existing spacing/radius/color tokens

Only small CSS additions should be needed for:

- `Why was this hidden?`
- hidden-reason dialog content
- Deleted timestamp
- filter-aware empty states if necessary

Do not:

- change Hidden cards to a large amber background
- make Deleted cards look like errors
- add a UI package
- redesign all contribution cards

---

## 29. Accessibility

Ensure:

- `Why was this hidden?` is a `<button>`
- the Dialog handles focus using the existing overlay implementation
- the dialog can be closed by keyboard
- Community Guidelines is a real link
- status is conveyed as text, not only colour
- Delete remains clearly labelled as destructive
- moderator Hide note/helper copy is associated with the relevant input
- no important information requires hover

---

## 30. Expected files to inspect/change

Start by reading the current `beta` versions.

Expected primary files:

```text
app/me/page.tsx

src/components/account/contributions.tsx

src/server/queries/account.ts

app/tips/[id]/edit/page.tsx

src/server/services/moderation.ts

src/components/moderation/report-review-drawer.tsx

app/moderation/actions.ts
    Only modify if actually required by the existing flow.
    Do not add a new publicReason argument.

app/globals.css

tests/integration/services.test.ts
```

`app/me/actions.ts` should probably require no functional change because the existing `deleteOwnTip()` flow should be reused.

Do **not** add a database migration or modify the contribution schema solely for hidden reasons.

Search for all call sites before changing any existing moderation method.

---

## 31. Explicitly removed from this implementation

Do **not** implement any of the following from earlier design exploration:

```text
contributions.hiddenReason database column
hidden_reason migration
new hidden-reason enum
hiddenReasonLabels database-backed mapping
publicReason parameter
separate internal/public moderation-reason fields
syncing hiddenReason during hide/restore
new schema constraints for hiddenReason
dedicated author-facing moderation reason storage
```

These may be reconsidered later if TrailNote needs separate internal moderator notes and user-facing explanations.

---

## 32. Other non-goals

Also do not implement:

```text
Edit Hidden tip
Edit & resubmit
Appeal moderation decision
Restore Deleted tip
Republish Deleted tip
Hard-delete contribution history
Author-facing moderation history
Reporter information
Separate Hidden-tip detail page
Separate deleteHiddenTip API
Moderation dashboard redesign
Contribution card redesign
New UI libraries
```

---

## 33. Tests — Hidden editing

Add/retain coverage proving:

```text
Given:
Author owns a Published tip

When:
Moderator hides it

Then:
editContribution() cannot edit it
```

Also verify where practical:

```text
/tips/{hidden-id}/edit
```

does not render the editor.

---

## 34. Tests — Hidden deletion

Add integration coverage:

```text
1. Create contribution.
2. Hide it through moderation.
3. Author calls deleteContribution().
4. Contribution status becomes "deleted".
5. deletedAt is populated.
6. Contribution row remains.
7. Contribution revision history remains.
8. Existing report/moderation records remain.
```

Do not expect physical deletion.

---

## 35. Tests — account filtering

Prepare:

```text
Published tip
Hidden tip
Deleted tip
```

Expected:

```text
All:
Published + Hidden

Published:
Published only

Hidden:
Hidden only

Deleted:
Deleted only
```

Deleted must not contribute to All.

---

## 36. Tests — `/me` statistics

Given:

```text
2 Published
1 Hidden
3 Deleted
```

Expected:

```text
All = 3
Published = 2
Hidden = 1
Deleted = 3

Tips shared = 3
```

Places must be derived only from Published + Hidden contributions.

---

## 37. Tests — hidden explanation

Add server/query coverage for the derived hidden reason.

### Report-driven hide

```text
Resolve report with disposition = hide
resolutionNote = "The transport fare in this tip appears to be inaccurate."

→ /me Hidden DTO exposes:
hiddenReason = "The transport fare in this tip appears to be inaccurate."
```

### Direct hide

```text
Moderator directly hides tip
moderationEvents.reason = "This tip contains unsafe information."

→ /me Hidden DTO exposes the relevant direct-hide reason.
```

### Missing historical reason

```text
Hidden tip has no resolvable report/event reason

→ use generic fallback
→ /me must not fail
```

### Multiple reports/history

Verify that the DTO does not accidentally expose:

- a dismissed report's note
- an `issue_fixed` note
- an older hide reason that was later restored
- an unrelated report resolution

The displayed explanation must correspond to the current effective Hidden state.

---

## 38. Tests — privacy

Ensure the author-facing `/me` data does not expose:

```text
reporterId
reporter username
report details
moderatorId
complete report object
complete moderation event object
moderation history
```

Only expose the final derived:

```ts
hiddenReason: string | null
```

plus the existing account contribution data.

---

## 39. Acceptance criteria

Implementation is complete only when all of the following are true:

- `/me` has All, Published, Hidden, and Deleted tabs.
- All contains Published + Hidden only.
- Deleted has its own count.
- Deleted does not affect All.
- Deleted does not affect `/me` Tips shared.
- Deleted does not affect `/me` Places.
- Hidden tips remain visible to their author.
- Hidden tips remain unavailable publicly.
- Hidden cards do not show Read tip.
- Hidden cards do not show Edit.
- Hidden cards show Delete.
- Hidden cards show a subtle `Why was this hidden?` action.
- Clicking it opens the existing Dialog component.
- The dialog explains that the tip is not visible to travellers.
- The dialog shows the relevant existing moderation reason/note.
- The dialog links to Community Guidelines.
- Reporter identity/details are never exposed.
- Hidden tips cannot manually access the edit page.
- Hidden tips remain protected from edits at the service layer.
- Published tips can still be edited normally.
- Published and Hidden tips can both be soft-deleted by their author.
- Delete confirmation copy is status-aware.
- Deleted tips appear only in Deleted.
- Deleted cards are read-only.
- Deleted cards show `deletedAt`.
- Deleted tips cannot be restored by the author in V1.
- Existing contribution revisions remain.
- Existing moderation/report records remain.
- Existing media cleanup behaviour remains unchanged.
- No hidden-reason database field or migration is introduced.
- Existing moderation concurrency/revision protections remain intact.
- Existing public contribution behaviour remains unaffected.

---

## 40. Implementation guidance for Luna

1. Work from the current `beta` branch, not assumptions from this specification alone.
2. Read every affected file before editing.
3. Prefer small modifications to existing components/services over new abstractions.
4. Reuse the existing `Dialog`, `Button`, account card, status badge, and tab patterns.
5. Keep server-side authorization/validation authoritative.
6. Never rely only on hiding an Edit button.
7. Preserve existing revision/concurrency protections.
8. Reuse `deleteOwnTip()` and `deleteContribution()`.
9. Do not add a schema field or migration for the hidden explanation.
10. Derive the Hidden reason server-side from existing moderation/report records.
11. Do not send raw moderation/report objects to the client.
12. Ensure Hide notes/reasons in moderator UI are clearly marked as potentially visible to the author.
13. Avoid unrelated refactors.
14. Search the repository for all call sites before changing service/query behaviour.
15. Add focused tests covering filtering, deletion, edit blocking, hidden-reason resolution, and privacy.
16. Run the existing test suite plus new tests.
17. Run the project's existing TypeScript/lint/build checks.
18. Verify the final `/me` UI on desktop and mobile.
19. Confirm Published, Hidden, and Deleted cards still look like the same component with status-specific actions rather than separate designs.
20. Do not implement future moderation architecture unless it is required to make this exact V1 behaviour work safely.
