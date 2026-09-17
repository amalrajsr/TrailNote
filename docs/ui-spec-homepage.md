# TrailNote Homepage — UI Implementation Specification

This document defines the homepage UI specification for TrailNote.

The homepage is intentionally **reader-first**. Its primary purpose is to help a traveller quickly understand what TrailNote offers, see real useful tips, explore destinations, and only then be invited to contribute.

The homepage story is:

> **Understand the value → Read useful tips → Explore places → Contribute something useful**

The page should not feel like a trip planner, destination-inspiration site, review platform, or travel social network.

---

# 1. Design principles

## 1.1 Reader-first

The first-time visitor is assumed to be someone looking for useful travel information.

Contribution is important, but it is secondary on the homepage.

Priority order:

```text
1. Search
2. Actual traveller tips
3. Explore places
4. Share a tip
```

---

## 1.2 Practical information over travel marketing

TrailNote should communicate:

- what travellers paid,
- how they got around,
- useful timings,
- where something is,
- practical warnings,
- small details worth knowing.

Avoid generic travel language such as:

```text
Discover your dream destination
Plan your perfect trip
Find your next adventure
```

Prefer concrete language.

---

## 1.3 Tip is the primary content unit

User-facing terminology:

```text
Tip
Tips
Traveller
Travellers
Share a tip
```

Avoid mixing:

```text
Note
Traveller note
Contribution
Post
Review
```

`Contribution` may remain an internal/legal/backend term, but not the main UI wording.

---

# 2. Page structure

Homepage sections must appear in this order:

```text
Header

Hero
  Reader-first message
  Destination search
  Starter destinations

Traveller tip feed

Explore India
  Destination cards
  India map

Contribution CTA

Footer
```

Do not move the contribution CTA above the tip feed or Explore India.

---

# 3. Global design system

## 3.1 Font

Primary font:

```css
font-family:
  "Commissioner",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Recommended weights:

```text
400 — body
500 — hero heading
600 — section headings / card titles
700 — buttons / labels / important values
800 — small uppercase eyebrow labels
```

---

## 3.2 Core colours

```css
:root {
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

  --accent: #b45a3c;
  --accent-soft: #f8ebe4;

  --transport: #4f7181;
  --transport-soft: #e9f0f3;

  --sand: #9a7b3f;
  --sand-soft: #f5f0e4;

  --warning: #866313;
  --warning-soft: #fbf3d8;

  --border: #dce4dd;
  --control-border: #829087;

  --shadow-card: 0 4px 16px rgb(23 37 29 / 5%);
  --shadow-card-hover: 0 10px 28px rgb(23 37 29 / 9%);
  --shadow-popover: 0 18px 46px rgb(23 37 29 / 14%);
}
```

---

## 3.3 Spacing

Recommended page container:

```css
width: min(1200px, calc(100% - 64px));
margin-inline: auto;
```

Mobile:

```css
width: calc(100% - 32px);
```

Typical section padding:

```text
Desktop: 64–72px vertical
Mobile: 48–52px vertical
```

---

## 3.4 Border radius

Recommended:

```text
Controls: 10–12px
Tip cards: 18px
Destination cards: 18px
Feature/map containers: 24–26px
Pills: 999px
```

---

# 4. Header

Desktop structure:

```text
TrailNote                 Explore tips   Places   Share a tip   Sign in
```

Recommended height:

```css
height: 72px;
```

Mobile:

```css
height: 64px;
```

The header may be sticky.

Recommended treatment:

```css
position: sticky;
top: 0;
background: rgb(247 250 247 / 94%);
backdrop-filter: blur(10px);
border-bottom: 1px solid var(--border);
```

Keep navigation minimal.

On mobile, hide secondary navigation items if needed and retain:

```text
TrailNote
Sign in
```

Do not make `Share a tip` visually stronger than the reader journey in the header.

---

# 5. Hero section

The hero must be reader-focused.

## 5.1 Eyebrow

Use:

```text
FROM TRAVELLERS WHO'VE BEEN THERE
```

Styling:

```css
font-size: 12px;
font-weight: 800;
letter-spacing: 1.4px–1.6px;
text-transform: uppercase;
color: var(--brand);
```

---

## 5.2 Main heading

Use:

```text
A little local knowledge.
A better trip.
```

Desktop:

```css
font-size: 56px–60px;
line-height: 1.05–1.1;
font-weight: 500;
letter-spacing: -0.03em;
```

Mobile:

```css
font-size: 38px–40px;
line-height: 1.12;
```

The heading should be visually strong, but not oversized to the point that it pushes search below the fold.

---

## 5.3 Supporting copy

Use:

```text
What travellers paid, how they got around, and the little things worth knowing.
```

Recommended:

```css
max-width: 680px;
font-size: 16px–17px;
line-height: 1.6;
color: var(--ink-muted);
```

---

# 6. Destination search

Search is the primary homepage action.

Prompt concept:

```text
Where are you going?
```

Placeholder:

```text
Try Badami, Hampi, Varkala…
```

Recommended desktop width:

```css
width: min(740px, 100%);
```

Search box:

```css
min-height: 60px–62px;
border: 1px solid var(--control-border);
border-radius: 16px;
background: var(--surface);
box-shadow: 0 10px 30px rgb(23 37 29 / 6%);
```

Structure:

```text
[ search icon ] [ destination input               ] [ Search → ]
```

Mobile:

- keep full-width,
- allow icon-only search CTA if needed,
- avoid reducing input width too aggressively.

Autocomplete should appear below the input in a popover.

Each suggestion should show:

```text
Hampi
Karnataka                           12 tips
```

If Geoapify returns a canonical name with a familiar alias, the familiar traveller-facing name may be primary.

Example:

```text
Ooty
Udhagamandalam, Tamil Nadu
```

---

# 7. Starter destinations

Immediately below search, show a small set of quick links.

Example:

```text
A few places to start:

Badami · Hampi · Varkala · Matheran
```

These should be lightweight pill links.

Do not make this visually compete with the search box.

---

# 8. Traveller tip feed

This section appears immediately after the hero.

Its purpose is to show what TrailNote actually contains without requiring the user to search first.

## 8.1 Section heading

Use:

```text
From travellers who've been there
```

Optional small supporting line:

```text
Real, practical tips from people who were actually there.
```

Avoid:

```text
Fresh from travellers
```

because freshness should refer to when information was experienced or confirmed, not merely upload time.

---

## 8.2 Feed layout

Desktop:

```css
display: grid;
grid-template-columns: repeat(3, minmax(0, 1fr));
gap: 16px;
```

Tablet:

```text
2 columns
```

Mobile:

```text
1 column
```

Show a small number of cards on the homepage.

Recommended:

```text
3–6 tips
```

Do not create an infinite social feed.

---

# 9. Homepage tip card

Homepage tip cards are discovery cards.

They should be more compact than full destination-feed cards.

## 9.1 Card hierarchy

Example:

```text
TRANSPORT                         BADAMI · KARNATAKA

Badami → Pattadakal

₹35 / person / trip

Local bus · ~40 min

Autos were asking around ₹400.
The local bus was much cheaper.

Visited Sep 2026              Recently confirmed
```

---

## 9.2 Required visual hierarchy

Card content order:

```text
Category + destination
Derived title
Primary structured value
1–2 useful facts
Short original traveller tip
Visited month
Freshness / confirmation state
```

The original tip remains important.

Structured fields improve scanning; they must not replace the traveller's narrative.

---

## 9.3 Category accents

Use subtle category accents:

```text
Stay       → sand
Food       → terracotta
Transport  → muted blue
Explore    → forest green
Quick tip  → neutral gray-green
```

Do not use full-card category background colours.

---

## 9.4 Primary value

Where available, show:

```text
₹35 / person / trip
₹650 / room / night
₹90 / meal
₹40 / person
```

Make the number prominent.

Recommended:

```css
font-size: 26px–29px;
font-weight: 700;
```

---

## 9.5 Summary facts

Show a maximum of approximately 1–3 compact facts.

Examples:

```text
Local bus · ~40 min
Called directly · Near bus stand
South Indian meals · Before 1:30 PM
```

Do not show every structured field in the homepage card.

---

## 9.6 Quick tip cards

Quick tips remain text-first.

Example:

```text
QUICK TIP                         VARKALA · KERALA

Carry small notes for local rides

A few short-distance auto rides were cash-only.
Keeping smaller notes saved a lot of back-and-forth.

Visited Sep 2026
```

No artificial price/fact row should be added if it does not exist.

---

## 9.7 Missing values

Never render:

```text
Fare: N/A
Timing: N/A
Contact: N/A
```

Only render populated values.

---

# 10. Tip feed ranking

Homepage tips should not simply use:

```sql
ORDER BY created_at DESC
```

The homepage should favour a useful mix.

Consider:

```text
freshness
+ usefulness
+ confirmation state
+ destination diversity
+ category diversity
```

Avoid showing several consecutive tips from the same destination/category when alternatives exist.

---

# 11. Explore India

This section should remain visually important, but secondary to the actual tip feed.

Heading:

```text
Explore India
```

Supporting text:

```text
Practical tips from places across India.
```

Desktop layout:

```text
50% destination cards
50% India map
```

Recommended:

```css
grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
gap: 28px;
```

The map must not dominate the section.

---

# 12. Destination card area

Use the existing TrailNote destination-card visual language.

Recommended desktop arrangement:

```text
2 × 2 grid
```

Example:

```text
┌─────────────────────┐
│ Badami              │
│ Karnataka           │
│                     │
│ Transport Stay Food │
│                     │
│ 18 tips             │
└─────────────────────┘
```

Display approximately four cards on the homepage.

Do not turn this section into a directory.

Provide:

```text
View all places →
```

after the cards.

---

## 12.1 Destination card copy

With content:

```text
Badami
Karnataka
18 tips
```

Without content:

```text
Badami
Karnataka
Be the first to add a tip
```

Prefer:

```text
18 tips
```

over:

```text
18 traveller tips
18 traveller notes
```

---

## 12.2 Optional category indicators

Destination cards may show a few available content types:

```text
Transport
Stay
Food
Explore
```

Keep these subtle.

Do not turn destination cards into mini dashboards.

---

# 13. India map

The homepage map is an exploratory/orientation element.

It is not the primary navigation model.

Purpose:

```text
Help users understand roughly where highlighted TrailNote destinations are located.
```

Recommended:

- recognisable India outline,
- up to 15 destination markers,
- no dense labels,
- no pan/zoom requirement,
- no MapLibre required for homepage MVP.

Use:

```text
India GeoJSON
+ d3-geo
+ SVG
```

for final implementation.

Both:

```text
India outline
and destination markers
```

should use the same projection.

This prevents visual marker drift.

---

## 13.1 Map marker rules

Maximum:

```text
15 destinations
```

Recommended:

```text
Desktop <= 8 visible labels:
dot + label

Desktop > 8:
dots for most markers
labels for selected/high-priority markers

Mobile:
dots by default
```

Marker labels must not create visual clutter.

---

## 13.2 Map/card relationship

Optional interaction:

```text
Hover/focus destination card
→ corresponding map marker highlights
```

and:

```text
Hover/focus marker
→ corresponding destination card highlights
```

Do not trigger large map zoom animations.

Use subtle active styling only.

---

# 14. Mobile Explore India behaviour

Do not preserve a literal 50/50 split on mobile.

Recommended order:

```text
Explore India heading
Destination cards
View all places
India map
```

Destination cards should come before the map because they provide direct utility.

The map can remain around:

```text
360–420px height
```

depending on viewport.

---

# 15. Contribution section

This is where the original TrailNote motto should have its strongest placement.

Use the existing solid green CTA treatment.

Small label:

```text
KNOW SOMETHING USEFUL?
```

Main heading:

```text
Tell the next traveller what you wish someone had told you.
```

Supporting copy:

```text
A fare, a room rate, a shortcut, a good meal — one detail is enough.
```

CTA:

```text
Share a tip
```

Recommended styling:

```css
background: var(--brand);
color: white;
border-radius: 24px–26px;
padding: 32px–40px;
```

The CTA button should invert:

```css
background: white;
color: var(--brand);
```

This section should appear only after users have:

```text
understood the product
seen useful tips
explored destinations
```

---

# 16. Footer

Keep the footer simple.

Do not repeat the full motto.

Suggested structure:

```text
TrailNote

Explore
Search destinations
Recent tips
Share a tip

Community
Guidelines
Privacy
Terms
Contact removal
```

The brand statement has already had its meaningful placement in the contribution CTA.

---

# 17. Responsive breakpoints

Suggested:

```text
Desktop: >= 1000px
Tablet: 768–999px
Mobile: < 768px
```

---

## 17.1 Mobile hero

Recommended:

```text
left-aligned
single-column
full-width search
smaller heading
```

Avoid oversized hero whitespace.

---

## 17.2 Mobile tip feed

Use:

```text
1 column
```

Cards should remain compact.

Do not create horizontal card carousels unless later testing strongly supports it.

Vertical scrolling is simpler and more accessible.

---

## 17.3 Mobile destination cards

Recommended:

```text
2 columns where width permits
1 column below ~430px
```

---

# 18. Interaction states

All interactive elements need:

```text
default
hover
focus-visible
active
disabled where relevant
```

Cards may use a very small hover lift:

```css
transform: translateY(-2px);
```

Do not use large motion.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

---

# 19. Accessibility

Target WCAG 2.2 AA.

Requirements:

- visible focus states,
- >=44px touch targets,
- search has a programmatic label,
- map links/markers have meaningful `aria-label`,
- colour is not the only category indicator,
- cards remain keyboard accessible,
- autocomplete is keyboard navigable,
- 200% zoom must remain usable,
- no required hover-only information.

---

# 20. Performance

Homepage should remain lightweight.

Avoid:

```text
MapLibre
large stock photos
heavy animation libraries
large image carousels
```

for the initial homepage.

Map recommendation:

```text
SVG + d3-geo
```

Tip cards should be mostly text and CSS.

This supports fast rendering and keeps the product visually distinct from image-heavy travel products.

---

# 21. Content loading

Recommended server-rendered initial homepage data:

```ts
type HomePageData = {
  featuredTips: TipSummary[];
  featuredDestinations: DestinationSummary[];
  mapDestinations: MapDestination[];
};
```

Suggested limits:

```ts
featuredTips: 3 to 6
featuredDestinations: 4
mapDestinations: max 15
```

Search autocomplete can load independently.

---

# 22. Homepage tip data shape

Suggested:

```ts
type TipSummary = {
  id: string;
  category:
    | "general"
    | "stay"
    | "food"
    | "transport"
    | "explore";

  destination: {
    slug: string;
    name: string;
    state: string;
  };

  title?: string;
  body: string;

  primaryValue?: {
    value: string;
    unit?: string;
  };

  summaryFacts?: string[];

  visitedMonth: string | null;

  freshness:
    | "recent_visit"
    | "recently_confirmed"
    | "may_have_changed"
    | "change_reported";
};
```

---

# 23. Destination data shape

Suggested:

```ts
type DestinationSummary = {
  id: string;
  slug: string;
  name: string;
  state: string;
  tipCount: number;
  availableCategories?: TipCategory[];
};
```

Map:

```ts
type MapDestination = {
  id: string;
  slug: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  tipCount: number;
};
```

---

# 24. SEO and semantics

Use one homepage `<h1>`:

```text
A little local knowledge. A better trip.
```

Section headings should use `<h2>`:

```text
From travellers who've been there
Explore India
Tell the next traveller what you wish someone had told you.
```

Destination/tip card titles can use `<h3>` where semantically appropriate.

Use anchor elements for destination/tip cards that navigate.

---

# 25. What not to add

Do not add:

- star ratings,
- reviews,
- follower counts,
- social profiles as primary UI,
- infinite feed,
- “trending creators”,
- travel inspiration carousels,
- generic destination photography,
- gamified contributor scores,
- itinerary planning controls,
- booking CTAs.

These would move TrailNote away from its narrow product purpose.

---

# 26. Homepage success criteria

The homepage is successful if a first-time visitor can understand within a few seconds:

```text
1. TrailNote contains practical first-hand travel information.
2. The information comes from travellers who were actually there.
3. They can search where they are going.
4. They can immediately see examples of useful tips.
5. They can browse destinations across India.
6. They can contribute one useful detail later.
```

---

# 27. Final hierarchy

The intended visual and product hierarchy is:

```text
HEADER

FROM TRAVELLERS WHO'VE BEEN THERE

A little local knowledge.
A better trip.

What travellers paid, how they got around,
and the little things worth knowing.

[ Where are you going? ]

Starter destinations

────────────────────────

FROM TRAVELLERS WHO'VE BEEN THERE

Actual practical tip cards

────────────────────────

EXPLORE INDIA

Destination cards  |  India map
       50%          |    50%

────────────────────────

KNOW SOMETHING USEFUL?

Tell the next traveller
what you wish someone had told you.

A fare, a room rate, a shortcut,
a good meal — one detail is enough.

[ Share a tip ]

────────────────────────

FOOTER
```

---

# 28. Final implementation principle

The homepage must be:

> **Reader-first, contributor-second.**

The contributor loop still remains central to TrailNote, but contribution should happen after the homepage has demonstrated why the product is useful.

The visitor should first benefit from knowledge left by another traveller.

Then TrailNote can ask them to pass something useful on to the next one.
