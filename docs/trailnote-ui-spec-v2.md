# TrailNote — UI specification

Use with the implementation contract and `design-reference.html`.

This document replaces the earlier warm-paper / Georgia visual direction. The product behavior remains focused on practical, first-hand travel knowledge, but the visual system now moves toward a fresher, map-led travel exploration experience.

The core product principle is unchanged:

> **Tell the next traveller what you wish someone had told you.**

TrailNote should feel useful, calm, modern and recognizably travel-oriented without becoming a generic travel booking site, social network, Google Maps clone, or AI itinerary planner.

---

# 1. Product design direction

## 1.1 Visual identity

TrailNote is a practical travel knowledge layer for India.

The UI should communicate three things immediately:

1. **Place** — destinations and geography matter.
2. **Freshness** — users should understand when information was observed or confirmed.
3. **First-hand usefulness** — prices, routes, contacts, practical advice and recent changes matter more than ratings, likes or polished travel photography.

The visual language should therefore be:

- fresh rather than beige,
- geographic rather than editorial-journal heavy,
- calm rather than loud,
- modern rather than corporate,
- useful rather than decorative,
- community-driven without feeling like a social feed.

The previous notebook/paper visual language is no longer the primary art direction. A small amount of paper-like warmth is allowed in secondary illustrations, but not as the global page background.

## 1.2 Signature elements

The recognizable TrailNote experience should come from:

- the TrailNote forest green,
- the Commissioner typeface,
- map-led destination discovery,
- destination coordinates / marker interaction,
- freshness badges and confirmation language,
- subtle category accents,
- practical contribution cards,
- a strong destination search field.

Large scenic photography is not a signature element.

## 1.3 What to avoid

Do not turn the interface into:

- a booking marketplace,
- a social-media travel feed,
- a rating/review site,
- a glassmorphism SaaS landing page,
- a giant-photo travel blog,
- an admin dashboard,
- a generic Google Maps clone.

Avoid:

- oversized photographic heroes,
- star ratings,
- popularity claims without real data,
- fabricated traveler counts,
- gradients as primary UI decoration,
- excessive pill/chip use,
- nested cards everywhere,
- decorative empty boxes,
- giant whitespace caused only by `min-height: 100vh`,
- horizontal category scrolling that hides options,
- tiny gray metadata,
- beige-on-beige page treatment.

---

# 2. Design tokens

Implement in `src/styles/tokens.css`.

Raw color values should only appear in design tokens, brand assets, or highly specific map artwork.

```css
:root {
  /* Base surfaces */
  --canvas: #f7faf7;
  --surface: #ffffff;
  --surface-soft: #f0f4f0;
  --surface-raised: #ffffff;

  /* Text */
  --ink: #17251d;
  --ink-muted: #5c6c62;
  --ink-subtle: #7a887f;

  /* TrailNote green */
  --brand: #245c43;
  --brand-hover: #1b4c36;
  --brand-soft: #e6f1e9;
  --brand-faint: #f0f7f2;
  --brand-border: #c9ddcf;
  --on-brand: #ffffff;

  /* Travel accents */
  --accent: #b45a3c;
  --accent-soft: #f8ebe4;

  --transport: #4f7181;
  --transport-soft: #e9f0f3;

  --sand: #9a7b3f;
  --sand-soft: #f5f0e4;

  /* Borders and controls */
  --border: #dce4dd;
  --control-border: #829087;
  --focus: #245c43;

  /* States */
  --warning: #866313;
  --warning-soft: #fbf3d8;

  --danger: #b42318;
  --danger-soft: #fff0ed;

  --success: #245c43;
  --success-soft: #e6f1e9;

  /* Geographic / map surfaces */
  --map-surface: #e6f1e9;
  --map-surface-soft: #f0f7f2;
  --map-water: #dce9ed;
  --map-line: #a9c1ae;

  /* Compatibility / optional illustration */
  --paper: #ffffff;
  --tape: #d7e2d4;
  --contour: #a9c1ae;

  /* Overlay */
  --scrim: rgb(23 37 29 / 52%);

  /* Shadows */
  --shadow-card: 0 4px 16px rgb(23 37 29 / 5%);
  --shadow-card-hover: 0 8px 24px rgb(23 37 29 / 8%);
  --shadow-popover: 0 16px 42px rgb(23 37 29 / 13%);
  --shadow-map: 0 12px 36px rgb(23 37 29 / 9%);

  /* Radius */
  --radius-control: 12px;
  --radius-card: 18px;
  --radius-feature: 26px;
  --radius-pill: 999px;

  /* Typography */
  --font-ui:
    "Commissioner",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  --font-display:
    "Commissioner",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  /* Temporary compatibility token */
  --font-editorial:
    "Commissioner",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Motion */
  --motion-fast: 120ms;
  --motion-standard: 180ms;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

## 2.1 Color usage

### Canvas

`--canvas` is the default application background.

Do not replace it with a warm beige. The slight green tint is intentional and should make the forest green feel fresh without turning the whole interface mint-colored.

### Brand

Keep `--brand: #245c43`.

Do not move to a brighter generic emerald. Freshness should come from the surrounding surfaces, not from making the core brand neon.

### Accent use

Use accents sparingly:

- Stay → sand family
- Food → terracotta family
- Transport → muted blue family
- Explore → TrailNote green
- Tips / General → neutral gray-green

Do not fill whole contribution cards with category colors.

Use accents for:

- a 3–4px marker,
- icon container,
- category label,
- small badge,
- map marker detail.

### Contrast

Normal body text must meet WCAG 2.2 AA contrast.

Never use `--ink-subtle` for important body copy, control text, prices, actions or field labels.

---

# 3. Typography

Use Commissioner as the primary and display font.

Google Fonts may be used in development/reference builds:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
>
```

Production may self-host the font if preferred.

Do not use Georgia in the redesigned product.

## 3.1 Type roles

| Text role | Desktop | Mobile |
|---|---|---|
| Wordmark | 27 / 32 / 700 | 25 / 30 / 700 |
| Home headline | 62–64 / 68 / 500 | 40–42 / 45 / 500 |
| Destination h1 | 56–58 / 62 / 500 | 38–40 / 45 / 500 |
| Page title | 40–44 / 50 / 500 | 30–34 / 40 / 500 |
| Section title | 26–28 / 35 / 600 | 22–24 / 31 / 600 |
| Card title | 20–21 / 29 / 600 | 18–19 / 26 / 600 |
| Card price | 28–30 / 35 / 700 | 25–26 / 32 / 700 |
| Detail price | 40–42 / 48 / 700 | 32–34 / 41 / 700 |
| Body / input | 16 / 26 / 400 | same |
| Detail body | 18 / 30 / 400 | 16 / 27 / 400 |
| Label / button | 14 / 20 / 600 | same |
| Supporting text | 13 / 20 / 400 | same |
| Eyebrow | 12 / 18 / 700, uppercase, 1.4px tracking | same |

## 3.2 Heading treatment

```css
h1 {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.035em;
}

h2 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

Do not use extremely bold 800/900 weight for primary travel headings.

---

# 4. Layout families

TrailNote has three distinct page families.

Do not force one generic shell to visually solve all routes.

## 4.1 Exploration pages

Examples:

- `/`
- `/search`
- `/destinations/[slug]`
- `/tips/[id]`

Characteristics:

- full-width product shell,
- map or destination context where useful,
- 1,200px maximum container,
- content-driven page height,
- footer in normal flow.

## 4.2 Task pages

Examples:

- `/destinations/[slug]/add`
- `/tips/[id]/edit`
- `/tips/[id]/update`
- `/sign-in`
- `/contact-removal` when a real form is available

Characteristics:

- focused content column,
- 640–760px primary width,
- normal header,
- no giant hero,
- deliberate top/bottom spacing,
- no artificial `min-height: 800px` on the form.

## 4.3 Document pages

Examples:

- `/privacy`
- `/terms`
- `/community-guidelines`

Characteristics:

- 680–760px reading column,
- meaningful sections and headings,
- optional left-side on-page navigation only when the document is genuinely long,
- no giant blank page with three paragraphs,
- no visual filler solely to occupy height.

## 4.4 Short page rule

Never solve a short page with:

```css
padding-bottom: 400px;
```

or:

```css
min-height: 900px;
```

Instead:

- provide complete meaningful content,
- use designed instructional states,
- use appropriate page-family width,
- use intentional footer background separation,
- allow the page to grow naturally.

The global shell may still use:

```css
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}
```

but short pages must not visually consist of a title followed by hundreds of pixels of dead space.

---

# 5. Responsive layout

Breakpoints:

- mobile: `<768`
- tablet: `768–1023`
- desktop: `>=1024`
- wide: `>=1280`

Main exploration container:

```text
max-width: 1200px
mobile gutter: 16px
tablet gutter: 24px
desktop gutter: 32px
```

At 1440px viewport:

```text
content starts ≈ 120px
content ends ≈ 1320px
```

All flex/grid text children must use `min-width: 0`.

Long URLs and tokens must wrap with `overflow-wrap: anywhere`.

---

# 6. Global shell

## 6.1 Header

Desktop height: 72px  
Mobile height: 64px

Sticky at top.

Background:

- `--canvas`,
- or a nearly opaque version with very subtle blur.

Use a thin bottom border.

Desktop:

```text
TrailNote                         Explore   Share a tip   Sign in/account
```

Mobile:

```text
TrailNote                                      account/sign in
```

Hide desktop text links on mobile.

Do not add bottom navigation.

## 6.2 Wordmark

Use Commissioner 700 with the TrailNote compass mark.

The icon should remain forest green.

Do not use decorative serif typography.

## 6.3 Footer

The footer should feel intentional on sparse pages without becoming a large corporate footer.

Recommended desktop structure:

```text
TrailNote                      Explore           Community
motto                          Search            Guidelines
                               Share a tip       Privacy
                                                 Terms
                                                 Contact removal
```

Keep total vertical height roughly 120–160px depending on wrapping.

Footer surface:

```css
background: var(--surface-soft);
border-top: 1px solid var(--border);
```

On mobile, stack into 2–3 compact rows.

---

# 7. Core controls

## 7.1 Primary button

- min-height: 48px
- horizontal padding: 20px
- radius: 12px
- brand fill
- white text
- 14px / 600–700 weight

Hover: `--brand-hover`

Active: `translateY(1px)`

Busy state keeps width stable.

## 7.2 Secondary button

- same geometry,
- white surface,
- `--control-border`,
- `--ink`.

## 7.3 Quiet action

- min-height: 44px
- transparent
- subtle brand-soft hover
- readable label

## 7.4 Input/select

- min-height: 48px
- radius: 12px
- surface background
- control border
- visible label above
- 16px input value

Do not use placeholder-only labels.

## 7.5 Cards

Standard:

- white surface
- 1px border
- 18px radius
- 20px mobile / 22–24px desktop padding
- `--shadow-card`

Do not put every section into a card. Use cards only when the information is a meaningful unit.

## 7.6 Focus

2px brand outline + 3px offset.

---

# 8. Destination search

Search remains the primary navigation mechanism even with the map redesign.

## 8.1 Home search

Desktop:

- 64px height
- 14px radius
- Search icon left
- input
- compact green arrow button right

Mobile:

- 56px height

Placeholder:

```text
Search Hampi, Ooty, Varkala…
```

Label:

```text
Where are you going?
```

## 8.2 Search dropdown

Anchor 8px below the field.

- same width as search
- white surface
- 14px radius
- popover shadow
- 8px internal padding
- max-height around 360px

Each result:

- minimum 64px row height
- destination name
- secondary geographic text
- subtle map-pin icon container

Example:

```text
Ooty
Udhagamandalam, Tamil Nadu
```

If the query exactly matches an alias, show the alias as the primary display name.

## 8.3 Map response

When a destination result is highlighted or selected:

- corresponding marker may highlight,
- selection may pulse once,
- final selection can trigger map `flyTo`,
- never require manual map navigation.

Reduced-motion mode disables animated travel.

The map is an exploration layer, not the primary input.

---

# 9. Home — `/`

## 9.1 Desktop hero

Two columns:

```text
minmax(0, 1fr) 480–500px
gap 56–64px
```

Top/bottom:

```text
58–64px top
50–56px bottom
```

Left:

Eyebrow:

```text
TRAVELER KNOWLEDGE FOR INDIA
```

H1:

```text
Tell the next traveller
what you wish someone had told you.
```

Use Commissioner 500.

The second line may use brand color, but not serif italics.

Body:

```text
Practical notes from people who were actually there —
what they paid, how they got around, and the little things worth knowing.
```

Search follows.

Below search:

```text
A few places to start:
Badami · Hampi · Varkala · Gokarna
```

These are navigation shortcuts, not popularity claims.

## 9.2 Hero map

Desktop only in the first implementation.

Approximately 430px high.

Visual treatment:

- pale green map surface,
- soft water region,
- minimal India silhouette,
- a small set of TrailNote markers,
- no road network,
- no venue clutter.

A small overlay card may say:

```text
FROM ONE TRAVELER TO ANOTHER

Useful details, grounded in a place.

The map helps you explore.
Traveler notes do the real work.
```

## 9.3 Mobile hero

Single column.

Search remains above destination discovery.

The full large map may:

- move below search,
- become a shorter 280–320px panel,
- or be hidden on very small devices if it harms first-task speed.

No horizontal scroll.

## 9.4 Fresh from travelers

Section heading:

```text
Fresh from travelers
Places where useful notes have recently been shared or updated.
```

Use destination cards, not scenic photo cards.

Desktop: 3 columns  
Tablet: 2 columns  
Mobile: 2 columns where practical, 1 column below ~420px

Each card:

- destination
- state
- small category tags
- real note count if available
- no fake popularity label.

## 9.5 Home contribution CTA

Use a dark green feature section near the bottom.

Example:

```text
Know something useful?

A fare, a room rate, a shortcut, a good meal —
one detail is enough.

[ Share a tip ]
```

This is the one place where a large solid brand block is encouraged.

---

# 10. Destination page — `/destinations/[slug]`

## 10.1 Header area

Breadcrumb first:

```text
Explore / Karnataka
```

Then:

```text
KARNATAKA · INDIA

Badami

Small discoveries. Useful details. Shared by travelers.

18 traveler notes · Recently updated
```

Desktop Add button aligns right.

Mobile Add button becomes full width beneath metadata.

No giant destination hero photo.

## 10.2 Categories

Use:

- All
- Stay
- Food
- Transport
- Explore
- Tips

Desktop: row/wrap.

Mobile: grid, preferably 2–3 columns depending on width.

Do not use horizontally scrolling hidden chips.

Sort is a native select:

- Recent visits
- Newest shared

## 10.3 Desktop destination layout

Use:

```text
main feed + 320–340px map panel
```

Recommended:

```css
grid-template-columns: minmax(0, 1fr) 340px;
gap: 30–32px;
```

The map panel may be sticky below the header.

Map stays secondary to traveler notes.

## 10.4 Mobile destination map

Do not squeeze side-by-side layout.

Use either:

1. compact map above the feed, or
2. map below filters, or
3. later: full map + bottom sheet.

For MVP, use a simple compact map in document flow.

---

# 11. Contribution cards

Cards must make practical information easy to scan.

Hierarchy:

1. category
2. freshness
3. title
4. price / key fact
5. useful advice
6. visited month / author
7. confirmation
8. actions

## 11.1 Category treatment

Use subtle category accents.

Examples:

```text
▌ TRANSPORT
▌ STAY
▌ FOOD
```

Do not fill the whole card.

## 11.2 Freshness states

Freshness is a signature TrailNote feature.

Use:

- Recent visit
- Recently confirmed
- A few months old
- May have changed
- Visit month unknown
- Change reported

`Change reported` takes visual priority over recency.

Warning state must change more than color.

## 11.3 Price

Price is prominent.

Example:

```text
₹35 / person / trip
```

Use tabular figures.

Never display null as `₹0` or `Free`.

## 11.4 Body

List cards: max roughly 3 lines before a Read tip action if truncation is needed.

Do not truncate:

- price,
- date,
- category,
- freshness.

## 11.5 Actions

List cards:

- Still accurate
- Helpful
- More

Changed and Report live in More for non-authors.

Authors get Edit/Delete in More.

Each action target >=44px.

---

# 12. Contribution detail — `/tips/[id]`

Desktop:

```text
main detail card + 320–330px freshness panel
```

Main card:

- white surface
- 30–32px desktop padding
- 20px mobile
- 18–20px radius

Detail title is Commissioner.

Price 40–42px desktop.

Useful body text:

- 18/30 desktop
- 16/27 mobile

## 12.1 Fact grid

Two columns desktop.

One column mobile.

Render only populated facts.

Never show walls of `N/A`.

## 12.2 Freshness panel

Show:

```text
How recent is this?

Change reported

Originally visited
August 2026

Last confirmed
September 2026

7 travelers confirmed this version
```

Explain confirmation semantics.

## 12.3 Traveler updates

Updates live below the main card.

Never overwrite the original report.

Show original and updated values distinctly.

---

# 13. Composer — Add / Edit / Update

The composer remains a page, not a full-screen modal.

Width:

```text
max 720–760px
```

Top:

```text
Back to Badami

Help the next traveller.
One useful detail is enough.

Badami, Karnataka
```

## 13.1 Category selection

Options:

- Quick tip
- Stay
- Food
- Transport
- Explore

Use wrap/grid, not horizontal scrolling.

## 13.2 Form philosophy

One submission stage.

No stepper.

No preview requirement.

The form should feel closer to writing a useful message than filling a database.

Only destination, category and useful text are mandatory.

## 13.3 Field behavior

Quick tip starts with the textarea.

Category-specific optional fields appear before or after the tip as defined by the domain contract.

Add details remains a disclosure.

Add photos remains one shared upload control.

## 13.4 Visited month

Visible by default.

Never secretly default without showing it.

## 13.5 Mobile sticky submit

Only the composer footer may become sticky.

Reserve space so it never covers fields.

Do not pin both the page header and category selector.

## 13.6 Blank-space rule

Do not stretch the composer to viewport height.

The real form should provide natural vertical height.

If a category has few fields, keep the page compact rather than adding decorative filler.

---

# 14. Authentication

Google-only sign in.

Reading never requires authentication.

Dialog:

- width up to 440px
- TrailNote compass
- title: `Share what you know`
- explanation
- full-width Google button
- Terms/Privacy links

Draft recovery copy only appears if a draft truly exists.

---

# 15. Account and moderation

`/me` should remain practical.

No follower counts, badges or reputation scores.

Moderation screens may be more utilitarian, but still use TrailNote tokens.

Do not reuse traveler exploration cards for admin data tables.

---

# 16. Policy/document pages

Applies to:

- Privacy
- Terms
- Community Guidelines

These pages must no longer appear as a title plus a few paragraphs floating above a distant footer.

## 16.1 Document container

Recommended:

```css
.document-page {
  width: min(720px, calc(100% - 32px));
  margin-inline: auto;
  padding-block: 52px 80px;
}
```

Desktop page title:

```text
40–44px
```

Supporting intro:

```text
16–18px
```

A subtle divider may separate introduction and content.

## 16.2 Section rhythm

Each document should use meaningful headings.

Example Privacy structure:

```text
Privacy

How TrailNote handles the information you share.

Last updated September 2026

What we collect
...

What appears publicly
...

Public service contacts
...

Photos
...

Operational data
...

Your choices
...

Contact and removal
...
```

Sections:

```text
32–40px vertical separation
```

Body:

```text
16px / 28px
```

Do not artificially enlarge fonts to fill the page.

## 16.3 Long documents

Only if a document becomes genuinely long, a desktop on-page navigation may be introduced:

```text
On this page | document body
```

Do not add side navigation for a short policy.

---

# 17. Community Guidelines

Guidelines may be more scannable than Privacy/Terms.

Recommended sections:

```text
Share what you actually experienced

Good contributions
✓ real prices
✓ recent routes
✓ useful contacts
✓ first-hand practical details

Don't use TrailNote for
× advertising
× copied reviews
× private personal information
× harassment
```

Use check/cross rows or compact principle blocks.

Keep it informative, not gamified.

---

# 18. Contact removal

`/contact-removal` has two deliberate states.

## 18.1 No contact context

Do not show only:

```text
Request contact removal
Open this form from a revealed contact...
[Explore tips]
```

Instead show an instructional state.

Example:

```text
Request contact removal

If a public business or service number was shared on TrailNote
and you'd like us to review it, start from the tip where the
number appears.

How removal requests work

1. Open the relevant traveler tip
2. Reveal the contact
3. Choose “Report this number”

This helps us identify the exact contact without asking you to
paste a phone number here.

[ Explore tips ]
```

This state can use a soft green information panel.

## 18.2 Valid contact context

Show:

- linked tip summary,
- masked number,
- explanation textarea,
- optional reply email,
- submit button.

Do not expose the full phone number unnecessarily.

---

# 19. Sign-in, 404 and error states

Short system pages should use deliberate centered content panels.

Do not leave them as tiny content blocks at the top of a 100vh empty canvas.

Recommended width:

```text
440–560px
```

Recommended top/bottom breathing space:

```text
48–72px
```

---

# 20. Map styling

MapLibre production styling should match the visual identity.

Avoid:

- extremely bright default street map styling,
- saturated road colors,
- POI clutter.

Prefer:

- neutral land,
- pale green geographic surfaces,
- muted blue water,
- TrailNote green selected marker,
- small marker labels,
- readable administrative labels.

MapLibre expects `[lng, lat]`.

Destination selection may start around zoom 10–12 depending on context.

---

# 21. Motion

Use motion only to clarify state.

Allowed:

- 4–6px search dropdown entry,
- subtle marker pulse once,
- map flyTo,
- selected pill transition,
- pressed/pending control feedback,
- small card hover translate on desktop.

Avoid:

- looping marker animations,
- feed entrance animations,
- parallax,
- bouncing CTAs.

`prefers-reduced-motion` disables nonessential transforms and animated scrolling.

---

# 22. Loading and empty states

## Search

States:

- empty
- typing
- loading
- results
- keyboard highlight
- no match
- server error

Loading uses 3 skeleton suggestion rows.

## Destination

Loading uses contribution-card skeletons.

Empty destination:

```text
No tips here yet

Know something useful about Badami?
Help the next traveler.

[ Add the first tip ]
```

Empty category:

```text
No transport tips yet

[ Add a transport tip ]
See all tips
```

Do not show an empty state for a failed request.

---

# 23. Accessibility

Target WCAG 2.2 AA.

Required:

- visible labels,
- focus states,
- 44px touch targets,
- keyboard search,
- semantic combobox,
- dialog focus trapping,
- heading order,
- skip link,
- reduced motion,
- error summary,
- no color-only statuses,
- 200% text zoom support.

Map interactions must never be required to access destination information.

---

# 24. Visual acceptance

Compare key routes at:

- 1440×1000
- 390×844
- 320×740
- 768×1024
- 1024×768

Core reference screens:

- Home
- Destination
- Composer
- Detail
- Privacy
- Terms
- Guidelines
- Contact removal

Check:

- container alignment,
- Commissioner rendering,
- fresh canvas tone,
- green feature sections,
- search prominence,
- map balance,
- contribution-card hierarchy,
- freshness prominence,
- category accents,
- mobile category wrapping,
- composer sticky submit,
- policy page content density,
- contact-removal instructional state,
- footer treatment on short pages.

The UI is not complete only because it compiles.

---

# 25. Final design summary

TrailNote should now feel like:

```text
fresh geographic canvas
+
forest-green identity
+
Commissioner typography
+
map-led discovery
+
practical traveler notes
+
clear freshness signals
+
simple contribution workflow
```

It should not feel like:

```text
beige journal
+
generic cards
+
large empty policy pages
+
social travel feed
+
booking platform
```
