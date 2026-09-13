# TrailNote Composer — Implementation Specification

This document defines the implementation specification for TrailNote’s contribution composer.

The composer is the core contribution surface of TrailNote. It must help a traveler share one genuinely useful piece of information with the next traveler without making the contributor feel like they are filling a long form.

> **Design principle:** Ask the traveler to tell a useful story first. Add structure only when that structure helps the next traveler.

The composer must optimize for both sides:

- **Contributor:** fast, low-friction, conversational, optional enrichment.
- **Reader:** specific, actionable, recent, first-hand travel information.

---

## 1. Primary goal

A traveler should be able to publish a useful tip in roughly **20–30 seconds**.

Minimum publishable contribution:

1. destination context,
2. category,
3. useful tip text,
4. visited month or explicit “not sure”.

Everything else is optional.

Do not make structured fields mandatory merely because the backend can store them.

---

## 2. Routes and entry points

Primary route:

```text
/destinations/[slug]/add
```

Examples:

```text
/destinations/badami/add
/destinations/hampi/add
```

The same composer component should support prefilled context.

### From destination page

```text
Badami
[ Add a tip ]
```

Initial state:

```ts
{
  destinationSlug: "badami",
  category: "general"
}
```

### From a category empty state

```text
No transport tips yet
[ Add a transport tip ]
```

Initial state:

```ts
{
  destinationSlug: "badami",
  category: "transport"
}
```

### From “Changed” on an existing contribution

Initial state:

```ts
{
  mode: "update",
  destinationSlug: "badami",
  category: "transport",
  relatedTipId: "tip_123"
}
```

Prompt:

```text
What changed?
```

This flow creates a linked traveler update. It must not overwrite the original contribution.

---

## 3. Page layout

### Desktop

Recommended:

```css
grid-template-columns: minmax(0, 760px) 280px;
gap: 40px;
```

Structure:

```text
← Back to Badami

Help the next traveller.          What makes a tip useful?
One useful detail is enough.      ------------------------
                                  How much?
Badami, Karnataka                 How do I get there?
                                  When?
Category selector                 What surprised you?

Main composer
```

The right helper panel is informational only.

### Tablet/mobile

Use a single column.

Hide the helper panel.

Do not place the composer inside a modal.

---

## 4. Main hierarchy

Use this order:

```text
Back link

Page title
Subtitle

Destination context

Category selector

Main conversational prompt
Main textarea

Optional detail prompts

Visited month

Optional reader preview

Share action
```

Do not ask for the destination again if the route already identifies it.

---

## 5. Page heading

Use:

```text
Help the next traveller.
One useful detail is enough.
```

Destination context:

```text
📍 Badami, Karnataka
```

Destination identity comes from the route/server context, not an editable hidden field.

---

## 6. Categories

Supported categories:

```ts
export type TipCategory =
  | "general"
  | "stay"
  | "food"
  | "transport"
  | "explore";
```

Labels:

```text
Quick tip
Stay
Food
Transport
Explore
```

Default:

```ts
category = "general";
```

Unless the entry point explicitly prefills another category.

### Category interaction

Category controls must:

- use buttons,
- expose `aria-pressed`,
- have >=44px touch targets,
- wrap on mobile,
- never require horizontal scrolling,
- update prompts and optional detail suggestions,
- preserve the user's main text when switching categories.

---

## 7. Category-specific prompts

### Quick tip

Prompt:

```text
What do you wish you knew before coming here?
```

Helper:

```text
A small detail can save someone time, money, or confusion.
```

Placeholder:

```text
The ticket counter only accepted cash when I visited.
```

Suggested optional details:

```text
Price · Timing · Location · Photo
```

### Stay

Prompt:

```text
What should someone know before staying here?
```

Helper:

```text
Room price, booking method, location, contact, or something unexpected.
```

Placeholder:

```text
I called directly and got the room for ₹650, cheaper than the online rate.
```

Suggested details:

```text
Room price · How you booked · Contact · Location · Photo
```

### Food

Prompt:

```text
What did you eat, and what should someone know?
```

Helper:

```text
Dish, price, portion size, timing, or what to order.
```

Placeholder:

```text
The meals were ₹90 and sold out by around 1:30 PM.
```

Suggested details:

```text
Price · What you ordered · Timing · Location · Photo
```

### Transport

Prompt:

```text
How did you get there, and what would make the journey easier?
```

Helper:

```text
Route, fare, travel time, boarding point, or last service.
```

Placeholder:

```text
The local bus to Pattadakal cost ₹35 and took around 40 minutes.
```

Suggested details:

```text
Fare · Route · Travel time · Boarding point · Timing · Photo
```

### Explore

Prompt:

```text
What should someone know before visiting this place?
```

Helper:

```text
Entry fee, best time, route, time needed, or something easy to miss.
```

Placeholder:

```text
Go before 4 PM — the last entry was earlier than I expected.
```

Suggested details:

```text
Entry fee · Best time · Time needed · Location · Photo
```

---

## 8. Main tip field

Primary field:

```ts
tipText: string;
```

Recommended constraints:

```ts
minimumGuidanceLength = 12;
maximumLength = 1000;
```

Do not use a large minimum character limit as a proxy for usefulness.

A short tip can be excellent:

```text
Last bus to Badami was 7:30 PM.
```

The field should show:

```text
Specific details are more useful than reviews.

132 / 1,000
```

Do not label the field “Description”.

Use the category-specific conversational prompt.

---

## 9. Low-value tip guidance

Weak examples:

```text
Nice
Amazing place
Good hotel
Must visit
Beautiful place
```

For obviously generic submissions, do not show:

```text
Invalid description
```

Show:

```text
Give the next traveler one detail they can use.

For example:
price · route · timing · what to order · something to avoid
```

MVP may use a small heuristic:

```ts
const genericPatterns = [
  /^nice[.! ]*$/i,
  /^good[.! ]*$/i,
  /^great[.! ]*$/i,
  /^amazing[.! ]*$/i,
  /^beautiful[.! ]*$/i,
  /^awesome[.! ]*$/i,
  /^must visit[.! ]*$/i,
  /^worth visiting[.! ]*$/i,
];
```

Do not reject otherwise reasonable tips merely because they do not contain structured values.

---

## 10. Progressive optional details

Below the main textarea:

```text
Anything else worth adding?

Optional prompts to help you remember useful details.
You don't need to fill everything.
```

Render contextual chips such as:

```text
[ ₹ Fare ] [ Route ] [ Timing ]
[ Boarding point ] [ Photo ]
```

Selecting a chip reveals only that field.

The chips are **memory prompts**, not completion requirements.

Never show:

```text
Required fields remaining: 4
```

If a chip is collapsed after the user entered a value, preserve that value locally unless the user explicitly clears it.

---

## 11. Stay details

Optional fields:

```ts
type StayDetails = {
  placeName?: string;
  priceAmount?: number;
  priceUnit?: "room_night" | "person_night" | "other";
  bookingMethod?:
    | "walk_in"
    | "called_directly"
    | "online"
    | "local_contact"
    | "other";
  locationNote?: string;
};
```

Public contact is handled separately.

Example UI:

```text
Where did you stay?
[ Green View Lodge ]

What did you pay?
[ ₹650 ] [ per room / night ▼ ]

How did you book?
[ Called directly ▼ ]

Where exactly?
[ 10-minute walk from the bus stand ]
```

---

## 12. Food details

Optional fields:

```ts
type FoodDetails = {
  placeName?: string;
  itemName?: string;
  priceAmount?: number;
  priceUnit?: "meal" | "item" | "person" | "other";
  timingNote?: string;
  locationNote?: string;
};
```

Example:

```text
Place
[ Krishna Bhavan ]

What did you order?
[ South Indian meals ]

Price
[ ₹90 ] [ per meal ▼ ]

Anything useful about timing?
[ Some dishes sold out by 1:30 PM ]
```

---

## 13. Transport details

Optional fields:

```ts
type TransportDetails = {
  fromPlace?: string;
  toPlace?: string;
  mode?: string;
  fareAmount?: number;
  fareUnit?: "person_trip" | "vehicle_trip" | "other";
  durationMinutes?: number;
  boardingPoint?: string;
  timingNote?: string;
};
```

Example:

```text
From
[ Badami ]

To
[ Pattadakal ]

Mode
[ Local bus ▼ ]

Fare
[ ₹35 ] [ per person / trip ▼ ]

Approximate travel time
[ 40 minutes ]

Where did you board?
[ Main bus stand ]

Anything useful about timing?
[ Last bus was around 7:30 PM ]
```

---

## 14. Explore details

Optional fields:

```ts
type ExploreDetails = {
  placeName?: string;
  entryAmount?: number;
  entryUnit?: "person" | "vehicle" | "other";
  timingNote?: string;
  durationMinutes?: number;
  locationNote?: string;
};
```

Example:

```text
Place
[ Badami caves ]

Entry fee
[ ₹40 ] [ per person ▼ ]

Anything useful about timing?
[ Go before 4 PM ]

Time needed
[ Around 2 hours ]
```

---

## 15. Visited month

Freshness is a core TrailNote feature.

Keep this field visible by default.

Prompt:

```text
When were you there?
```

Helper:

```text
Freshness helps the next traveler judge the tip.
```

Recommended options:

```text
September 2026
August 2026
July 2026
Choose another month…
Not sure
```

Normalized value:

```ts
visitedMonth: string | null;
```

Preferred format:

```ts
"2026-09"
```

Unknown:

```ts
null
```

If the current month is preselected, it must be visible.

Do not submit a hidden date the user never saw.

---

## 16. Photos

Photos are optional.

Recommended maximum:

```ts
maxPhotos = 3;
```

When the photo prompt opens:

```text
Add useful photos

Photos help most when they show something another traveler needs to recognize.

Room · Menu · Ticket · Bus stop · Entrance · Trail junction
```

The upload control must not dominate the composer.

Do not encourage the composer to become a scenic-photo or selfie uploader.

Client validation:

- supported MIME types,
- raw file-size limit,
- maximum 3 files.

Server validation remains authoritative.

---

## 17. Public business/service contacts

Useful examples:

- lodge number,
- taxi/service number,
- tour operator number,
- public service contact.

Label:

```text
Public business/service contact
```

Do not label only:

```text
Phone number
```

The UI should discourage private personal numbers.

If provided:

- normalize before storage,
- follow the separate contact-storage model,
- do not expose the number in the initial public page HTML,
- reveal through the dedicated contact endpoint,
- support contact-removal reporting.

---

## 18. Reader-first preview

Desktop may show a compact live preview:

```text
THE NEXT TRAVELER WILL SEE

TRANSPORT · Visited Sep 2026

The local bus to Pattadakal cost ₹35 and took around 40 minutes.
Autos quoted around ₹400.
```

This is not a preview step.

It updates automatically from:

- category,
- visit month,
- tip text.

The preview may be omitted on mobile to reduce vertical length.

Never require confirmation on a separate preview page.

---

## 19. Desktop helper panel

Desktop-only helper:

```text
What makes a tip useful?

How much?
Room price, fare, meal cost, entry fee.

How do I get there?
Route, boarding point, walking direction.

When?
Last bus, closing time, best time, waiting time.

What surprised you?
Cash only, wrong entrance, unexpected cost, hidden shortcut.

You're helping another traveler, not filling a database.
```

Rules:

- no checklist completion score,
- no mandatory checkboxes,
- no gamification,
- hide on smaller screens.

---

## 20. Submit flow

CTA:

```text
Share tip
```

Do not use:

```text
Submit
```

Submission sequence:

```text
Validate locally
      ↓
Preserve draft
      ↓
Signed in?
  ┌───────┴───────┐
  │               │
 yes              no
  │               ↓
  │        Google sign-in
  │               ↓
  └───────┬───────┘
          ↓
     Publish tip
          ↓
     Success state
```

---

## 21. Authentication timing

Do not require sign-in before writing.

Preferred:

```text
Share a tip
→ Write tip
→ Share tip
→ Sign in with Google
→ Return
→ Publish
```

Sign-in dialog:

```text
Sign in to publish your tip

Your tip is saved while you sign in.
Reading TrailNote never requires an account.

[ Continue with Google ]
```

The complete draft must survive OAuth navigation.

---

## 22. Draft persistence

Use client-side persistence.

Recommended initial implementation:

```text
sessionStorage
```

Key:

```ts
`trailnote:composer:draft:${destinationSlug}`
```

Draft:

```ts
type ComposerDraft = {
  destinationSlug: string;
  category: TipCategory;
  tipText: string;
  visitedMonth: string | null;
  activeOptionalFields: string[];
  details: Record<string, unknown>;
  updatedAt: number;
};
```

Do not persist `File` objects to sessionStorage.

Persist meaningful changes using a debounce:

```text
300–500ms
```

Clear only after:

- successful publish, or
- explicit discard.

---

## 23. Client state

Suggested shape:

```ts
type ComposerState = {
  category: TipCategory;
  tipText: string;
  visitedMonth: string | null;

  activeOptionalFields: Set<string>;

  details: {
    placeName?: string;
    itemName?: string;

    priceAmount?: number;
    priceUnit?: string;

    fromPlace?: string;
    toPlace?: string;
    mode?: string;

    durationMinutes?: number;
    timingNote?: string;
    boardingPoint?: string;

    bookingMethod?: string;
    locationNote?: string;
    publicContact?: string;
  };

  photos: File[];
};
```

React Hook Form may be used, but dynamic category fields must preserve hidden values unless the user explicitly clears them.

If using React Hook Form, prefer:

```ts
shouldUnregister: false
```

unless backend semantics require otherwise.

---

## 24. Category configuration

Keep category behavior in configuration rather than scattered conditionals.

```ts
type CategoryConfig = {
  label: string;
  prompt: string;
  helper: string;
  placeholder: string;
  optionalFields: string[];
};

export const CATEGORY_CONFIG: Record<TipCategory, CategoryConfig> = {
  general: {
    label: "Quick tip",
    prompt: "What do you wish you knew before coming here?",
    helper: "A small detail can save someone time, money, or confusion.",
    placeholder: "The ticket counter only accepted cash when I visited.",
    optionalFields: ["price", "timing", "location", "photo"],
  },

  stay: {
    label: "Stay",
    prompt: "What should someone know before staying here?",
    helper: "Room price, booking method, location, contact, or something unexpected.",
    placeholder: "I called directly and got the room for ₹650, cheaper than the online rate.",
    optionalFields: ["price", "booking", "contact", "location", "photo"],
  },

  food: {
    label: "Food",
    prompt: "What did you eat, and what should someone know?",
    helper: "Dish, price, portion size, timing, or what to order.",
    placeholder: "The meals were ₹90 and sold out by around 1:30 PM.",
    optionalFields: ["price", "dish", "timing", "location", "photo"],
  },

  transport: {
    label: "Transport",
    prompt: "How did you get there, and what would make the journey easier?",
    helper: "Route, fare, travel time, boarding point, or last service.",
    placeholder: "The local bus to Pattadakal cost ₹35 and took around 40 minutes.",
    optionalFields: ["fare", "route", "duration", "boarding", "timing", "photo"],
  },

  explore: {
    label: "Explore",
    prompt: "What should someone know before visiting this place?",
    helper: "Entry fee, best time, route, time needed, or something easy to miss.",
    placeholder: "Go before 4 PM — the last entry was earlier than I expected.",
    optionalFields: ["price", "timing", "duration", "location", "photo"],
  },
};
```

---

## 25. Category switching behavior

When switching:

```text
Transport → Food
```

Always preserve:

```text
tipText
visitedMonth
photos
```

For structured details:

- preserve values in local state,
- hide irrelevant fields,
- exclude irrelevant fields from the outgoing payload,
- restore them if the user switches back.

Do not destroy user-entered values merely because they explored another category.

---

## 26. Submission payload

Suggested API:

```http
POST /api/destinations/:destinationId/contributions
Content-Type: application/json
```

Request:

```ts
type CreateContributionRequest = {
  category: TipCategory;

  body: string;

  visitedMonth: string | null;

  details?: {
    placeName?: string;
    itemName?: string;

    priceAmount?: number;
    priceUnit?: string;

    fromPlace?: string;
    toPlace?: string;
    mode?: string;

    durationMinutes?: number;
    timingNote?: string;
    boardingPoint?: string;

    bookingMethod?: string;
    locationNote?: string;
  };

  publicContact?: string | null;

  imageIds?: string[];
};
```

Destination ID should be resolved from the route/server context.

Do not trust a client-editable destination ID if the route already defines the destination.

---

## 27. Image upload sequence

Preferred:

```text
Select files
↓
Client validation
↓
Authenticate if required
↓
Upload/process files
↓
Receive image IDs
↓
Submit contribution with image IDs
```

Do not publish a contribution with unresolved image uploads unless the backend explicitly supports deferred attachments.

---

## 28. Validation

Client validation improves UX.

Server validation is authoritative.

Required:

```ts
category
body
visitedMonth or explicit unknown
```

Optional:

```text
all structured details
photos
public contact
```

Suggested body validation:

```ts
body.trim().length >= 12
body.length <= 1000
```

Numeric validation:

```ts
priceAmount > 0
durationMinutes > 0
```

Never convert absent numbers into zero.

---

## 29. Errors

### Inline usefulness guidance

```text
Give the next traveler one detail they can use.
```

### Publish failure

Keep all form state.

```text
We couldn't share your tip.

Your draft is still here.

[ Try again ]
```

### Authentication failure

```text
Sign-in didn't finish. Your tip is still saved.
```

### Photo failure

When possible:

```text
Retry
Remove photo
Share without this photo
```

Do not clear the main tip because an attachment failed.

---

## 30. Success state

After publish:

```text
✓ Tip shared

Thanks — the next traveler to Badami can now use this.

[ View your tip ]
[ Add another ]
```

Do not use:

```text
Contribution successfully created
```

Success copy should reinforce the product purpose.

---

## 31. Edit mode

Route:

```text
/tips/[id]/edit
```

Reuse the composer.

Heading:

```text
Edit your tip
```

CTA:

```text
Save changes
```

Prefill existing values.

Editing must not silently alter:

- author,
- creation time,
- unrelated confirmations,
- update history.

Follow the implementation contract's revision model for material changes.

---

## 32. Changed / update mode

Route:

```text
/tips/[id]/update
```

Show compact original context:

```text
Original report

Badami → Pattadakal
₹35 / person / trip
Visited Aug 2026
```

Prompt:

```text
What changed?
```

Example:

```text
I paid ₹40 in September.
```

The resulting update must link to the original contribution.

Never overwrite the original observation.

---

## 33. Mobile behavior

Priority order:

1. destination context,
2. category,
3. main tip,
4. optional details,
5. visited month,
6. share.

Rules:

- single column,
- no helper sidebar,
- no horizontal category scroll,
- no modal composer,
- optional detail chips wrap,
- only the composer submit bar may become sticky.

Sticky submit:

```text
You don't need to fill everything.

[ Share tip ]
```

Reserve enough bottom space so it never covers the final field.

---

## 34. Accessibility

Target WCAG 2.2 AA.

Requirements:

- visible labels,
- category buttons use `aria-pressed`,
- optional chips are actual buttons,
- >=44px touch targets,
- keyboard support,
- visible focus,
- inline errors connected with `aria-describedby`,
- error summary when several errors exist,
- modal focus trap,
- Escape closes auth modal,
- focus returns to the triggering control,
- no color-only status indicators,
- 200% zoom support,
- `prefers-reduced-motion` support.

---

## 35. Performance

Do not load mapping libraries on the composer page.

The composer initial bundle should contain only:

- form UI,
- category configuration,
- validation,
- draft persistence,
- authentication trigger,
- optional image UI.

Category-specific fields are small enough to remain in the same bundle.

---

## 36. Analytics

Never send tip text, phone numbers, image content, or user-written notes to analytics.

Allowed events:

```text
composer_opened
composer_category_selected
composer_optional_field_opened
composer_photo_added
composer_share_clicked
composer_auth_required
composer_publish_success
composer_publish_error
```

Allowed properties:

```ts
{
  category: "transport",
  optionalFieldCount: 3,
  photoCount: 1,
  signedIn: false
}
```

Never send:

```ts
{
  tipText: "...",
  publicContact: "...",
  locationNote: "..."
}
```

---

## 37. Suggested component structure

```text
components/
  composer/
    ComposerPage.tsx
    ComposerHeader.tsx
    DestinationContext.tsx
    CategorySelector.tsx
    TipPrompt.tsx
    OptionalDetailChips.tsx
    DynamicDetailFields.tsx
    VisitedMonthField.tsx
    PhotoPicker.tsx
    ReaderPreview.tsx
    ComposerHelperPanel.tsx
    ComposerSubmitBar.tsx
    ComposerAuthDialog.tsx
```

Supporting logic:

```text
lib/
  composer/
    category-config.ts
    validation.ts
    draft-storage.ts
    payload.ts
```

---

## 38. Reader-value test

Every optional field must answer:

> **Does this help the next traveler make a better decision?**

High-value information:

- actual price paid,
- route,
- boarding point,
- time needed,
- last service,
- best time,
- booking method,
- public business contact,
- something unexpectedly difficult,
- something that saved money,
- something that saved time,
- what changed,
- when the contributor visited.

Low-value information:

- generic praise,
- star-rating-style reviews,
- social captions,
- long descriptions with no practical detail.

The composer should gently encourage high-value information without forcing a long form.

---

## 39. Definition of done

The composer is implementation-ready when:

- Quick tip works with one sentence and a visit month.
- Quick tip is the default.
- Category changes update the prompt without erasing the main text.
- Optional structured fields are progressively disclosed.
- Optional fields remain optional.
- Visit month is always visible.
- Photos remain optional and limited.
- Weak-tip guidance is conversational.
- Signed-out users can write before authentication.
- OAuth round-trip preserves the draft.
- Publish errors preserve the draft.
- Category switching does not destroy hidden detail values.
- Irrelevant hidden values are excluded from the payload.
- Mobile has no horizontal category overflow.
- Sticky mobile submit does not cover content.
- Public contacts follow TrailNote's privacy model.
- Analytics never capture user-written contribution content.
- Accessibility requirements are met.

---

## 40. Final implementation rule

The composer must never feel like:

```text
Complete all required travel fields.
```

It should feel like:

```text
Tell the next traveler the one thing you wish you had known.
```

TrailNote should add structure only when that structure makes the contribution more useful to the person reading it later.
