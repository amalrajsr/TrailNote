# TrailNote `/me` Profile UI — Exact HTML Parity Specification

## 1. Source of truth

For this implementation, the visual reference is:

```text
trailnote-profile-redesign.html
```

The HTML file is the **visual source of truth** for the `/me` page.

The current TrailNote `beta` branch remains the source of truth for:

- authentication
- data fetching
- profile update behavior
- profile image upload behavior
- validation
- contribution filtering
- tip editing/deleting
- routing
- accessibility behavior that already exists

The implementation must **not reinterpret the HTML design**. Do not use phrases such as “approximately”, “similar to”, “suggested”, or “reuse the current styling where possible” for elements whose appearance is defined by the reference HTML.

If the existing application component differs visually from the reference HTML, preserve its behavior but update its `/me`-specific presentation to match the reference.

---

# 2. Scope

This specification covers the visible `/me` experience shown in the reference HTML:

```text
profile card
profile identity
social links
profile metadata
profile actions
contributions heading
status filters
contribution cards
edit-profile modal
responsive behavior
```

The global TrailNote header can continue using the existing production component and routing behavior. Exact parity is primarily required for the content inside the page `<main>` and the edit-profile dialog.

---

# 3. Why the previous specification did not reproduce the HTML

The previous `ui-spec-profile.md` was structurally related to the HTML, but it was **not an exact implementation specification**.

The following differences are material and explain why an implementation based on that file can look different.

| Area | Reference HTML | Previous spec |
|---|---|---|
| Main content width | `1040px` max | `912px` max |
| Profile top accent | 4px green gradient strip | omitted |
| Profile grid | `96px 1fr auto`, `28px` gap | `auto 1fr auto`, `24px` gap |
| Avatar | 88px + 6px pale-green ring + 1px outer ring | plain 88px avatar |
| Name + username | same horizontal identity row | stacked hierarchy |
| Name size | 31px | 30px |
| Bio | 15px, `#33443a`, margin-top 13px | generic 16px/line-height 1.6 |
| Social links | bordered pill chips | lightweight text links |
| Profile metadata | tips + places + join year | tips + published count |
| Edit button | compact 44px secondary button | reused generic app button |
| Contribution heading | 27px + explanatory copy | 24px, copy omitted from main example |
| Gap above contributions | 42px | 32–40px / 36px |
| Filter UI | borderless rounded tabs, selected pale green | reuse existing outlined pill tabs |
| Filter toolbar | bottom divider | not specified |
| Contribution cards | redesigned compact cards | explicitly told to keep existing cards |
| Tip body | 2-line clamp | existing 3-line clamp |
| Edit/Delete controls | compact 36px buttons | existing larger buttons |
| Edit dialog width | 620px | 540px |
| Edit dialog avatar | 72px | 88px |
| Mobile layout | exact 860px + 620px breakpoints | generic vertical layout |

Therefore the previous file should **not** be used when exact visual parity with the HTML is required.

---

# 4. Existing code that must be preserved functionally

Current relevant files:

```text
app/me/page.tsx
src/components/account/profile-editor.tsx
src/components/account/contributions.tsx
src/components/profiles/avatar.tsx
src/components/shell/user-menu.tsx
app/globals.css
src/styles/tokens.css
```

Keep the existing functionality from these files.

## `/me` server behavior

`app/me/page.tsx` should continue to:

- call `viewer()`
- redirect unauthenticated users
- read `status` from query params
- call `accountContributions(...)`
- derive All / Published / Hidden counts
- render filtered tips server-side

Do not convert status filtering to local React state.

Routes remain:

```text
/me
/me?status=published
/me?status=hidden
```

## Profile editor behavior

Preserve:

- `updateOwnProfile`
- `useActionState`
- avatar normalization
- `/api/uploads`
- replace/remove image behavior
- validation errors
- focus first invalid field
- success/error toasts
- `router.refresh()`

## Contribution behavior

Preserve:

- read published tip
- edit
- delete
- delete confirmation
- status labels
- destination links

Only presentation is being changed.

---

# 5. Page width and vertical spacing

The reference HTML uses:

```css
main {
  width: min(1040px, calc(100% - 48px));
  margin: 0 auto;
  padding: 48px 0 64px;
}
```

The `/me` content must therefore use a maximum width of **1040px**, not the existing 912px profile-page width.

Equivalent TrailNote implementation:

```css
.account-page {
  width: min(1040px, calc(100% - 48px));
  margin-inline: auto;
  padding-top: 48px;
  padding-bottom: 64px;
}
```

If `.page-top` currently adds conflicting spacing, override it specifically for `.account-page`.

Do not alter the global `.container` width.

---

# 6. Profile card — exact desktop layout

The top profile area must render as a single card.

```css
.account-profile-header {
  position: relative;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  gap: 28px;
  align-items: start;

  padding: 32px;
  overflow: hidden;

  border: 1px solid var(--border);
  border-radius: var(--radius-feature);
  background: var(--surface);
  box-shadow: var(--shadow-card);
}
```

Do not use:

```text
brand-faint background
nested profile card
two-column hero
generic "Profile" heading
```

---

# 7. Profile card top accent

The reference HTML has a 4px decorative gradient across the top edge.

This was missing from the previous spec and must be implemented.

```css
.account-profile-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--brand),
    #5f8a70 55%,
    #b8cdbd
  );
}
```

Do not replace it with a solid border.

---

# 8. Avatar — exact appearance

Reuse the existing:

```tsx
<ProfileAvatar />
```

but apply a `/me`-specific class so the visual appearance matches the mockup.

Desktop:

```css
.account-profile-header-avatar {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;

  border: 6px solid var(--brand-faint);
  border-radius: 50%;

  background: var(--brand);
  color: var(--on-brand);

  font-size: 30px;
  font-weight: 700;

  box-shadow: 0 0 0 1px var(--brand-border);
}
```

For image avatars, preserve:

```css
.profile-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

The pale-green inner ring and subtle outer ring are part of the reference appearance and should not be omitted.

---

# 9. Identity row

The name and username appear on the **same row on desktop**.

Required structure:

```tsx
<div className="account-profile-identity-row">
  <h1>{name}</h1>
  <span className="profile-handle">@{username}</span>
</div>
```

Exact desktop styling:

```css
.account-profile-identity-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.account-profile-name {
  font-size: 31px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.8px;
}

.account-profile-identity-row .profile-handle {
  color: var(--ink-muted);
  font-size: 14px;
  font-weight: 500;
}
```

Do not stack username under the name on desktop.

---

# 10. Bio

The reference uses:

```css
.account-profile-bio {
  max-width: 640px;
  margin-top: 13px;
  color: #33443a;
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
}
```

The bio must remain fully readable.

Do not clamp it.

If no bio exists, omit the element and allow the social/meta sections to move upward naturally.

---

# 11. Social links — pill treatment

The reference HTML does **not** use bare text links.

Instagram and YouTube appear as small bordered pills with an icon and external-link icon.

Required structure:

```text
[ Instagram ↗ ] [ YouTube ↗ ]
```

Exact styling:

```css
.account-profile-socials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 17px;
}

.account-profile-social-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;

  min-height: 36px;
  padding: 7px 11px;

  border: 1px solid var(--border);
  border-radius: var(--radius-pill);

  background: #fbfdfb;
  color: #345344;

  font-size: 13px;
  font-weight: 600;

  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.account-profile-social-link:hover {
  border-color: var(--brand-border);
  background: var(--brand-faint);
}
```

Use Lucide icons or equivalent existing icon components instead of embedding raw SVGs if that is consistent with TrailNote.

External links must retain:

```html
target="_blank"
rel="noopener noreferrer nofollow ugc"
```

---

# 12. Profile metadata

The reference HTML visually uses **three inline metadata items** separated by tiny dots:

```text
12 tips shared · 8 places · Joined TrailNote in 2026
```

Exact style:

```css
.account-profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 21px;

  color: var(--ink-muted);
  font-size: 13px;
}

.account-profile-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.account-profile-meta > span + span::before {
  content: "";
  width: 3px;
  height: 3px;
  margin: 0 12px;
  border-radius: 50%;
  background: #a8b4ac;
}

.account-profile-meta strong {
  color: var(--ink);
  font-weight: 650;
}
```

## Data mapping

The reference content is:

```text
tips shared
places
joined year
```

### Tips shared

Use:

```ts
allTips.length
```

### Places

Can be derived from currently fetched contributions without a new API if the destination slug is present:

```ts
const placeCount = new Set(
  allTips.map((tip) => tip.destination.slug)
).size;
```

### Joined year

Do not invent a year.

Use the actual account creation timestamp if it is already available from the authenticated user/query layer.

If the current `viewer()` result does not expose a creation timestamp, either:

1. expose the existing persisted creation timestamp safely, or
2. temporarily omit only the joined item.

If that item is omitted, preserve the same metadata styling for the remaining items.

Do **not** replace the HTML's `places` item with `published` merely because the current page already calculates a published count. That changes the reference design/content.

---

# 13. Profile actions — exact layout

Desktop:

```css
.account-profile-owner-actions {
  min-width: 170px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
```

The order is:

```text
[ Edit profile ]
View public profile ↗
```

## Edit Profile button

Visual target:

```css
.account-profile-edit {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  padding: 10px 15px;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);

  background: var(--surface);
  color: var(--ink);

  font-size: 13px;
  font-weight: 650;
}
```

Hover:

```css
.account-profile-edit:hover {
  border-color: var(--brand-border);
  background: var(--brand-faint);
}
```

Use the existing edit-profile dialog trigger behavior.

Do not change the global `.btn.secondary` if doing so would affect unrelated pages. Scope the styling to `/me`.

## View public profile

```css
.account-public-profile-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  min-height: 40px;

  color: var(--ink-muted);
  font-size: 13px;
  font-weight: 550;

  border-radius: 10px;
}

.account-public-profile-link:hover {
  color: var(--brand);
  background: var(--brand-faint);
}
```

Route remains:

```text
/users/[id]
```

---

# 14. Sign out

Do not render Sign Out inside the profile card.

The navbar account menu already contains Sign Out.

Remove the page-level:

```tsx
<AccountSignOut />
```

If this makes `AccountSignOut` unused, remove the dead component/imports.

---

# 15. Contributions heading — exact layout

The reference starts the contribution section **42px below** the profile card on desktop.

```css
.account-contributions-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 42px;
}
```

Left side:

```text
YOUR TRAILNOTES
Your contributions
Manage the practical tips you have shared with other travellers.
```

## Kicker

```css
.account-section-kicker {
  color: var(--brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
```

## Heading

```css
.account-contributions-head h2 {
  margin-top: 4px;
  font-size: 27px;
  line-height: 1.25;
  font-weight: 650;
  letter-spacing: -0.5px;
}
```

## Description

```css
.account-contributions-description {
  margin-top: 5px;
  color: var(--ink-muted);
  font-size: 14px;
}
```

Exact copy:

```text
Manage the practical tips you have shared with other travellers.
```

---

# 16. Share a tip button

Desktop placement:

- right aligned in the contributions heading row
- not inside the filter toolbar

Route:

```text
/search
```

Visual target:

```css
.account-share-tip {
  min-height: 44px;
  padding: 10px 15px;
  gap: 8px;

  border-radius: var(--radius-control);
  background: var(--brand);
  color: var(--on-brand);

  font-size: 13px;
  font-weight: 650;
}
```

Use `Plus` at approximately 16px.

---

# 17. Filter toolbar — exact design

The HTML redesign uses a different filter treatment from the current global `.tabs`.

Do **not** simply reuse the current outlined pill `.tabs` styling.

Wrap the filters in:

```css
.account-filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  margin: 22px 0 18px;
  padding-bottom: 14px;

  border-bottom: 1px solid var(--border);
}
```

Filter container:

```css
.account-tabs {
  display: flex;
  align-items: center;
  gap: 4px;

  overflow-x: auto;
  scrollbar-width: none;
}

.account-tabs::-webkit-scrollbar {
  display: none;
}
```

Each filter:

```css
.account-tabs > a {
  min-height: 40px;

  display: inline-flex;
  align-items: center;
  gap: 7px;

  padding: 8px 12px;

  border: 0;
  border-radius: 10px;

  background: transparent;
  color: var(--ink-muted);

  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
```

Hover:

```css
.account-tabs > a:hover {
  background: var(--surface-soft);
  color: var(--ink);
}
```

Selected:

```css
.account-tabs > a.selected {
  background: var(--brand-soft);
  color: var(--brand);
}
```

Do not use:

```text
solid green selected tab
outlined pill tabs
999px tab radius
```

for this page.

---

# 18. Filter count badges

Exact target:

```css
.account-tab-count {
  min-width: 20px;
  height: 20px;

  display: grid;
  place-items: center;

  padding-inline: 5px;

  border-radius: var(--radius-pill);
  background: rgb(255 255 255 / 65%);

  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
```

---

# 19. Contribution list spacing

```css
.account-contributions {
  display: grid;
  gap: 14px;
}
```

This matches both the reference and the current general card rhythm.

---

# 20. Contribution cards — match the reference HTML

The previous spec incorrectly said to leave the current card presentation unchanged.

The reference HTML contains a more compact card and must be treated as the target for `/me`.

Preserve current card **behavior**, but update `/me` styling.

## Card

```css
.account-tip-card {
  padding: 23px 24px;

  border: 1px solid var(--border);
  border-radius: var(--radius-card);

  background: var(--surface);
  box-shadow: var(--shadow-card);

  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.account-tip-card:hover {
  border-color: var(--brand-border);
  box-shadow: 0 10px 28px rgb(23 37 29 / 8%);
}
```

## Top row

```css
.account-tip-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}
```

## Destination

```css
.account-destination {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  color: var(--brand);

  font-size: 13px;
  font-weight: 650;
}
```

## Status

```css
.account-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  min-height: 27px;
  padding: 4px 9px;

  border-radius: var(--radius-pill);

  font-size: 11px;
  font-weight: 650;
}
```

Published:

```css
background: var(--success-soft);
color: var(--success);
```

Hidden:

```css
background: var(--warning-soft);
color: var(--warning);
```

Deleted can continue using the existing danger treatment.

## Category

Reference visual style:

```css
.account-category-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  color: #697a70;

  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
```

The reference HTML shows plain category text without a visible category icon.

For exact parity, omit the category icon on `/me`.

If the product intentionally wants to retain `CategoryIcon`, then the HTML reference must be updated as well; do not silently keep the icon and claim parity.

## Title

Keep semantic heading structure as appropriate, but render visually as:

```css
.account-tip-card h2 {
  margin-top: 7px;
  font-size: 21px;
  line-height: 1.35;
  font-weight: 650;
  letter-spacing: -0.3px;
}
```

## Body

```css
.account-tip-copy {
  display: -webkit-box;
  max-width: 780px;

  margin-top: 8px;
  overflow: hidden;

  color: var(--ink-muted);
  font-size: 14px;
  line-height: 1.7;

  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
```

This is a **2-line clamp**, not the current 3-line clamp.

---

# 21. Contribution card footer

Exact layout:

```css
.account-tip-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  margin-top: 18px;
  padding-top: 16px;

  border-top: 1px solid #edf1ee;
}
```

Read link:

```css
.account-read-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  color: var(--brand);

  font-size: 13px;
  font-weight: 650;
}
```

Edit/Delete group:

```css
.account-tip-row-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
```

Compact action buttons:

```css
.account-tip-small-action {
  min-height: 36px;

  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 7px 10px;

  border: 1px solid var(--border);
  border-radius: 9px;

  background: var(--surface);
  color: var(--ink-muted);

  font-size: 12px;
  font-weight: 600;
}
```

Delete hover:

```css
.account-tip-small-action.delete:hover {
  background: var(--danger-soft);
  border-color: #f0c6c1;
  color: var(--danger);
}
```

Preserve the existing delete confirmation dialog behavior.

---

# 22. Edit profile modal — exact size

The previous spec incorrectly preserved the current 540px dialog.

The reference HTML uses:

```css
.profile-dialog {
  width: min(620px, 100%);
  max-height: min(760px, calc(100vh - 48px));

  overflow: auto;

  border-radius: 22px;
  background: var(--surface);

  box-shadow: 0 24px 70px rgb(23 37 29 / 24%);
}
```

At the overlay level:

```css
.profile-dialog-backdrop {
  padding: 24px;
  background: rgb(23 37 29 / 52%);
}
```

If the shared `Dialog` primitive already supplies the backdrop, do not replace its behavior; apply `/me`-specific sizing and surface styles to the dialog content.

---

# 23. Edit modal header

Target:

```css
.profile-dialog-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;

  padding: 24px 26px 20px;

  border-bottom: 1px solid var(--border);
}
```

Heading:

```css
font-size: 23px;
font-weight: 650;
```

Description:

```css
margin-top: 4px;
color: var(--ink-muted);
font-size: 13px;
```

Copy remains:

```text
Your profile details and image appear publicly with your tips.
```

Close button target:

```text
38px × 38px
10px radius
transparent background
muted icon
surface-soft hover
```

If the shared `Dialog` already renders a close control, style it rather than introducing a duplicate.

---

# 24. Edit modal body

```css
.profile-dialog-body {
  padding: 24px 26px 26px;
}
```

## Avatar row

Reference modal avatar is **72px**, not 88px.

```css
.profile-photo-field {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 23px;
}

.profile-editor-avatar {
  width: 72px;
  height: 72px;
  font-size: 24px;
}
```

If the same ring treatment from the profile header is reused:

```text
5px pale-green ring
```

The image selection button target is approximately 39px high.

---

# 25. Edit modal fields

Field vertical spacing:

```css
.profile-form .field {
  margin-top: 17px;
}
```

Labels:

```css
font-size: 13px;
font-weight: 650;
margin-bottom: 6px;
```

Inputs:

```css
.profile-form input {
  height: 46px;
  padding: 10px 12px;

  border: 1px solid #aab5ae;
  border-radius: 11px;

  background: var(--surface);
  color: var(--ink);
}
```

Textarea:

```css
.profile-form textarea {
  min-height: 96px;
  padding: 10px 12px;

  border: 1px solid #aab5ae;
  border-radius: 11px;

  resize: vertical;
}
```

Focus:

```css
border-color: var(--brand);
box-shadow: 0 0 0 3px rgb(36 92 67 / 12%);
```

Helper text:

```css
margin-top: 5px;
color: var(--ink-muted);
font-size: 11px;
```

---

# 26. Form sections

```css
.profile-form-section {
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
}

.profile-form-section h3 {
  font-size: 15px;
  font-weight: 650;
}

.profile-form-section > .profile-section-helper {
  margin-top: 3px;
  color: var(--ink-muted);
  font-size: 12px;
}
```

Modal actions:

```css
.profile-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 26px;
}
```

Preserve current Cancel / Save behavior.

---

# 27. Responsive breakpoint 1 — `max-width: 860px`

This breakpoint must match the reference HTML.

```css
@media (max-width: 860px) {
  .account-page {
    width: min(calc(100% - 32px), 760px);
    padding-top: 28px;
  }

  .account-profile-header {
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 20px;
    padding: 26px;
  }

  .account-profile-header-avatar {
    width: 72px;
    height: 72px;
    font-size: 24px;
  }

  .account-profile-owner-actions {
    grid-column: 2;
    min-width: 0;
    flex-direction: row;
    align-items: center;
  }

  .account-profile-edit {
    min-width: 130px;
  }

  .account-contributions-head {
    margin-top: 34px;
  }
}
```

At this width, the page does **not** become fully vertical.

The avatar stays in column 1 and identity/actions stay primarily in column 2.

---

# 28. Responsive breakpoint 2 — `max-width: 620px`

Exact reference behavior:

```css
@media (max-width: 620px) {
  .account-page {
    width: calc(100% - 28px);
    padding: 20px 0 40px;
  }

  .account-profile-header {
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 15px;

    padding: 22px 18px 20px;

    border-radius: 20px;
  }

  .account-profile-header-avatar {
    width: 56px;
    height: 56px;
    border-width: 4px;
    font-size: 20px;
  }

  .account-profile-name {
    font-size: 24px;
  }

  .account-profile-identity-row .profile-handle {
    width: 100%;
    margin-top: 1px;
  }

  .account-profile-bio {
    grid-column: 1 / -1;
    margin-top: 14px;
    font-size: 14px;
  }

  .account-profile-socials,
  .account-profile-meta {
    grid-column: 1 / -1;
  }

  .account-profile-content {
    display: contents;
  }

  .account-profile-identity-row {
    align-self: center;
  }

  .account-profile-owner-actions {
    grid-column: 1 / -1;

    display: grid;
    grid-template-columns: 1fr 1fr;

    margin-top: 4px;
  }

  .account-profile-edit {
    min-width: 0;
  }

  .account-public-profile-link {
    border: 1px solid var(--border);
  }

  .account-contributions-head {
    align-items: start;
    margin-top: 30px;
  }

  .account-contributions-head h2 {
    font-size: 24px;
  }

  .account-filter-toolbar {
    margin-top: 17px;
  }

  .account-tip-card {
    padding: 19px 17px;
  }

  .account-tip-topline {
    align-items: start;
  }

  .account-tip-card h2 {
    font-size: 19px;
  }

  .account-tip-actions {
    align-items: flex-start;
  }

  .account-tip-small-action span {
    display: none;
  }
}
```

Important: the reference mobile layout does **not** put the avatar on a separate full-width row above the identity.

---

# 29. Mobile Share a tip behavior

The reference HTML hides the heading-level `Share a tip` button below 620px:

```css
.account-contributions-head .account-share-tip {
  display: none;
}
```

However, the mockup CSS contains a `.share-mobile` rule without a corresponding element in the HTML markup.

That is an inconsistency in the reference file.

For production, use one of these approaches:

### Preferred

Keep a mobile Share a tip CTA visible below the filters or heading:

```tsx
<Link className="btn account-share-tip-mobile" href="/search">
  <Plus ... />
  Share a tip
</Link>
```

and show it only under 620px.

### If strict screenshot parity is required

Hide the desktop CTA under 620px and do not render another CTA.

This is the only known internal inconsistency in the reference HTML.

---

# 30. Empty states

The reference HTML does not demonstrate the empty state.

Preserve the current production empty-state functionality and copy.

Do not allow the empty-state UI to alter the profile-card design.

---

# 31. Accessibility

Preserve or improve the current semantics.

Required:

- `<h1>` remains the user's display name
- status filtering remains link-based because filtering changes the URL
- active filter uses `aria-current="page"`
- filter nav uses `aria-label="Tip status"`
- decorative icons use `aria-hidden`
- social links include understandable visible labels
- dialog preserves focus trapping / Escape close behavior from shared `Dialog`
- field errors stay associated with inputs
- upload status remains announced
- keyboard focus remains visible

The standalone HTML uses `role="tablist"` for its JavaScript demo, but the production app should keep semantic navigation links because each state maps to a URL.

Visual styling must still match the HTML.

---

# 32. Do not change global design tokens just to match this page

The reference HTML uses the same base TrailNote palette.

Continue using:

```css
--canvas: #f7faf7;
--surface: #ffffff;
--surface-soft: #f0f4f0;

--ink: #17251d;
--ink-muted: #5c6c62;
--ink-subtle: #7a887f;

--brand: #245c43;
--brand-hover: #1b4c36;
--brand-soft: #e6f1e9;
--brand-faint: #f0f7f2;
--brand-border: #c9ddcf;

--border: #dce4dd;
--danger: #b42318;
--danger-soft: #fff0ed;
--success: #245c43;
--success-soft: #e6f1e9;
--warning: #866313;
--warning-soft: #fbf3d8;

--radius-control: 12px;
--radius-card: 18px;
--radius-feature: 26px;
--radius-pill: 999px;
```

Add scoped hard-coded reference values only where the mockup intentionally uses them:

```text
#33443a
#345344
#697a70
#a8b4ac
#aab5ae
#edf1ee
#f0c6c1
#5f8a70
#b8cdbd
```

Do not globally redefine TrailNote tokens.

---

# 33. Recommended component split

The current `AccountProfileEditor` owns both display and edit behavior.

For this redesign, a cleaner split is:

```text
src/components/account/
├── profile-header.tsx
├── profile-editor.tsx
└── contributions.tsx
```

Recommended responsibilities:

## `profile-header.tsx`

Render:

- avatar
- name
- username
- bio
- social pills
- metadata
- Edit Profile trigger
- public-profile link

## `profile-editor.tsx`

Keep:

- modal
- form
- upload workflow
- validation
- save/cancel

## `contributions.tsx`

Keep current behavior but apply the exact `/me` card styling described above.

This split is recommended but not required for visual parity.

---

# 34. Suggested `/me` page structure

```tsx
<main id="main" className="account-page">
  <AccountProfileHeader
    id={user.id}
    name={user.name}
    username={user.username}
    avatar={user.avatar}
    bio={user.bio}
    instagramUrl={user.instagramUrl}
    youtubeUrl={user.youtubeUrl}
    totalTips={allTips.length}
    placeCount={placeCount}
    joinedYear={joinedYear}
  />

  <section
    className="account-contribution-section"
    aria-labelledby="your-contributions"
  >
    <div className="account-contributions-head">
      <div>
        <p className="account-section-kicker">Your TrailNotes</p>
        <h2 id="your-contributions">Your contributions</h2>
        <p className="account-contributions-description">
          Manage the practical tips you have shared with other travellers.
        </p>
      </div>

      <Link className="btn account-share-tip" href="/search">
        <Plus size={16} aria-hidden="true" />
        Share a tip
      </Link>
    </div>

    <div className="account-filter-toolbar">
      <nav className="account-tabs" aria-label="Tip status">
        ...
      </nav>
    </div>

    <MyContributions tips={tips} />
  </section>
</main>
```

---

# 35. Profile header structure

Recommended production JSX:

```tsx
<header className="account-profile-header">
  <ProfileAvatar
    name={name}
    avatar={avatar}
    className="account-profile-header-avatar"
    sizes="88px"
  />

  <div className="account-profile-content">
    <div className="account-profile-identity-row">
      <h1 className="account-profile-name">{name}</h1>
      <span className="profile-handle">@{username}</span>
    </div>

    {bio && (
      <p className="account-profile-bio">
        {bio}
      </p>
    )}

    {(instagramUrl || youtubeUrl) && (
      <div
        className="account-profile-socials"
        aria-label="Social profiles"
      >
        ...
      </div>
    )}

    <div
      className="account-profile-meta"
      aria-label="Contribution summary"
    >
      <span>
        <strong>{totalTips}</strong> tips shared
      </span>

      <span>
        <strong>{placeCount}</strong> places
      </span>

      {joinedYear && (
        <span>Joined TrailNote in {joinedYear}</span>
      )}
    </div>
  </div>

  <div className="account-profile-owner-actions">
    <ProfileEditTrigger />

    <Link
      className="account-public-profile-link"
      href={`/users/${id}`}
    >
      View public profile
      <ArrowUpRight size={13} aria-hidden="true" />
    </Link>
  </div>
</header>
```

---

# 36. Implementation rules for AI coding agents

When this specification and the HTML are supplied to an implementation agent, use this instruction:

> Treat `trailnote-profile-redesign.html` as the visual source of truth for `/me`. Match its layout, spacing, dimensions, typography, border treatments, responsive breakpoints, tabs, contribution-card presentation, and edit-profile dialog. Preserve the current beta branch behavior and data flow. Do not preserve an existing style merely because it already exists if the HTML visibly changes that style. Do not reinterpret measurements as approximate. When an existing shared component is behaviorally useful but visually different, reuse its logic and apply `/me`-scoped styling rather than globally changing unrelated pages.

The agent should **not** be told:

```text
"don't blindly copy the HTML"
"approximately match the mockup"
"reuse current styling"
"the exact component structure is flexible"
```

without also making clear that the rendered appearance must match the reference.

---

# 37. Visual parity checklist

Before accepting the implementation, compare it side-by-side with the reference HTML at the same viewport size.

## Desktop

Verify:

```text
[ ] main content width is 1040px max
[ ] profile card has 4px gradient strip
[ ] profile card padding is 32px
[ ] grid uses 96px / flexible / actions
[ ] column gap is 28px
[ ] avatar is 88px with pale ring
[ ] name and username are inline
[ ] name appears at 31px
[ ] bio appears at 15px
[ ] social links are bordered pills
[ ] metadata uses small dot separators
[ ] edit button is compact secondary
[ ] public-profile link is below it
[ ] contribution section begins 42px below
[ ] contribution title is 27px
[ ] helper sentence is visible
[ ] filters are borderless rectangular tabs
[ ] active filter uses pale green, not solid green
[ ] filter toolbar has bottom divider
[ ] cards are compact
[ ] card title is 21px
[ ] body is clamped to two lines
[ ] Edit/Delete are compact 36px controls
[ ] edit dialog is 620px wide
[ ] modal avatar is 72px
```

## Tablet ≤ 860px

Verify:

```text
[ ] profile remains a 2-column avatar/content layout
[ ] avatar becomes 72px
[ ] actions move under content, not under whole card
[ ] actions become horizontal
[ ] page width caps at 760px
```

## Mobile ≤ 620px

Verify:

```text
[ ] profile grid remains avatar + identity at top
[ ] avatar is 56px
[ ] username wraps below name
[ ] bio spans full card width
[ ] socials span full card width
[ ] metadata spans full card width
[ ] action buttons form 2 equal columns
[ ] public-profile action has border
[ ] profile card padding is 22px 18px 20px
[ ] tip card padding is 19px 17px
[ ] title is 19px
[ ] Edit/Delete text is hidden, icons remain
[ ] dialog behaves as a bottom sheet
```

---

# 38. Regression checklist

Functional behavior must continue to work after visual changes:

```text
[ ] unauthenticated /me redirects to sign-in
[ ] profile image displays correctly
[ ] initial avatar fallback works
[ ] edit dialog opens
[ ] display name saves
[ ] username saves
[ ] username validation error displays
[ ] bio saves
[ ] Instagram saves
[ ] YouTube saves
[ ] avatar upload works
[ ] avatar replace works
[ ] avatar remove works
[ ] failed upload shows error
[ ] success closes dialog and refreshes data
[ ] All filter works
[ ] Published filter works
[ ] Hidden filter works
[ ] filter URLs remain correct
[ ] public profile link works
[ ] Share a tip routes to /search
[ ] Read tip works
[ ] Edit tip works
[ ] Delete tip confirmation works
[ ] deleted state remains handled
[ ] navbar Sign out still works
```

---

# 39. Final acceptance rule

The implementation should only be considered complete when:

> At the same viewport width, the `/me` page can be placed beside `trailnote-profile-redesign.html` and the major geometry, spacing, typography, card treatment, tabs, profile actions, and dialog appearance are visually equivalent.

Functional differences required by the production Next.js application are acceptable.

Unexplained visual differences are not.
