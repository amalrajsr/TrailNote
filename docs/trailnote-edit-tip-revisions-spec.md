# TrailNote — Edit Tip, Revisions, Freshness & Change Reporting

## Purpose

This document defines how TrailNote should handle:

- editing an existing tip
- traveller confirmations after an edit
- created and updated dates
- tooltips for freshness and trust signals
- the confirmation modal shown before saving an edited tip
- frontend and backend validation
- traveller-reported changes
- internal revision history

The goal is to keep the experience simple for travellers while preserving trust and preventing old confirmations from being incorrectly applied to newly edited information.

---

## 1. Product Decision

TrailNote should continue to allow authors to edit their own tips.

Editing is important because practical travel information can change or the author may notice a mistake later.

Examples:

- fare was entered incorrectly
- timing information needs correction
- contact details changed
- the author wants to improve the wording
- a photo needs to be replaced
- a useful detail was missed

However, editing must not allow an author to change the content while keeping trust signals that were given to the previous version.

Therefore:

> Every meaningful edit creates a new version of the tip.

The previous version does not need to be shown publicly, but it should remain stored internally.

---

## 2. What Travellers Should See

Travellers should only see the latest version of a tip.

Do not add a public version-history interface for the beta.

Avoid exposing technical concepts such as:

- revision
- revision number
- snapshot
- revision ID
- confirmation invalidation

Instead, use simple wording such as:

- current information
- current version
- last updated
- confirmed this version

---

## 3. Existing TrailNote Architecture

The current TrailNote beta already has most of the required backend structure.

Existing safeguards include:

- only the original author can edit a tip
- edits are checked on the server
- destination cannot be changed during edit
- category cannot be changed during edit
- an update cannot be moved to another original tip
- the current revision must match before saving
- stale edits are rejected
- edits are rate-limited
- every revision is stored in `contributionRevisions`
- confirmations are linked to a specific revision
- traveller updates are linked to the revision they were reporting against

The existing `contributionRevisions` table already stores:

```ts
contributionId
revision
editorId
snapshotJson
createdAt
```

Therefore no new public history system is required.

---

## 4. Freshness & Trust Information

The tip detail page should clearly separate four concepts.

### Trip date

When the author actually experienced the information.

Example:

```text
Trip date
August 2026
```

### Added

When the tip was first published.

Example:

```text
Added
12 Sep 2026
```

### Last updated

When the original author last edited the tip.

Only show this when the tip has actually been edited.

Example:

```text
Last updated
19 Sep 2026
```

### Last confirmed

When another traveller most recently confirmed that the current information was still accurate.

Example:

```text
Last confirmed
18 Sep 2026
```

---

## 5. Change Required in Current Freshness Panel

The current implementation shows either:

```text
Added
```

or:

```text
Last updated
```

depending on whether the tip has been edited.

This should be changed.

### Unedited tip

Show:

```text
Trip date
August 2026

Added
12 Sep 2026

Last confirmed
18 Sep 2026
```

### Edited tip

Show:

```text
Trip date
August 2026

Added
12 Sep 2026

Last updated
19 Sep 2026

Last confirmed
Not yet confirmed
```

The original creation date should never disappear after an edit.

---

## 6. Date Precision

Exact time and timezone are unnecessary for normal travellers.

Avoid displaying:

```text
19 Sep 2026, 4:37 pm IST
```

Prefer:

```text
19 Sep 2026
```

The precise timestamp can remain in the database.

TrailNote's trust model is based more on days and months than exact minutes.

---

## 7. Do Not Add a “Modified” Badge

Do not add a separate badge such as:

```text
Modified
```

The existing status badge area should remain reserved for meaningful trust or freshness states such as:

```text
Recently confirmed
```

or:

```text
Change reported
```

An author edit may be very small, such as fixing a spelling mistake.

Therefore the edit state should be shown as metadata:

```text
Last updated
19 Sep 2026
```

rather than as a high-priority status badge.

---

## 8. Traveller Confirmations After an Edit

Confirmations must remain tied to the exact information that travellers confirmed.

Example:

```text
Revision 1
Bus fare: ₹40
5 travellers confirmed
```

The author edits the tip:

```text
Revision 2
Bus fare: ₹50
```

The new version must not display the old 5 confirmations.

From the traveller's point of view:

```text
Before edit:
5 travellers confirmed this version

After edit:
Not yet confirmed
```

The backend already supports this because confirmations are stored against a specific revision.

---

## 9. Helpful Votes After an Edit

Helpful votes are currently not revision-specific.

This creates a possible trust problem.

Example:

```text
Original tip:
Bus fare is ₹40

Helpful: 35
```

If the author later changes the content substantially, those 35 votes may no longer represent the new information.

### Beta recommendation

When a meaningful edit is successfully saved:

> Clear the existing Helpful votes for that tip.

This keeps the behavior conservative and simple.

Later, if necessary, Helpful votes can be made revision-specific.

---

## 10. “Report a Change” Must Stay Separate From Editing

These are two different actions.

### Author finds their own information is wrong

Use:

```text
Edit tip
```

This changes the original tip and creates a new internal revision.

### Another traveller finds something different

Use:

```text
Report a change
```

This should continue creating a separate traveller update.

Example:

```text
Original traveller
Bus fare: ₹40

Another traveller
Fare was ₹50 when I travelled in September.
```

The second traveller should never directly overwrite the original author's tip.

---

## 11. Public Handling of Older Versions

Do not show old author versions publicly for now.

Travellers should see only the latest version.

However, TrailNote should continue storing older versions internally through `contributionRevisions`.

This gives moderation and debugging support later without adding public complexity.

---

## 12. Existing Traveller Updates on Older Versions

If another traveller submitted a change report against an earlier version, that traveller update may still be shown under:

```text
Updates on an earlier version
```

This is useful context.

The author's old version itself does not need to be shown.

---

# Tooltip Strategy

## 13. General Rule

Use tooltips only where the meaning is not immediately obvious.

Do not put an info icon beside every label.

Tooltips should explain user-facing meaning, not technical implementation.

Never use wording such as:

```text
Revision 3
Confirmation scoped to revision
Snapshot
Revision ID
```

Prefer plain language.

---

## 14. Trip Date Tooltip

Label:

```text
Trip date
```

Tooltip:

> When the traveller experienced or verified this information.

Tooltip recommended: **Yes**

---

## 15. Added Tooltip

Label:

```text
Added
```

Tooltip recommended: **No**

The meaning is already clear.

---

## 16. Last Updated Tooltip

Label:

```text
Last updated
```

Tooltip:

> When the original author last edited this tip.

Tooltip recommended: **Yes**

---

## 17. Last Confirmed Tooltip

Label:

```text
Last confirmed
```

Tooltip:

> When another traveller most recently confirmed that this information was still accurate.

Tooltip recommended: **Yes**

---

## 18. Confirmation Count Tooltip

Example:

```text
7 travellers confirmed this version
```

Tooltip:

> Confirmations apply to the current information. If the author edits the tip, it needs to be confirmed again.

Tooltip recommended: **Yes**

This is one of the most important tooltips because users may otherwise assume confirmations remain valid forever.

---

## 19. Recently Confirmed Badge Tooltip

Badge:

```text
Recently confirmed
```

Tooltip:

> Another traveller recently confirmed that this information was still accurate.

Tooltip recommended: **Yes**

---

## 20. Change Reported Badge Tooltip

Badge:

```text
Change reported
```

Tooltip:

> A traveller reported that some of this information may have changed. Check the traveller updates below.

Tooltip recommended: **Yes**

---

## 21. Still Accurate Tooltip

Action:

```text
Still accurate
```

Optional tooltip:

> Use this if you recently experienced the same information and it is still correct.

Tooltip recommended: **Optional**

The action is already fairly clear.

---

## 22. Report a Change Tooltip

Action:

```text
Report a change
```

Tooltip:

> Seen something different recently? Share what changed without replacing the original traveller's tip.

Tooltip recommended: **Yes**

---

# Edit Flow

## 23. Edit Screen Message

The current wording:

```text
New edits start a new version. Earlier confirmations stay with the previous version.
```

is technically correct but too system-oriented.

Replace it with something simpler.

Recommended copy:

> Editing confirmed information will reset its traveller confirmations.

Add an optional tooltip:

> Confirmations were given for the current information, so edited information needs to be confirmed again.

Do not use the word `revision`.

---

## 24. Confirmation Modal Before Saving

A confirmation modal should be shown only when the tip currently has traveller confirmations.

### If confirmation count is zero

Save normally.

Do not show an unnecessary modal.

### If confirmation count is greater than zero

When the author clicks:

```text
Save changes
```

show a confirmation modal.

Recommended modal:

```text
Save changes?

7 travellers confirmed the current information.
Saving your changes will reset these confirmations,
because they were given before the tip was edited.

[ Cancel ] [ Save changes ]
```

Use the real confirmation count in the modal.

---

## 25. When to Show the Modal

Do not show the modal when the author first opens the edit page.

Only show it when:

1. the author has actually changed something
2. the author clicks `Save changes`
3. the current tip has one or more confirmations

This avoids unnecessary friction.

---

# Change Detection

## 26. Do Not Create a Revision When Nothing Changed

If the author opens the edit page and clicks Save without changing anything:

Do not:

- increment the revision
- change `updatedAt`
- clear confirmations
- clear Helpful votes
- create another revision snapshot

Instead return:

```text
No changes to save.
```

---

## 27. Frontend Validation

The frontend should compare the current edit form with the initially loaded values.

Purpose:

- avoid unnecessary API calls
- avoid unnecessary confirmation modal
- provide immediate feedback

Example behavior:

```text
User clicks Save changes
        ↓
No changes detected
        ↓
Show:
"No changes to save."
```

This is primarily a UX optimization.

---

## 28. Backend Validation

The backend must independently check whether a meaningful change exists.

The frontend must never be the only protection.

Users can bypass frontend checks.

The backend should be the final authority.

Backend flow:

```text
Receive edit request
        ↓
Validate input
        ↓
Normalize input
        ↓
Compare with currently stored tip
        ↓
No meaningful change?
        ↓
Return unchanged result
```

Do not create a revision in this case.

---

## 29. Avoid Raw Object Comparison

Do not rely only on:

```ts
JSON.stringify(initial) === JSON.stringify(current)
```

Different raw values may represent the same information.

Examples:

```text
" ₹40 "
"₹40"
```

or:

```text
undefined
null
""
```

Compare normalized values.

TrailNote already validates edit input through `contributionInput`.

Use the validated/normalized representation for backend comparison.

---

## 30. Meaningful Changes

Treat changes to the following as meaningful:

- tip text
- price
- trip/visited month
- place name
- room type
- booking method
- dish
- transport route
- transport mode
- duration
- walking time
- timing information
- boarding point
- location
- map URL
- contact information
- photos

Destination and category should remain immutable during editing, as already enforced.

---

# Recommended Save Flow

## 31. Complete Frontend Flow

```text
User opens Edit Tip
        ↓
Edit form loads current tip
        ↓
User modifies fields
        ↓
Clicks Save changes
        ↓
Frontend checks whether anything changed
        ↓
No changes
        → Show "No changes to save."
        ↓
Changes detected
        ↓
Does tip currently have confirmations?
        ↓
No
        → Submit directly
        ↓
Yes
        → Show confirmation modal
        ↓
User confirms
        → Submit edit
```

---

## 32. Complete Backend Flow

```text
Edit request received
        ↓
Authenticate user
        ↓
Verify user owns tip
        ↓
Rate-limit request
        ↓
Validate submitted data
        ↓
Verify expected revision matches
        ↓
Verify destination/category/original link did not change
        ↓
Normalize and compare with current data
        ↓
No meaningful changes
        → Return unchanged
        ↓
Changes exist
        ↓
Create next revision
        ↓
Update tip
        ↓
Store revision snapshot
        ↓
Existing confirmations naturally remain on previous revision
        ↓
Clear Helpful votes
        ↓
Return updated tip
```

---

# UI Summary

## 33. Recommended Freshness Panel

Example:

```text
IS THIS TIP STILL CURRENT?

Trip date                Aug 2026  ⓘ

Added                    12 Sep 2026

Last updated             19 Sep 2026  ⓘ

Last confirmed           Not yet confirmed  ⓘ

7 travellers confirmed this version  ⓘ
```

If the tip has never been edited:

```text
IS THIS TIP STILL CURRENT?

Trip date                Aug 2026  ⓘ

Added                    12 Sep 2026

Last confirmed           18 Sep 2026  ⓘ

7 travellers confirmed this version  ⓘ
```

Do not show an empty `Last updated` row.

---

## 34. Recommended Status Badge Behavior

Use the main status badge for information such as:

```text
Recently confirmed
```

or:

```text
Change reported
```

Do not use:

```text
Modified
```

Editing should remain part of the metadata, not the primary status.

---

# Final Beta Scope

## 35. Implement Now

For the current beta:

1. Keep `Edit Tip`.
2. Keep `Report a change` as a separate traveller update.
3. Continue storing revisions internally.
4. Do not expose public version history.
5. Always show the original `Added` date.
6. Show `Last updated` only after an actual edit.
7. Use date-only formatting in the freshness panel.
8. Do not add a `Modified` badge.
9. Keep confirmations revision-specific.
10. Clear Helpful votes after a meaningful edit.
11. Add tooltips only to non-obvious freshness/trust concepts.
12. Avoid the word `revision` in traveller-facing UI.
13. Add the edit-page warning about confirmations.
14. Show the save-confirmation modal only when confirmation count is greater than zero.
15. Do not create a new version if nothing actually changed.
16. Perform change detection on both frontend and backend.
17. Treat the backend as the final source of truth.

---

# Things Not Required for Beta

Do not add yet:

- public edit history
- revision numbers in the UI
- compare-version screen
- restore previous version
- separate moderation dashboard for revisions
- complex change diffs
- revision-specific Helpful votes
- mandatory confirmation modal for every edit

These can be introduced later only if actual usage creates a need.

---

# Core Product Principle

The traveller should understand only this:

> Someone shared this information.

> Other travellers may confirm that it is still accurate.

> If the author changes the information, those earlier confirmations no longer validate the changed version.

> If another traveller finds something different, they can report what changed without overwriting the original author's tip.

Everything else should remain an implementation detail.
