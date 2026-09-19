# TrailNote Public Profile Redesign — Exact Implementation Specification

## 1. Source of truth

The visual source of truth for the public contributor profile is:

```text
trailnote-public-profile-redesign.html
```

The latest `beta` branch is the source of truth for behavior, data access, routing, validation, pagination, shared shell/header behavior, and contribution DTOs.

Target route:

```text
/users/[id]
```

The rendered page should visually match the HTML reference. Existing logic should be preserved where possible, but existing public-profile styling should **not** be preserved when it conflicts with the reference.

---

# 2. Current beta branch — what was identified

The current public profile is still using the older profile design even though `/me` has already moved to the new profile system.

Current files reviewed:

```text
app/users/[id]/page.tsx
app/me/page.tsx
src/components/account/profile-editor.tsx
src/components/account/contributions.tsx
src/components/contributions/card.tsx
src/components/contributions/homepage-card.tsx
src/components/profiles/avatar.tsx
src/server/queries/profiles.ts
src/styles/tokens.css
app/globals.css
src/components/shell/header.tsx
src/components/shell/user-menu.tsx
```

## Current mismatch

The updated `/me` page now uses:

```text
1040px content width
white profile card
4px green gradient accent
ringed avatar
name + username inline
bio
pill-style social links
profile metadata
31px profile name
new mobile profile layout
```

The public profile still uses:

```text
820px content width
brand-faint green hero
simple flex row
"TrailNote contributor" eyebrow
plain avatar
stacked name/username
bare text social links
no contributor statistics
older responsive treatment
```

This makes the public page look like an older version of the product.

---

# 3. Product role of the public page

The public page should answer:

> Who shared this information, and what else have they contributed?

It should reinforce contributor trust without becoming a social-network profile.

Do not add:

```text
followers
following
DMs
likes received
reputation scores
leaderboards
badges that imply trust without evidence
```

Use factual contributor information only:

```text
profile image
display name
username
bio
Instagram / YouTube
published tip count
distinct places contributed to
join year
published travel tips
```

---

# 4. High-level layout

Desktop:

```text
┌────────────────────────────────────────────────────────────┐
│  [Avatar]   Amal @wanderlust                              │
│             Bio...                                        │
│             [ Instagram ↗ ] [ YouTube ↗ ]                 │
│             12 published tips · 8 places · Joined 2026    │
└────────────────────────────────────────────────────────────┘


SHARED TRAILNOTES
Tips from Amal
First-hand practical notes from places Amal has visited.
────────────────────────────────────────────────────────────

┌──────────────────────────┐  ┌──────────────────────────┐
│ TRANSPORT       Ooty     │  │ STAY           Hampi    │
│ Tip title...             │  │ Tip title...             │
│ facts                    │  │ price / facts            │
│ summary                  │  │ summary                  │
│ visited       freshness  │  │ visited       freshness  │
└──────────────────────────┘  └──────────────────────────┘

...
                     [ Older tips → ]
```

The identity block should visually belong to the same family as `/me`, while the lower section should be optimized for **browsing**, not management.

---

# 5. Do not reuse the current public hero

Remove the current structure/styling based around:

```text
.public-profile-page
.public-profile-hero
.public-profile-details
.public-profile-links
```

The current:

```tsx
<p className="eyebrow">TrailNote contributor</p>
```

should not be rendered in the redesigned identity card.

The contributor identity itself is sufficient context.

---

# 6. Main page width

The current public page uses:

```css
width: min(820px, calc(100% - 64px));
```

Replace it with the same desktop content width used by the new `/me` page.

Exact reference:

```css
.public-profile-page {
  width: min(1040px, calc(100% - 48px));
  margin-inline: auto;
  padding-top: 48px;
  padding-bottom: 64px;
}
```

Do not change the global `.container`.

If the JSX keeps both:

```tsx
className="container page-top public-profile-page"
```

the public-profile class must override conflicting width/padding.

---

# 7. Public identity card

Exact desktop geometry:

```css
.public-profile-card {
  position: relative;
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
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

Unlike `/me`, there is no third owner-actions column.

---

# 8. Gradient accent

Use the same top accent as the updated private profile.

```css
.public-profile-card::before {
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

This visual relationship is intentional: `/me` and `/users/[id]` should clearly be two views of the same contributor identity.

---

# 9. Avatar

Continue using:

```tsx
<ProfileAvatar />
```

Do not create a second image implementation.

Desktop:

```css
.public-profile-avatar {
  width: 88px;
  height: 88px;

  display: grid;
  place-items: center;
  overflow: hidden;

  border: 6px solid var(--brand-faint);
  border-radius: 50%;

  background: var(--brand);
  color: var(--on-brand);

  font-size: 30px;
  font-weight: 700;

  box-shadow: 0 0 0 1px var(--brand-border);
}
```

Keep the existing:

```css
.profile-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

# 10. Name + username

They must be inline on desktop.

Recommended JSX:

```tsx
<div className="public-profile-identity">
  <h1 className="public-profile-name">
    {profile.displayName}
  </h1>

  <span className="profile-handle">
    @{profile.username}
  </span>
</div>
```

Exact styling:

```css
.public-profile-identity {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.public-profile-name {
  font-size: 31px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.8px;
}

.public-profile-identity .profile-handle {
  color: var(--ink-muted);
  font-size: 14px;
  font-weight: 500;
}
```

---

# 11. Bio

```css
.public-profile-bio {
  max-width: 680px;
  margin-top: 13px;

  color: #33443a;

  font-size: 15px;
  line-height: 1.7;

  white-space: pre-line;
}
```

Do not clamp the bio.

If the user has no bio, omit the element completely.

---

# 12. Social links

The current public page uses bare text links.

Replace them with the same pill language as `/me`.

Container:

```css
.public-profile-socials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 17px;
}
```

Link:

```css
.public-profile-social-link {
  min-height: 36px;

  display: inline-flex;
  align-items: center;
  gap: 7px;

  padding: 7px 11px;

  border: 1px solid var(--border);
  border-radius: var(--radius-pill);

  background: #fbfdfb;
  color: #345344;

  font-size: 13px;
  font-weight: 600;
}
```

Hover:

```css
border-color: var(--brand-border);
background: var(--brand-faint);
```

Use the same Instagram/YouTube icons already implemented for the `/me` profile where practical.

Keep:

```html
target="_blank"
rel="noopener noreferrer nofollow ugc"
```

---

# 13. Contributor statistics

The current `publicProfile()` query does not provide aggregate public-profile statistics.

The redesigned page requires:

```text
published tip count
distinct public destination count
profile creation year
```

Display example:

```text
12 published tips · 8 places · Joined TrailNote in 2026
```

Do not display hidden/deleted contribution counts publicly.

Exact styling:

```css
.public-profile-meta {
  display: flex;
  flex-wrap: wrap;

  margin-top: 21px;

  color: var(--ink-muted);
  font-size: 13px;
}

.public-profile-meta > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.public-profile-meta > span + span::before {
  content: "";

  width: 3px;
  height: 3px;

  margin: 0 12px;

  border-radius: 50%;
  background: #a8b4ac;
}

.public-profile-meta strong {
  color: var(--ink);
  font-weight: 650;
}
```

---

# 14. Query changes in `src/server/queries/profiles.ts`

Current profile select already returns:

```text
id
displayName
username
bio
instagramUrl
youtubeUrl
avatar data
```

Add:

```ts
createdAt: s.profiles.createdAt
```

Then query public contribution stats using only:

```text
authorId = userId
contribution status = published
destination enabled = true
```

The statistics must follow the same visibility rules as the public tip list.

Conceptually:

```ts
const [stats] = await db
  .select({
    publishedTips: sql<number>`count(${s.contributions.id})`,
    places: sql<number>`count(distinct ${s.contributions.destinationId})`,
  })
  .from(s.contributions)
  .innerJoin(
    s.destinations,
    and(
      eq(s.destinations.id, s.contributions.destinationId),
      eq(s.destinations.enabled, true),
    ),
  )
  .where(
    and(
      eq(s.contributions.authorId, userId),
      eq(s.contributions.status, "published"),
    ),
  );
```

Normalize SQLite count values to JavaScript numbers if required by the driver.

Return:

```ts
stats: {
  publishedTips: Number(stats?.publishedTips ?? 0),
  places: Number(stats?.places ?? 0),
},
joinedYear: new Date(profile.createdAt).getUTCFullYear(),
```

Do not count disabled destinations.

Do not count hidden/deleted tips.

---

# 15. Consistency fix for `/me`

The current beta implementation inside `AccountProfileEditor` contains:

```tsx
<span>Joined TrailNote in 2026</span>
```

This is hard-coded.

While exposing `createdAt` for the public page, the private profile should also eventually use the real creation year.

Do not copy the hard-coded `2026` pattern into the public profile.

This is a data-consistency fix, not a visual requirement.

---

# 16. Tips section spacing

Exact reference:

```css
.public-profile-tips {
  margin-top: 42px;
}
```

At tablet:

```css
margin-top: 34px;
```

At mobile:

```css
margin-top: 30px;
```

---

# 17. Section heading

Content:

```text
SHARED TRAILNOTES
Tips from {displayName}
First-hand practical notes from places {displayName} has visited.
```

Kicker:

```css
.public-profile-kicker {
  color: var(--brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
```

Heading:

```css
.public-profile-tips h2 {
  margin-top: 4px;

  font-size: 27px;
  line-height: 1.25;
  font-weight: 650;
  letter-spacing: -0.5px;
}
```

Supporting copy:

```css
.public-profile-tips-description {
  max-width: 620px;
  margin-top: 5px;

  color: var(--ink-muted);
  font-size: 14px;
}
```

---

# 18. Divider

A divider separates the heading from the card grid.

```css
.public-profile-divider {
  height: 1px;

  margin: 20px 0 18px;

  background: var(--border);
}
```

Mobile:

```css
margin-top: 17px;
```

---

# 19. Do not use the current generic `TipCard` unchanged

The public page currently renders:

```tsx
<TipCard key={tip.id} tip={tip} />
```

The current `TipCard` contains:

```text
author name + username
helpful action
still accurate action
generic feed metadata
```

On a contributor profile, repeating the same author on every card is redundant.

The profile page should instead use a browse-focused public-profile card.

Recommended new component:

```text
src/components/profiles/public-tip-card.tsx
```

or:

```text
src/components/contributions/public-profile-card.tsx
```

The component can reuse logic from `HomepageTipCard`, because `ContributionCardDTO` already includes:

```text
destination
category
title
body
price
details
visitedMonth
freshness
changeReported
photos
```

Do not create another server DTO unless genuinely necessary.

---

# 20. Public profile tip grid

Desktop:

```css
.public-profile-tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
```

At `720px` and below:

```css
grid-template-columns: 1fr;
```

This intentionally differs from `/me`.

`/me` is a management list.

`/users/[id]` is a discovery/browse page, so a two-column summary grid uses desktop space more efficiently.

---

# 21. Public tip card

Exact:

```css
.public-profile-tip-card {
  min-width: 0;

  display: flex;
  flex-direction: column;

  padding: 22px;

  border: 1px solid var(--border);
  border-radius: var(--radius-card);

  background: var(--surface);
  box-shadow: var(--shadow-card);

  transition:
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.public-profile-tip-card:hover {
  border-color: var(--brand-border);
  box-shadow: 0 10px 28px rgb(23 37 29 / 8%);
  transform: translateY(-1px);
}
```

The entire card should link to:

```text
/tips/[id]
```

Do not add edit/delete controls.

Do not repeat the contributor name.

---

# 22. Tip top row

```css
.public-profile-tip-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
```

Left:

```text
category
```

Right:

```text
destination · state
```

This is important because the user's public profile is primarily useful as a way to understand **where they have contributed**.

---

# 23. Category label

```css
.public-profile-tip-category {
  color: #697a70;

  font-size: 11px;
  line-height: 18px;
  font-weight: 700;

  letter-spacing: 0.7px;
  text-transform: uppercase;
}
```

For `general`, display:

```text
Quick tip
```

matching the homepage card language.

---

# 24. Destination

Use:

```ts
tip.destination.name
tip.destination.state
```

Exact visual target:

```css
.public-profile-tip-place {
  min-width: 0;

  display: inline-flex;
  align-items: center;
  gap: 5px;

  color: var(--brand);

  font-size: 12px;
  font-weight: 650;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

Use `MapPin` around 13px.

---

# 25. Tip title

```css
.public-profile-tip-card h3 {
  margin-top: 11px;

  font-size: 20px;
  line-height: 1.38;
  font-weight: 650;

  letter-spacing: -0.3px;
}
```

Mobile:

```css
font-size: 19px;
```

---

# 26. Price

When:

```ts
tip.category !== "general" && tip.price
```

show the same formatted value already supported by:

```text
formatMoney
priceSuffix
```

Styling:

```css
.public-profile-tip-price {
  margin-top: 8px;

  color: var(--ink);

  font-size: 17px;
  font-weight: 700;
}

.public-profile-tip-price span {
  margin-left: 4px;

  color: var(--ink-muted);

  font-size: 11px;
  font-weight: 500;
}
```

---

# 27. Quick facts

Reuse the same type of summarization currently used by `HomepageTipCard`.

Maximum:

```text
2 facts
```

Examples:

```text
Local bus · About 25 min
Private room · Walk-in
Masala dosa · 10 min walk
```

Styling:

```css
.public-profile-tip-facts {
  display: flex;
  flex-wrap: wrap;

  margin-top: 8px;

  color: #425349;

  font-size: 12px;
  font-weight: 550;
}

.public-profile-tip-facts span + span::before {
  content: "·";

  margin: 0 7px;

  color: #a8b4ac;
}
```

---

# 28. Body excerpt

```css
.public-profile-tip-copy {
  display: -webkit-box;

  margin-top: 9px;
  overflow: hidden;

  color: var(--ink-muted);

  font-size: 13px;
  line-height: 1.65;

  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
```

The component may still trim server-provided/string content defensively, similar to the homepage card.

Do not render the full tip body in the card.

---

# 29. Card footer

```css
.public-profile-tip-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  margin-top: auto;
  padding-top: 18px;

  color: var(--ink-subtle);

  font-size: 11px;
}
```

Left:

```text
Visited Aug 2026
```

Use existing:

```ts
formatMonth(...)
```

Right:

```text
freshness badge
```

The existing DTO already provides:

```ts
tip.freshness.label
tip.freshness.tone
tip.changeReported
```

---

# 30. Freshness badge

```css
.public-profile-freshness {
  display: inline-flex;
  align-items: center;
  gap: 5px;

  padding: 4px 8px;

  border-radius: var(--radius-pill);

  font-weight: 650;
  white-space: nowrap;
}
```

Use existing freshness tone information instead of hard-coding all tips as green.

The HTML contains both normal and warning examples only to demonstrate states.

---

# 31. Pagination

Preserve the current cursor-based pagination.

Current behavior:

```text
12 cards per page
13th row used to determine nextCursor
Older tips link with cursor query parameter
```

Keep it.

Style:

```css
.public-profile-pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.public-profile-next {
  min-height: 44px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  padding: 10px 16px;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);

  background: var(--surface);
  color: var(--ink);

  font-size: 13px;
  font-weight: 650;
}
```

Label:

```text
Older tips →
```

Continue linking to:

```tsx
/users/${profile.id}?cursor=${encodeURIComponent(profile.nextCursor)}
```

Do not replace cursor pagination with client-side infinite scroll as part of this redesign.

---

# 32. Empty state

Keep the current behavior for users with no published tips.

Suggested copy remains:

```text
No published tips yet
There is nothing public to show here yet.
```

Place the empty state below the section divider.

It should span the full content width.

Do not show:

```text
0-card placeholders
fake sample content
share CTA intended for the profile owner
```

because this is a public visitor view.

---

# 33. Tablet behavior — max 860px

Exact profile behavior should mirror `/me`.

```css
@media (max-width: 860px) {
  .public-profile-page {
    width: min(calc(100% - 32px), 760px);
    padding-top: 28px;
  }

  .public-profile-card {
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 20px;
    padding: 26px;
  }

  .public-profile-avatar {
    width: 72px;
    height: 72px;
    font-size: 24px;
  }

  .public-profile-tips {
    margin-top: 34px;
  }
}
```

---

# 34. Card grid breakpoint — max 720px

```css
@media (max-width: 720px) {
  .public-profile-tip-grid {
    grid-template-columns: 1fr;
  }
}
```

Do not force two very narrow cards on small tablets/large phones.

---

# 35. Mobile behavior — max 620px

```css
@media (max-width: 620px) {
  .public-profile-page {
    width: calc(100% - 28px);
    padding: 20px 0 40px;
  }

  .public-profile-card {
    grid-template-columns: 58px minmax(0, 1fr);
    gap: 15px;

    padding: 22px 18px 20px;

    border-radius: 20px;
  }

  .public-profile-avatar {
    width: 56px;
    height: 56px;

    border-width: 4px;

    font-size: 20px;
  }

  .public-profile-copy {
    display: contents;
  }

  .public-profile-identity {
    align-self: center;
  }

  .public-profile-name {
    font-size: 24px;
  }

  .public-profile-identity .profile-handle {
    width: 100%;
    margin-top: 1px;
  }

  .public-profile-bio,
  .public-profile-socials,
  .public-profile-meta {
    grid-column: 1 / -1;
  }

  .public-profile-bio {
    margin-top: 14px;
    font-size: 14px;
  }

  .public-profile-tips {
    margin-top: 30px;
  }

  .public-profile-tips h2 {
    font-size: 24px;
  }

  .public-profile-divider {
    margin-top: 17px;
  }

  .public-profile-tip-card {
    padding: 19px 17px;
  }

  .public-profile-tip-card h3 {
    font-size: 19px;
  }

  .public-profile-tip-top {
    align-items: flex-start;
  }

  .public-profile-tip-footer {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
```

The mobile identity structure deliberately matches the updated `/me` profile.

---

# 36. Suggested `app/users/[id]/page.tsx` shape

Illustrative structure:

```tsx
export default async function UserProfilePage(...) {
  ...

  return (
    <main
      id="main"
      className="container page-top public-profile-page"
    >
      <section
        className="public-profile-card"
        aria-labelledby="public-profile-name"
      >
        <ProfileAvatar
          name={profile.displayName}
          avatar={profile.avatar}
          className="public-profile-avatar"
          sizes="88px"
        />

        <div className="public-profile-copy">
          <div className="public-profile-identity">
            <h1
              className="public-profile-name"
              id="public-profile-name"
            >
              {profile.displayName}
            </h1>

            <span className="profile-handle">
              @{profile.username}
            </span>
          </div>

          {profile.bio && (
            <p className="public-profile-bio">
              {profile.bio}
            </p>
          )}

          <PublicSocialLinks ... />

          <div
            className="public-profile-meta"
            aria-label="Contributor summary"
          >
            <span>
              <strong>{profile.stats.publishedTips}</strong>
              {" "}published tips
            </span>

            <span>
              <strong>{profile.stats.places}</strong>
              {" "}places
            </span>

            <span>
              Joined TrailNote in {profile.joinedYear}
            </span>
          </div>
        </div>
      </section>

      <section
        className="public-profile-tips"
        aria-labelledby="shared-tips"
      >
        <div className="public-profile-kicker">
          Shared TrailNotes
        </div>

        <h2 id="shared-tips">
          Tips from {profile.displayName}
        </h2>

        <p className="public-profile-tips-description">
          First-hand practical notes from places{" "}
          {profile.displayName} has visited.
        </p>

        <div className="public-profile-divider" />

        {profile.cards.length ? (
          <div className="public-profile-tip-grid">
            {profile.cards.map((tip) => (
              <PublicProfileTipCard
                key={tip.id}
                tip={tip}
              />
            ))}
          </div>
        ) : (
          ...
        )}

        {profile.nextCursor && (
          ...
        )}
      </section>
    </main>
  );
}
```

---

# 37. Suggested public card component behavior

The card should be a server component unless client behavior is needed.

Possible signature:

```tsx
export function PublicProfileTipCard({
  tip,
}: {
  tip: ContributionCardDTO;
}) {
  ...
}
```

Use:

```text
categoryLabels
formatMoney
priceSuffix
formatMonth
MapPin
Clock3 / Flag if desired for freshness
```

No client state is necessary.

---

# 38. Shared UI opportunities

The new `/me` and public page now share:

```text
avatar ring
identity row
bio typography
social pills
profile metadata
gradient profile surface
mobile identity behavior
```

A future shared presentational component is reasonable, for example:

```text
src/components/profiles/profile-identity.tsx
```

But do **not** block the redesign on this refactor.

The owner page contains edit/public-profile controls while the public page does not, so the full containers should not be forced into one overly configurable component.

---

# 39. Avoid generic class collisions

The latest `globals.css` contains both newly added account styles and older repeated account-card style blocks later in the file.

Because later CSS declarations can override earlier ones, avoid introducing public-profile styling with generic selectors such as:

```text
.tip-card
.category-label
.tabs
.profile-card
```

unless intentionally sharing them.

Use public-specific selectors:

```text
.public-profile-card
.public-profile-tip-card
.public-profile-tip-category
.public-profile-tip-place
.public-profile-tip-copy
```

This makes visual parity more predictable and reduces accidental regressions.

---

# 40. What must not change

Do not alter:

```text
public profile URL structure
profile ID lookup
active-profile validation
invalid/expired cursor handling
published-only visibility
enabled-destination visibility
12-item page size
cursor security checks
ProfileAvatar image source rules
tip-detail routes
social rel attributes
global site header behavior
```

Do not expose:

```text
email
Google avatar URL
hidden tips
deleted tips
moderation status
private account data
```

---

# 41. Accessibility

Required:

```text
h1 = contributor display name
section heading = h2
tip titles = h3
social links remain real anchors
tip cards remain real links
external links retain safe rel attributes
decorative icons use aria-hidden
ProfileAvatar remains decorative because adjacent text names the user
pagination is a link, not a fake button
focus-visible treatment remains available
```

The metadata summary may use:

```html
aria-label="Contributor summary"
```

---

# 42. States to verify

Profile:

```text
[ ] real image
[ ] initials fallback
[ ] long display name
[ ] long username
[ ] bio present
[ ] no bio
[ ] Instagram only
[ ] YouTube only
[ ] both social links
[ ] no social links
[ ] 0 published tips
[ ] 1 published tip
[ ] multiple destinations
[ ] same destination across multiple tips counts once
```

Cards:

```text
[ ] general tip
[ ] stay tip with price
[ ] food tip
[ ] transport tip
[ ] tip with facts
[ ] tip without facts
[ ] long destination
[ ] long title
[ ] long body
[ ] recent freshness
[ ] warning/stale freshness
```

Pagination:

```text
[ ] <=12 tips — no pagination
[ ] >12 tips — Older tips visible
[ ] valid cursor
[ ] expired/invalid cursor retains current not-found/error behavior
```

Responsive:

```text
[ ] 320px
[ ] 375px
[ ] 430px
[ ] 720px
[ ] 860px
[ ] 1024px
[ ] 1440px
```

---

# 43. Exact visual acceptance checklist

At the same viewport size, compare the implementation side-by-side with:

```text
trailnote-public-profile-redesign.html
```

Desktop:

```text
[ ] page max width is 1040px
[ ] top padding is 48px
[ ] identity surface is white
[ ] 4px gradient strip is visible
[ ] profile padding is 32px
[ ] avatar is 88px with 6px pale ring
[ ] name is 31px
[ ] username is inline with name
[ ] bio is 15px
[ ] social links are bordered pills
[ ] stats use dot separators
[ ] no Edit Profile button
[ ] no View public profile link
[ ] no generic "TrailNote contributor" eyebrow
[ ] tips section starts 42px below profile
[ ] kicker says Shared TrailNotes
[ ] heading says Tips from {name}
[ ] divider appears before cards
[ ] cards use two columns
[ ] destination is visible on every card
[ ] contributor name is not repeated in each card
[ ] category is uppercase
[ ] title is 20px
[ ] body is 3-line clamped
[ ] visited month + freshness appear in footer
[ ] Older tips is centered
```

Mobile:

```text
[ ] top avatar is 56px at <=620
[ ] name is 24px
[ ] username moves below name
[ ] bio spans full card width
[ ] social links span full card width
[ ] stats span full card width
[ ] cards are one column
[ ] card padding becomes 19px 17px
[ ] tip title becomes 19px
[ ] no horizontal overflow
```

---

# 44. Implementation instruction for coding agent

Use this wording together with the HTML and this spec:

> Treat `trailnote-public-profile-redesign.html` as the visual source of truth for `/users/[id]`. The latest beta branch is the source of truth for behavior and data access. Match the HTML's 1040px page geometry, white gradient-accent profile card, ringed avatar, inline identity, social pills, public contribution statistics, two-column browse cards, spacing, typography, and responsive behavior. Do not preserve the current old `public-profile-hero` appearance. Extend `publicProfile()` only as required to return published-tip count, distinct public place count, and the real profile creation year. Preserve published-only visibility and cursor pagination. Do not use the generic `TipCard` unchanged because it repeats the contributor on their own profile; use a public-profile-specific summary card based on the existing `ContributionCardDTO`.

---

# 45. Final acceptance rule

The public profile should feel like the public-facing version of the newly redesigned `/me` identity.

It should not look like:

> an old destination/feed card wrapped in an outdated profile hero.

It should look like:

> a credible TrailNote contributor identity, followed by an easy-to-scan collection of their first-hand travel notes.

Unexplained visual differences from the reference HTML are not acceptable.
