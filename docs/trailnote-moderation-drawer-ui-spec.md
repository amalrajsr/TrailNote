# TrailNote — Moderator Report Drawer UI Specification

## Purpose

This specification defines the visual and interaction design for the redesigned **moderator report review drawer**.

It should be used together with:

```text
trailnote-moderation-drawer-redesign.html
```

This document covers only the UI/UX presentation of the moderation drawer.

It does **not** redefine:

- revision-aware moderation logic
- report resolution behavior
- stale revision protection
- server authorization
- report action semantics
- database behavior

Those are already handled by the existing moderation implementation.

---

# 1. Design Goal

The current drawer contains the right information, but too much of it is presented with the same visual weight.

The redesigned drawer should make the moderator understand the page in this order:

```text
1. What is this report?
2. Why was it reported?
3. What content was reported?
4. What moderation action happened before?
5. What was the final outcome?
```

The drawer should feel like a **review workspace**, not a long text form.

---

# 2. Overall Layout

Desktop drawer:

```text
width: ~620px
position: right side
height: full viewport
scroll: drawer body only
```

Recommended desktop width:

```css
width: min(640px, calc(100vw - 28px));
```

Mobile:

```text
width: 100vw
height: 100dvh
```

The background moderation dashboard should remain visible behind the drawer on desktop.

---

# 3. Main Visual Structure

The drawer should be divided into five clear regions:

```text
Header
↓
Report context
↓
Reported content
↓
Moderation history
↓
Review outcome / action area
```

Each section should be visually distinct.

Do not present everything as a single vertical list of headings and paragraphs.

---

# 4. Header

## Structure

Header content:

```text
Tip report          [Resolved] [Tip hidden]

Reported 19 Sep 2026 · Gokarn, Karnataka

                                            [×]
```

Recommended hierarchy:

```text
Title
Status badges
Metadata
Close button
```

---

# 5. Header Typography

Title:

```text
Tip report
```

Recommended:

```css
font-size: 22–24px;
font-weight: 650;
line-height: 1.25;
```

Metadata:

```text
Reported 19 Sep 2026 · Gokarn, Karnataka
```

Recommended:

```css
font-size: 13px;
color: var(--ink-muted);
```

Do not make location/date compete visually with the title.

---

# 6. Sticky Header

The header should remain visible while scrolling.

Recommended:

```css
position: sticky;
top: 0;
z-index: 4;
background: var(--surface);
border-bottom: 1px solid var(--border);
```

Optional:

```css
backdrop-filter: blur(10px);
```

Use only if consistent with the current design system.

---

# 7. Status Badges

Show report status and current tip status separately.

Example:

```text
Resolved
Tip hidden
```

Do not combine them into:

```text
Resolved · Hidden
```

because they represent different states.

---

# 8. Report Status Badge

Examples:

```text
Open
Resolved
Dismissed
```

Use existing moderation badge colors.

Resolved:

```text
green / brand-soft
```

Open:

```text
warning
```

Dismissed:

```text
danger-muted
```

---

# 9. Tip Status Badge

Examples:

```text
Published
Hidden
Deleted
```

Tip status should be visually secondary to report status.

Example:

```text
Tip hidden
```

rather than only:

```text
Hidden
```

This makes the meaning obvious.

---

# 10. Section Spacing

Each main section should use:

```css
margin-top: 28px;
padding-top: 28px;
border-top: 1px solid var(--border);
```

Except the first section.

This creates stronger separation than the current continuous layout.

---

# 11. Section Header Pattern

Use:

```text
REPORT
Why this was reported
```

or:

```text
REPORTED CONTENT
Tip at the time of report
```

Pattern:

```text
small uppercase kicker
main section heading
```

Recommended kicker:

```css
font-size: 10px;
font-weight: 750;
letter-spacing: 0.08–0.1em;
text-transform: uppercase;
color: var(--ink-subtle);
```

Recommended heading:

```css
font-size: 16px;
font-weight: 650;
```

---

# 12. Report Context Section

The report itself should be shown inside a distinct card.

Do not render:

```text
Reason
Inaccurate information

Traveller's report
this is for testing purpose
```

as loose text.

Use a grouped card.

---

# 13. Report Context Card

Structure:

```text
┌─────────────────────────────────┐
│ ⚠  REASON                       │
│    Inaccurate information       │
├─────────────────────────────────┤
│ TRAVELLER'S REPORT              │
│ this is for testing purpose     │
└─────────────────────────────────┘
```

Recommended:

```css
border: 1px solid var(--border);
border-radius: 14–16px;
overflow: hidden;
```

---

# 14. Reason Row

Use a subtle tinted background:

```text
surface-soft
```

Optional warning icon:

```text
small circular icon
warning-soft background
```

This should visually separate:

```text
why the report exists
```

from:

```text
what the traveller wrote
```

---

# 15. Traveller Report Text

Recommended padding:

```text
16px
```

Recommended body style:

```css
font-size: 15px;
line-height: 1.7;
color: var(--ink);
```

Long report text should wrap naturally.

Do not truncate inside the drawer.

---

# 16. Reported Content Section

Use heading:

```text
REPORTED CONTENT
Tip at the time of report
```

Right side:

```text
Revision 1
```

Revision should be shown as a small pill.

---

# 17. Revision Badge

Recommended:

```css
border: 1px solid var(--brand-border);
background: var(--brand-faint);
color: var(--brand);
border-radius: var(--radius-pill);
font-size: 11px;
font-weight: 700;
```

Example:

```text
Revision 1
```

---

# 18. Tip Content Card

The reported tip should appear inside a card.

Structure:

```text
┌──────────────────────────────────────┐
│ GENERAL                    [Hidden]  │
├──────────────────────────────────────┤
│ General in Gokarn                    │
│ Trip date: September 2026            │
│                                      │
│ this is a test tip                   │
│                                      │
│ ───────────────────────────────────  │
│ T   Tim @explorer      View profile  │
│     Active account                   │
└──────────────────────────────────────┘
```

The goal is to visually represent the tip as content, not as metadata.

---

# 19. Tip Card Header

Left:

```text
GENERAL
```

Right:

```text
Hidden
```

For a reported historical revision, show the state that is relevant to moderation context.

Use:

```text
General
Transport
Stay
Food
Explore
```

with existing category styling where appropriate.

---

# 20. Tip Title

Recommended:

```css
font-size: 19–20px;
font-weight: 620;
line-height: 1.35;
```

Do not make it as large as a public detail page heading.

This is still an administrative review context.

---

# 21. Tip Metadata Strip

Place useful small metadata below the title.

Example:

```text
Trip date: September 2026
```

For categories where more metadata exists:

```text
Trip date
Price
Transport mode
Duration
```

Use compact inline metadata when possible.

Avoid turning every detail into a large stacked block.

---

# 22. Tip Body

Recommended:

```css
font-size: 15px;
line-height: 1.75;
color: var(--ink);
margin-top: 16–18px;
```

Full text should be visible.

No truncation.

---

# 23. Additional Facts

When category-specific details exist, display them in a compact facts grid below the main body.

Example:

```text
From              Calicut
To                Ooty
Transport         Bus
Boarding point    KSRTC stand
```

Desktop:

```text
2-column grid where practical
```

Mobile:

```text
1-column stack
```

---

# 24. Photos

If photos exist:

- show them inside the reported content card or directly below it
- use the existing TrailNote gallery component
- keep the revision-specific photo behavior already implemented

Do not mix reported revision photos with current revision photos.

---

# 25. Author Row

The author should appear as part of the content card rather than a separate large section.

Recommended:

```text
Avatar
Display name @username
Account status

View public profile
```

Example:

```text
T   Tim @explorer                    View public profile ↗
    Active account
```

This keeps author context visible without giving it excessive space.

---

# 26. Author Avatar

Use existing profile avatar patterns if available.

Fallback:

```text
initial in circular brand-soft avatar
```

Recommended size:

```text
34–38px
```

---

# 27. View Public Profile Link

Recommended:

```text
View public profile ↗
```

Use:

```css
color: var(--brand);
font-size: 12–13px;
font-weight: 650;
```

Desktop:

```text
right aligned
```

Mobile:

can move underneath author details if necessary.

---

# 28. Moderation History Section

Current history:

```text
Tip hidden · reason · date
```

is too compressed.

Use a timeline pattern.

---

# 29. Moderation Timeline

Example:

```text
●  Tip hidden
   The tip doesn't contain any useful information.
   19 Sep 2026
```

Use:

```text
small icon
action
reason
date
```

Recommended:

```text
Action -> strongest
Reason -> muted body
Date -> smallest
```

---

# 30. History Action Styling

Action:

```css
font-size: 13px;
font-weight: 650;
```

Reason:

```css
font-size: 13px;
color: var(--ink-muted);
```

Date:

```css
font-size: 11px;
color: var(--ink-subtle);
```

---

# 31. Multiple History Events

For multiple events:

```text
● Hide
│
● Restore
│
● Hide
```

Use a vertical timeline line if there are multiple items.

Do not create a full activity table.

---

# 32. Review Outcome Section

For resolved/dismissed reports, the final result should be visually easy to recognize.

Use a dedicated outcome card.

Example:

```text
┌─────────────────────────────────┐
│ ✓  Resolved      Tip hidden     │
│                                 │
│ The tip doesn't contain any     │
│ useful information.             │
│                                 │
│ Reviewed 19 Sep 2026            │
└─────────────────────────────────┘
```

---

# 33. Outcome Card

Recommended:

```css
border: 1px solid var(--brand-border);
background: var(--brand-faint);
border-radius: 14–16px;
padding: 16px;
```

For dismissed reports, use a neutral muted surface instead.

---

# 34. Outcome Hierarchy

Show:

```text
Resolved
Tip hidden
```

together at the top.

Then:

```text
moderator note
```

Then:

```text
reviewed date
```

Avoid repeating:

```text
Status
Resolution
Moderator note
Reviewed
```

as four separate label/value blocks when the report is already closed.

The redesigned card communicates the same information more efficiently.

---

# 35. Open Report State

For open reports, replace the outcome card with the action area.

Structure:

```text
Resolution note
[ textarea ]

[Issue fixed] [Dismiss report] [Hide current tip]
```

The action area should remain sticky.

---

# 36. Sticky Action Footer

For an open report:

```css
position: sticky;
bottom: 0;
```

Include:

```text
resolution note
buttons
```

Recommended:

```text
border-top
surface background
small shadow
```

Do not make the entire drawer footer visually heavy.

---

# 37. Action Button Hierarchy

For an edited report:

```text
Issue fixed        primary / normal
Dismiss report     secondary
Hide current tip   danger
```

For current revision:

```text
Dismiss report
Hide tip
```

Do not make all actions the same visual weight.

---

# 38. Destructive Action

Use:

```text
red / danger button
```

only for:

```text
Hide tip
Hide current tip
```

Do not use red styling for:

```text
Dismiss report
Issue fixed
```

---

# 39. Drawer Background

Use:

```text
var(--surface)
```

Do not add:

- gradients
- colored full-drawer backgrounds
- heavy shadows between every section
- unnecessary cards around every text block

Cards should be used only where they improve grouping.

---

# 40. Recommended Spacing

Drawer outer padding:

```text
24–28px desktop
20px mobile
```

Main section gap:

```text
28px
```

Card padding:

```text
14–18px
```

Small internal gap:

```text
6–10px
```

Do not use excessive 32–40px whitespace between every label and value.

---

# 41. Typography

Use existing Commissioner font.

Hierarchy:

```text
Drawer title       22–24px / 650
Section heading    16px / 650
Tip title          19–20px / 620
Body               14–15px
Metadata           12–13px
Kicker / labels    10–11px uppercase
```

The drawer should feel compact and operational.

---

# 42. Color Usage

Use existing TrailNote tokens:

```text
--surface
--surface-soft
--brand
--brand-soft
--brand-faint
--brand-border
--ink
--ink-muted
--ink-subtle
--border
--warning
--warning-soft
--danger
--danger-soft
```

Do not introduce a new color palette.

---

# 43. Borders

Recommended:

```text
1px solid var(--border)
```

Use borders to separate:

- report context card
- reported content card
- section boundaries
- sticky header/footer

Avoid heavy box shadows.

---

# 44. Shadows

Drawer:

```text
existing popover-style shadow
```

Sticky footer:

```text
very light upward shadow
```

Cards:

```text
no shadow by default
```

The design should feel clean, not elevated everywhere.

---

# 45. Mobile Behavior

At:

```text
<= 700px
```

drawer becomes:

```text
full width
```

Header:

```text
padding: ~20px
```

Body:

```text
padding: ~20px
```

Tip card remains full-width.

Author profile link may move below the identity row.

---

# 46. Small Mobile Width

At:

```text
<= 390px
```

Reduce:

- heading sizes slightly
- outer padding slightly
- section spacing slightly

Do not collapse information into unreadably small text.

---

# 47. Accessibility

Requirements:

- drawer has `role="dialog"`
- `aria-modal="true"`
- title referenced by `aria-labelledby`
- close button has accessible label
- status badges contain text
- timeline icons are decorative
- links use descriptive labels
- keyboard focus stays inside modal drawer
- Escape closes drawer
- closing returns focus to Review button
- action buttons meet minimum touch size
- no essential information relies only on color

---

# 48. Existing React Structure

The current component already contains most of the required information.

Prefer restructuring existing markup rather than rewriting logic.

Recommended component breakdown:

```text
ReportReviewDrawer
├── DrawerHeader
├── ReportContextCard
├── RevisionWarning
├── VersionSwitcher
├── ModerationTipCard
│   ├── TipMeta
│   ├── TipFacts
│   ├── PhotoGallery
│   └── AuthorRow
├── ModerationTimeline
├── ReviewOutcomeCard
└── ReviewActionFooter
```

These can be local subcomponents inside:

```text
report-review-drawer.tsx
```

They do not need separate files unless the component becomes too large.

---

# 49. Recommended Existing Class Replacement

Current classes such as:

```text
moderation-review-section
moderation-review-content
moderation-review-meta-list
```

can be retained where practical.

However, introduce more specific semantic classes for the new layout:

```text
moderation-review-header
moderation-report-card
moderation-tip-review-card
moderation-tip-review-head
moderation-tip-review-body
moderation-author-row
moderation-timeline
moderation-timeline-item
moderation-outcome-card
```

Do not rename everything purely for cosmetic reasons.

---

# 50. Open vs Closed Drawer

## Open report

Show:

```text
header
report context
revision information
tip content
history
resolution textarea
actions
```

## Resolved / dismissed report

Show:

```text
header
report context
revision information
tip content
history
outcome card
```

Do not show inactive textareas/buttons for closed reports.

---

# 51. Revision-Aware State

When the report is against an older revision, keep the already-implemented:

```text
Reported version
Current version
```

selector.

Place it between:

```text
report context
```

and:

```text
tip content
```

Use segmented controls/tabs matching existing TrailNote styling.

---

# 52. Revision Warning

Keep the existing warning.

Example:

```text
This tip was edited after it was reported.

The report applies to Revision 1.
Travellers currently see Revision 2.
```

Visually:

```text
warning-soft background
warning icon
border
```

Do not hide this information inside the tip card.

---

# 53. Design Principles

The final UI should follow these rules:

### Group related information

Report details belong together.

Tip content belongs together.

History belongs together.

Outcome belongs together.

---

### Reduce repeated labels

Avoid excessive:

```text
STATUS
RESOLUTION
MODERATOR NOTE
REVIEWED
```

when the same information can be communicated clearly in one outcome card.

---

### Use stronger hierarchy, not more decoration

Do not solve readability by adding:

- more colors
- more shadows
- more cards
- larger text everywhere

Use:

- grouping
- spacing
- alignment
- typography
- section borders

---

### Keep moderation operational

This is not a marketing page.

It should feel:

```text
clear
compact
calm
trustworthy
easy to scan
```

---

# 54. Implementation Scope

This redesign should modify only the moderation drawer UI and relevant styles.

Do not change:

- report semantics
- revision rules
- moderation server actions
- public tip UI
- contributor account UI
- moderation table behavior unless required for drawer presentation

---

# 55. Acceptance Criteria

The redesign is complete when:

- [ ] Header clearly shows report status and tip status.
- [ ] Report context is grouped in a distinct card.
- [ ] Traveller report text is easy to read.
- [ ] Reported content appears as a recognizable tip card.
- [ ] Revision is visible without dominating the layout.
- [ ] Author context is compact and integrated into the tip card.
- [ ] Moderation history is presented as a timeline/activity list.
- [ ] Closed report outcome is displayed as a concise outcome card.
- [ ] Open report actions remain sticky and easy to reach.
- [ ] Drawer contains less unnecessary vertical whitespace.
- [ ] Visual hierarchy is clear at first glance.
- [ ] Existing TrailNote colors and typography are preserved.
- [ ] Desktop and mobile layouts both work.
- [ ] Keyboard accessibility is preserved.
- [ ] Existing moderation logic continues to work unchanged.

---

# 56. Reference

Use the provided HTML as the visual reference:

```text
trailnote-moderation-drawer-redesign.html
```

Do not copy the HTML blindly.

Implement the design using the existing TrailNote React components, CSS tokens, moderation logic, and accessibility patterns.
