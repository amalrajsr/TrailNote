# Fieldnotes — UI implementation specification

Use with [implementation contract](implementation-plan.md) and [browser reference](design-reference.html). This document specifies the finished product, including states not illustrated in the reference. Values are CSS pixels unless noted. Do not reinterpret the design as a generic SaaS landing page or an admin dashboard.

## 1. Visual direction

A useful travel notebook: warm paper, dark ink, forest-green actions, small terracotta accents, precise prices and generous reading space. Personality comes from editorial headings, understated line drawings and good content hierarchy. Information pages use a single readable list; destination discovery uses a grid. Avoid ornamental gradients, glass panels, enormous scenic heroes, star ratings and stock traveler portraits.

The visual reference provides four switchable compositions: home, destination, composer and detail. Its top blue-gray preview toolbar is **not product UI**; remove it from production and exclude it from measurements. The fixture banner also belongs only to the reference/development preview. Append `?clean=1#destination` (or another screen name) to hide reference chrome when comparing compositions. Do not reproduce the reference's simplified controls as fake production interactions.

The UI/UX skill's automated design-system searches did not produce an appropriate product-specific layout. These are custom art-direction choices informed by its accessibility, touch, feedback and Next.js guidance; the generic generated landing-page layouts are not requirements.

## 2. Design tokens

Implement in `src/styles/tokens.css`; expose semantic Tailwind names through the pinned Tailwind version's supported theme mechanism. Raw color values are permitted only here and in approved brand SVG artwork.

```css
:root {
  --canvas: #f7f6f0;
  --surface: #ffffff;
  --surface-soft: #eeeee5;
  --ink: #202b25;
  --ink-muted: #58645c;
  --brand: #245c43;
  --brand-hover: #1c4935;
  --brand-soft: #e8f0e8;
  --on-brand: #ffffff;
  --accent: #a4482b;
  --accent-soft: #f7e9df;
  --border: #d9ddd3;
  --control-border: #7d897e;
  --focus: #245c43;
  --warning: #805500;
  --warning-soft: #fff3d4;
  --danger: #b42318;
  --danger-soft: #fff0ed;
  --success: #245c43;
  --shadow-card: 0 2px 6px rgb(32 43 37 / 3%);
  --shadow-popover: 0 12px 36px rgb(32 43 37 / 12%);
  --radius-control: 10px;
  --radius-card: 16px;
  --radius-feature: 24px;
  --radius-pill: 999px;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  --font-editorial: Georgia, "Times New Roman", serif;
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
  --motion-fast: 120ms;
  --motion-standard: 180ms;
  --ease: cubic-bezier(.2,.8,.2,1);
}
```

These system font stacks intentionally require no external font download. The same pinned browser/OS image must be used for visual comparisons. Use Georgia only for the wordmark, home headline, destination h1 and major page titles. Form labels, prices and body remain sans-serif. Do not substitute another font to make screenshot diffs pass.

| Text role | Desktop size / line-height / weight | Mobile (<768) |
|---|---|---|
| Wordmark | 27 / 32 / 700, editorial, tracking -1px | 25 / 30 |
| Home headline | 64 / 68 / 400, tracking -2px | 40 / 44, tracking -1px |
| Destination title | 56 / 62 / 400, tracking -1.5px | 38 / 44 |
| Page title | 40 / 48 / 400 editorial | 30 / 38 |
| Section title | 26 / 34 / 600 sans | 23 / 30 |
| Card title | 20 / 28 / 600 | 18 / 26 |
| Card price | 28 / 34 / 650, tabular figures | 25 / 32 |
| Body / input | 16 / 26 / 400 | same |
| Label / button | 14 / 20 / 600 | same; input value remains 16 |
| Supporting text | 13 / 20 / 400 | same |
| Eyebrow | 12 / 18 / 650, uppercase, tracking 1.6px | same |

Normal text contrast >=4.5:1. Use `--control-border` for controls whose boundary communicates affordance; the lighter `--border` is for decorative card separators. Focus outline 2px plus 3px offset. Body text never relies on pale terracotta or green. Price suffix is 13px muted text separated by 4px; `₹650` and `/ room / night` stay visually associated but may wrap at very narrow widths.

Layering: base 0, sticky header 20, sticky category bar 25, dropdown 40, composer sticky footer 45, dialog backdrop 60, dialog 70, toast 80. Reduced-motion mode disables transforms/transitions/scroll animation. No entrance animations on the whole feed.

## 3. Responsive layout and primitives

Breakpoints: mobile <768; tablet 768–1023; desktop >=1024; wide >=1280. Main container max-width 1,200 including content, centered. Horizontal gutters: 16 mobile, 24 tablet, 32 desktop until max-width. At 1440 the content starts x=120 and ends x=1320; at 390 it starts x=16 and ends x=374.

Desktop destination/detail layout: `minmax(0,1fr) 320px` with 32px gap, producing 848px main at 1,200 width. Use a single column below 1024. Sidebar moves below main content; never precedes the first practical tip on mobile. Composer max-width 720, with a 16px mobile outer gutter. All grid/flex text children use `min-width:0`; long URLs/tokens wrap with `overflow-wrap:anywhere`.

Header: 72px desktop, 64px mobile; sticky top 0, opaque canvas background, subtle bottom border, matching container. Wordmark left, navigation right. Public nav: `Explore` → home, `Share a tip` → destination search unless destination context is available, `Sign in` outlined. Signed-in replaces Sign in with a 36px initial inside a 44px menu target; menu has `My contributions`, `Community guidelines`, `Sign out`. On mobile hide desktop text links and retain wordmark + Sign in/account. Contextual Add button remains in the page; no redundant floating action button or bottom navigation bar.

Footer: top border; 24px vertical padding; wordmark/tagline left, guidelines/privacy/terms/contact-removal links right, wrap to stacked rows on mobile. Footer is part of normal document flow. Do not place promotional CTAs beneath every page.

| Component | Dimensions and appearance | Interaction/state contract |
|---|---|---|
| Primary button | min-height 48, horizontal padding 20, radius 10, brand fill/white text, 18px icon + 8 gap | hover brand-hover; active translateY(1px); disabled opacity .5 with true disabled attribute; busy spinner + stable text/width |
| Secondary button | same geometry; surface, control-border, ink | hover surface-soft; focus ring; not just low-contrast text |
| Quiet action | min-height 44, horizontal padding 10, transparent | subtle brand-soft hover; always readable label |
| Input/select | 48 min-height, surface, control-border, radius 10, padding 12 14, 16px text | label above by 8; error border danger + error text; no placeholder-only label |
| Textarea | min-height 136, vertical resize, padding 14, body font | visible character counter below; label and helper tied through IDs |
| Category choice | 44 min-height, padding 10 14, radius pill, icon 18 + gap 8 | selected brand/white; unselected surface/border; aria-pressed or semantic radio |
| Status badge | min-height 28, padding 4 8, radius 6, 12px/18 medium | noninteractive; text + 14px icon; warning changes more than color |
| Card | surface, 1px border, radius 16, padding 24 desktop / 20 mobile | subtle shadow; only link title/navigation area is a link; controls not nested inside anchors |
| Separator | 1px border color | 16–20 vertical margins as specified per component |
| Dialog | width min(440, viewport-32); padding 28 desktop /24 mobile; radius 20 | Radix dialog, labelled title, Escape and close button, focus trap, restore focus to trigger; body scroll locked |
| Toast | max-width 420, padding 12 16, radius 12 | role=status, 5 seconds; critical failures also stay inline; one live region |
| Avatar | 32 circle on card; 40 on detail; surface-soft/brand, initial | decorative next to name; no fake photograph |

Use Lucide icons, 1.75 stroke, consistent 18 or 20 sizes: Compass, Search, MapPin, Plus, BedDouble, Utensils, BusFront, Mountain, Lightbulb, Check, Clock3, ThumbsUp, Flag, ArrowUpRight, ArrowRight, X, ImagePlus, Phone, Copy, ChevronDown, MoreHorizontal. Decorative icons have `aria-hidden`; icon-only controls have descriptive accessible names. Google button uses the official Google G asset without recoloring; other icons remain Lucide. Brand compass may be a small repo-native SVG matching the reference.

## 4. Home — `/`

Desktop layout:

1. Header.
2. Hero in two columns: `minmax(0,1fr) 400px`, gap 64, padding-top 64 and bottom 56. Left content max-width 680. Right is a static notebook illustration, not a carousel or photo banner.
3. Eyebrow `FOR THE WAY YOU ACTUALLY TRAVEL` in brand color. Margin below 16.
4. H1 `A little local knowledge.\nA better trip.` Use natural two-line layout as the reference, with second phrase editorial italic/brand. No forced nonbreaking sentence. Margin below 20.
5. Body max-width 540: `What travelers paid, how they got around, and the little things worth knowing.` Margin below 28.
6. Search label `Where are you going?` above the field. Search surface 64px desktop /56 mobile, 12 radius, control-border, Search icon left, input, 44px green arrow submit button right. Placeholder `Try Badami, Hampi, Varkala…`.
7. Suggested destinations beneath, gap 8, 13px; text links each 44px minimum hit area. `Badami`, `Hampi`, `Varkala`. These are navigation shortcuts, not fake popularity.
8. Notebook panel: 400×340 desktop, brand-soft fill, radius24, border, topographic line SVG behind with low contrast, foreground paper panel inset24, slight 2deg rotation. Paper says `FROM ONE TRAVELER TO ANOTHER`, then `Good trips start with useful details.` and three rows `What you paid`, `When you visited`, `What to know`. No fabricated review/testimonial/count.
9. Section `Start somewhere good` + supporting `Practical notes from across India.`; margin below24.
10. Six destination tiles in 3 columns, gap20. Each is 148 min-height with padding24, a small tinted 44px icon block, place name 22/30, state 13/20, real tip count if >0 or `Be the first to add a tip`. Arrow top/right or aligned right. Tiles are single accessible links. Do not make six large landscape photo cards that push information below the fold.

Mobile: hero single column, padding-top32, bottom32, h1 max-width358; hide the right notebook decoration entirely. Search remains above suggested links. Destination tiles become 2 columns with gap12, padding16, min-height152; at <360 they become 1 column. No viewport-wide horizontal scrolling. Footer follows tiles after48.

Search suggestion dropdown anchored 8px below field, same width, surface/radius12/shadow, max-height360 with its own scroll only when needed; 8px inner padding, each result row64 min-height with name and state. Loading uses 3 skeleton rows; zero results text includes retry by editing the query. Search errors show `Couldn't load destinations. Try again.` with a real retry control. Search page reuses the destination tile grid and displays the submitted query as escaped text.

## 5. Destination — `/destinations/badami`

Desktop top: padding-top32. Breadcrumb `Explore / Karnataka` (Explore link, state plain text); margin-bottom20. Header block with title/description left and `Add a tip` right aligned at title baseline. Name 56/62; description `Small discoveries. Useful details. Shared by travelers.` at 16/26; metadata row `18 traveler tips · Karnataka, India` below12. Counts always reflect database values.

At mobile: top padding24, breadcrumb margin-bottom16, title38/44; Add button sits on a separate row below description/metadata with full width and margin-top20. No hero photograph. On destination screens the main action must not be displaced by the mobile keyboard or overlap a filter.

Category filter wrapper margin-top28, padding-bottom20, border-bottom. Desktop pills in one row, gap8; sort aligned right where space permits. Mobile categories form a three-column grid with 8 gap; pill labels remain fully visible; sort becomes a separate row below16. Use URL navigation for filter values; `All` selected by default. At tablet or narrow desktop wrap rather than squeezing labels. Category bar can be sticky at header height only on desktop; mobile is in document flow to preserve reading area.

Below filter: margin-top24, desktop 848/320 grid; main heading row `Latest from travelers` + count (or selected category label). Sort is a native styled select `Recent visits` / `Newest shared`, not a custom dropdown requiring a new keyboard model.

Sidebar begins aligned with first card. First panel brand-soft/padding24/radius16: `Been here recently?`, short text, quiet `Share what you learned` linking to composer. Second panel margin-top16: `A note on prices`, 14/22 text `These are amounts travelers reported paying. Prices and availability can change.` with Clock icon. No misleading aggregate price range or pseudo analytics widget.

### Contribution card anatomy

Cards stacked with16 gap. Target typical height 240–310 on desktop; natural content height, never fixed clipping.

1. Top row: category icon + uppercase 11–12px label left; freshness badge right, wrap with 8 gap when necessary.
2. Margin-top12: title link, 20/28. Optional thumbnail sits right at96×96 with12 radius; mobile72×72. Without photo, text occupies full available width. No empty image box.
3. Price line margin-top8: price28/34 + unit suffix; omit entire line when unknown. Secondary transport duration/room type/dish rendered as compact readable text below4.
4. Body margin-top12, 16/26, max3 lines in list. A visually truncated excerpt has `Read tip` link to detail; preserve full body in detail. Do not truncate prices, dates or category labels.
5. Date/attribution row margin-top16: `Visited Aug 2026` + separator + `Amal` (fictional in fixture). `Last confirmed Sep 2026 · 7 travelers` is a separate line when present; no exact invented day.
6. Separator margin-top16; actions row padding-top12: `Still accurate` with check, `Helpful 12` with thumbs-up; `Changed` and `Report` in a labelled More menu on list cards. Detail exposes Changed openly. Actions wrap without overlap on mobile. Each target at least44px high.

`Change reported` gets warning background and links to updates. Never place green recently-confirmed badge alongside it as a competing primary status; actual confirmation date remains below. Author cards replace confirm/helpful with `Your tip` text; menu offers Edit/Delete. Guest buttons retain same dimensions and open sign-in on activation.

Skeleton: 3 card placeholders matching title, price, 2 body lines and footer; no unreserved full-height spinners. Empty destination: Lightbulb icon44, `No tips here yet`, sentence `Know something useful about Badami? Help the next traveler.`, primary `Add the first tip`. Empty category: `No transport tips yet` + `Add a transport tip` and quiet `See all tips`. Server error: retain page shell and retry; never falsely display an empty state for a failed request.

## 6. Contribution detail — `/tips/[id]`

Container/padding matches destination. Breadcrumb `Badami / Transport`. Main white card padding32 desktop /20 mobile; aside320 on desktop. H1 title32/40 sans (can wrap). Category badge above; More menu right; price40/48 desktop /32/40 mobile with unit, then 16px details such as `Local bus · About 40 min`.

Useful text uses18/30 desktop and16/27 mobile with generous24 separation. Show visited month and contributor prominently above reaction controls. Fact grid two columns on desktop, one mobile, only populated facts: mode, duration, booking method, room type, dish, walk, location. Missing fields create no blank rows or `N/A` wall.

Photos follow practical text/facts at24 margin: one full width; two columns for2–3 images on desktop, one on mobile; contain-fit, soft background, max-height440, preserve full image on enlarge. Lightbox has labelled close, previous/next if needed, Escape, keyboard focus, and descriptive alt text. No auto sliding carousel.

`Know this information?` action section with Still accurate, Changed, Helpful, Report; 8–12 gaps and wrapping. Confirmation panel (aside desktop, inline after facts mobile): `How recent is this?`, `Visited Aug 2026`, `Last confirmed Sep 2026`, `7 travelers confirmed this version`. Explain `Community confirmations reflect travelers' experiences.` If no confirmations use `No confirmations yet` without a red warning.

Contact block appears only when hasContact. `Contact shared by a traveler` and `Show contact` secondary button; after reveal, number, `Call`, `Copy`, `Report this number`. Copy success announces `Number copied`. Failed reveal keeps button and inline retry. Location link says `Open in Maps` and warns nothing unsolicited; link opens externally with correct rel.

Updates section below main report: h2 `Traveler updates`, count, timeline border on left, each update a compact card with traveler, observation month, changed text and revised price/unit. Include `Original report: ₹35 / person / trip` and `Update reported: ₹40 / person / trip` when both exist; do not imply moderator verification. Root original is never overwritten by another user. Earlier-version updates live in a disclosure with the edit notice defined in the technical plan. Direct update URLs show parent link and full update details.

Share link is a quiet `Copy link` action using canonical tip URL; no social-share toolbar. Copy has feedback and fallback to selected text if clipboard unavailable. Deleted/hidden not-found view: `This tip isn't available` with destination/home link; don't reveal moderation details publicly.

## 7. Composer

Composer is a page, not a fragile full-screen modal. Desktop max-width720, margin-top32; mobile fills the content column below normal header. Back link `Back to Badami`, then editorial h1 `Help the next traveler.` and helper `One useful detail is enough.`

Destination context row is read-only `MapPin Badami, Karnataka`; no repeated destination picker. Category group label `What did you discover?`, Quick tip first, then Stay/Food/Transport/Explore. Wrap choices 3 columns mobile and fit/wrap on desktop. Switches preserve common body/month/photos; category-only field values live in per-category temporary memory but only active-category values are submitted. Price/unit changes must be visible and reviewed when changing categories; don't carry an incompatible unit silently.

Form surface: white, 1px border, radius20, padding28 desktop /20 mobile; sections spaced24. One submission stage with progressive optional details; no stepper, preview requirement or wizard. Every field except useful tip is labelled `(optional)` unless it is the selected/default visited month.

| Category | Visible field order after category selector | Collapsed `Add details` |
|---|---|---|
| Quick tip | `What should the next traveler know?` textarea; Visited | Price + explicit unit, location/maps, contact, photos |
| Stay | `Where did you stay?` optional; `What did you pay?` optional + unit selector; tip textarea; Visited | Room type, booking method, contact, location/maps, photos |
| Food | `Place` optional; `What did you try?` optional; price optional + unit; tip; Visited | Location/maps, contact, photos |
| Transport | From + To side by side desktop/stacked mobile; mode optional; fare optional + unit; tip; Visited | Approximate duration, location/maps, contact, photos |
| Explore | Place optional; entry price optional + unit; tip; Visited | Walk time, location/maps, contact, photos |

For category forms on small screens prioritize tip usability over packing every field above fold; only Quick tip guarantees minimal initial length. No optional field may accidentally become required through browser validation or Zod.

Quick tip textarea placeholder: `A bus fare, a good meal, a useful contact, or something you wish you'd known…`; label stays visible. Helpful text beneath: `Specific details help more than a review.` Counter at right `0 / 1,000`, appears muted and switches to error with text when over max. Error for too short: `Add a little more detail so another traveler can use this tip.`

Visited row: label `Visited`; native select with `This month (Sep 2026)`, `Last month (Aug 2026)`, `Choose a month…`, `Not sure`. Choosing month reveals month input with max=current India month; fallback separate month/year selects where needed. Selected date remains visible; do not default secretly. Carry last explicitly selected month into Add another within the same destination/session, with a clear label.

Optional controls beneath: `Add details` disclosure, plus `Add photos` action. Photos may also be linked from details but render one shared upload control, not duplicate inputs. Up to3 previews96×96, status text, remove44×44 target; can reorder through Move left/right buttons rather than drag only. Caption/alt is optional; default alt `Traveler photo attached to {title}`; never infer content using AI.

Footer inside composer: top border, padding-top20, full-width primary `Share tip` on mobile /right-aligned min-width144 desktop; helper `Shared from your own experience.` on left desktop/above mobile. Mobile footer becomes sticky bottom0 only while composer is active, padding-bottom `max(16px, env(safe-area-inset-bottom))`, opaque white, and reserves matching body space. It must remain reachable with the soft keyboard; use visual viewport-safe layout and verify on a real mobile browser. Do not pin both page header and category choice rows within composer.

Submission states: idle → validating → auth needed or submitting → success/error. Keep button text `Sharing…` with spinner during submit. Never disable all fields for a failed request. If photo is uploading, primary reads `Finishing photos…`; offer explicit `Share without photos` that detaches/cancels pending assets. Do not silently drop an attachment.

Success replaces form in place: 48px green check badge, `Tip added`, helper, a View tip secondary link, then `Add another thing about Badami?` with five category options. Choosing one creates a new mutation key and clears tip/price/contact/photos; retains destination/visited choice. Back to destination shows new root tip; linked update success offers `View updated discussion`.

Edit mode: h1 `Edit your tip`, primary `Save changes`; explain `New edits start a new version. Earlier confirmations stay with the previous version.` Update mode: h1 `What has changed?`, compact original tip summary, category/destination locked, textarea label `Tell travelers what's different`, primary `Share update`. Conflict: inline persistent alert, keep draft, action `Review latest version`; no blind resubmit overwrite.

## 8. Authentication, account and moderation

Google sign-in dialog width440, centered, Compass icon32, h2 `Share what you know`, text `Continue with Google to add tips and help keep information useful.`, full-width white Google button48, close44 target. Footer `By continuing, you agree to our Terms and Privacy Policy.` Both links work. Below: `Your tip is saved in this tab.` only when it actually is. No email input, password field, secondary provider or mandatory onboarding.

Sign-in route uses the same panel centered in the canvas below header. OAuth failure: `Google sign-in didn't finish. Your draft is still here.` only if restored; provide `Try again` and `Back to my tip`. Cancellation must not erase the draft. Avoid error text falsely asserting storage when unavailable.

`/me`: max-width848; title `My contributions`; account initials/name and Sign out; all/published/hidden tabs; existing cards with Edit/Delete, clear hidden/deleted labels. No follower count, earned badges or reputation chart. Empty: `Your first tip could make someone's trip easier.` plus destination search. Delete dialog: `Delete this tip?`, `It will no longer be visible to travelers.`, Cancel/Delete; busy state and errors.

Moderation: max-width1200, title `Reports`; tabs Contributions/Contacts; queue rows on desktop, cards mobile; fields target title/destination, reason, reported time, status, view action. Detail drawer/dialog shows content, report context, previous moderation events and labelled disposition/reason form. Primary action matches chosen disposition (`Hide tip`, `Hide contact`, `Dismiss report`), no generic unlabelled Save. Destructive actions require explicit dialog confirmation; no batch destructive actions in MVP. Forbidden page does not expose reports or user emails.

Contact-removal page: max-width640, title `Request contact removal`; tip URL prefilled when linked, explanation textarea, optional reply email, hidden honeypot, submit. Confirmation `Your request has been sent for review.` Do not state removal is complete until a moderator performs it.

Policy pages share readable max-width720, 16/28 body, real paragraphs and lists. Content describes actual data use and moderation processes; no placeholder legal text in production.

## 9. Interaction and state checklist

| Area | Required states |
|---|---|
| Search | empty, typing, pending, results, keyboard highlight, no match, server error, cancelled stale request |
| Lists | populated, loading more, empty destination, empty category, query error, invalid cursor, refreshed after own write |
| Composer | empty, category change, draft restored, invalid, offline, auth redirect/cancel, upload preparation/progress/error, submitting, duplicate retry, conflict, success |
| Reactions | guest prompt, author unavailable, pending, successful, rollback, already confirmed, change month, undo, stale revision, rate limited |
| Photos | selection, decoding, preparing, uploading %, verifying, ready, remove, reorder, failed retry, unsupported format, enlarged view |
| Contact | absent, hidden-by-default, pending, revealed, copy success/failure, removed, reveal error, removal request |
| Detail | current report, no confirmations, old information, disputed update, old-version confirmations, unavailable |
| Account/moderation | guest/forbidden, empty, list, action pending/success/failure, confirm delete/hide, concurrent status conflict |

Error presentation: field errors under the input with aria-describedby; submission error summary at form top linked to invalid fields; focus first invalid field after submit. Do not show errors while typing before a field has been blurred/submitted. Non-field errors remain above primary action, and toast may supplement them. Preserve readable layout when any error wraps onto multiple lines.

Confirm/Helpful feedback begins within100ms through pressed/pending state, but displayed counts settle to server truth. Announce one complete phrase, e.g. `Thanks. You confirmed this tip for September 2026.` Do not make every changing badge a separate live region. Retry messages specify whether text/photo/action is retained.

## 10. Fidelity acceptance

At 1440 and390 widths compare all four compositions against the reference. Check container edges, header height, headline size/wrapping, title/price prominence, green tones, card padding/radius, category wrap and CTA placement. At320 check no clipping or horizontal scroll; at200% text zoom allow layout reflow and added height rather than maintaining rigid image dimensions. Reference-toolbar offsets are not product offsets.

Forbidden shortcuts: stock shadcn styles left unthemed; placeholder-only fields; all content in one oversized card; tiny gray dates; all cards clickable with nested buttons; horizontal chip overflow hiding categories; forced heights cutting off traveler text; fake loading delays; decorative photographs replacing information; emoji icons; auth on read; identical error/empty states; accepting autogenerated screenshots without a reference comparison.

Record screenshots and any justified deviations per work order. Never mark visual work complete solely because the build compiles.
