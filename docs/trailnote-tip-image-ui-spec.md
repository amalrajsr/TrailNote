# TrailNote Tip Image Gallery — Exact UI Specification

## 1. Scope

This specification covers **only the image/gallery experience** on the tip detail route:

```text
/tips/[id]
```

It is based on the redesigned gallery reference:

```text
trailnote-tip-photo-gallery-redesign.html
```

This document intentionally does **not** include any unrelated tip-page UI such as:

```text
tip title
author block
useful details
freshness panel
reactions
updates
reporting
contact information
```

The goal is to make uploaded photos look consistent regardless of source resolution or orientation, while keeping the full original image available to the traveller.

---

# 2. Current product constraint

TrailNote currently allows a maximum of:

```text
3 photos per contribution
```

Because of this, the gallery should use intentionally designed layouts for:

```text
1 photo
2 photos
3 photos
```

Do not build a generic masonry/Pinterest-style gallery.

---

# 3. Core image behavior

Use two different presentation rules.

## Inline gallery preview

The inline gallery prioritizes:

```text
consistent layout
easy scanning
controlled page height
visual polish
```

For multi-image galleries, preview images may be visually cropped using:

```css
object-fit: cover;
```

## Full-screen viewer

The full-screen viewer prioritizes:

```text
seeing the complete original image
preserving aspect ratio
avoiding destructive cropping
```

Use:

```css
object-fit: contain;
```

The uploaded image itself should **not** be physically cropped.

---

# 4. Do not add manual cropping

Do not add a crop library or a contributor crop step at this stage.

Avoid:

```text
cropper UI
manual crop handles
new cropped image assets
destructive image modification
extra contribution-form friction
```

The current problem should be solved in the display layer.

The source image should remain unchanged.

---

# 5. Gallery section header

When photos exist, render an explicit gallery section.

Visual structure:

```text
Photos   2                         Open a photo to view it in full

[ gallery ]
```

Required elements:

```text
Photos
photo count
short discoverability hint
gallery
```

Recommended markup:

```tsx
<section
  className="detail-photo-section"
  aria-labelledby="detail-photos-title"
>
  <div className="detail-photo-head">
    <div className="detail-photo-title">
      <h2 id="detail-photos-title">Photos</h2>
      <span className="detail-photo-count">
        {photos.length}
      </span>
    </div>

    <span className="detail-photo-hint">
      Open a photo to view it in full
    </span>
  </div>

  ...
</section>
```

---

# 6. Gallery section spacing

Match the reference UI:

```css
.detail-photo-section {
  margin-top: 30px;
  padding-top: 26px;
  border-top: 1px solid var(--border);
}
```

Header:

```css
.detail-photo-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;

  margin-bottom: 14px;
}
```

Title group:

```css
.detail-photo-title {
  display: flex;
  align-items: center;
  gap: 9px;
}
```

Heading:

```css
.detail-photo-title h2 {
  font-size: 18px;
  line-height: 26px;
  font-weight: 650;
}
```

---

# 7. Photo count badge

Use a small neutral count badge.

```css
.detail-photo-count {
  min-width: 24px;
  height: 24px;

  display: grid;
  place-items: center;

  padding: 0 7px;

  border-radius: var(--radius-pill);

  background: var(--surface-soft);
  color: var(--ink-muted);

  font-size: 11px;
  font-weight: 700;
}
```

Do not make the count a bright badge.

---

# 8. Gallery discoverability hint

Desktop/tablet:

```text
Open a photo to view it in full
```

Style:

```css
.detail-photo-hint {
  color: var(--ink-muted);
  font-size: 12px;
}
```

Hide this text on small mobile screens:

```css
@media (max-width: 620px) {
  .detail-photo-hint {
    display: none;
  }
}
```

The gallery must remain discoverable through the visible image-viewer action described below.

---

# 9. Shared gallery container

For multi-image layouts:

```css
.detail-photo-gallery {
  position: relative;

  display: grid;
  gap: 8px;

  overflow: hidden;

  border-radius: 18px;

  background: var(--surface-soft);
}
```

---

# 10. Shared preview button

Every visible image is a real button.

```tsx
<button
  type="button"
  className="detail-photo-preview"
  onClick={() => setActive(index)}
  aria-label={`Open photo ${index + 1} of ${photos.length}: ${item.alt}`}
>
  <Image ... />
</button>
```

Style:

```css
.detail-photo-preview {
  position: relative;

  min-width: 0;

  padding: 0;

  border: 0;

  background: #e9efea;

  overflow: hidden;

  cursor: zoom-in;
}
```

Do not use a clickable `<div>`.

---

# 11. Shared multi-image preview styling

For galleries with 2 or 3 photos:

```css
.detail-photo-preview img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;

  transition:
    transform 180ms ease,
    filter 180ms ease;
}
```

Hover:

```css
.detail-photo-preview:hover img {
  transform: scale(1.015);
  filter: saturate(0.98);
}
```

Optional subtle hover overlay:

```css
.detail-photo-preview::after {
  content: "";

  position: absolute;
  inset: 0;

  background:
    linear-gradient(
      to top,
      rgb(0 0 0 / 18%),
      transparent 35%
    );

  opacity: 0;

  transition: opacity 160ms ease;

  pointer-events: none;
}

.detail-photo-preview:hover::after {
  opacity: 1;
}
```

---

# 12. Keyboard focus

```css
.detail-photo-preview:focus-visible {
  outline: 3px solid var(--brand);
  outline-offset: -3px;

  z-index: 2;
}
```

The crop/preview layout must remain fully keyboard accessible.

---

# 13. Single-image behavior

A single image should **not** use the same crop-heavy treatment as a multi-image gallery.

The goal is to preserve as much of the original image as possible.

Determine orientation from existing metadata:

```ts
const isPortrait = photo.height > photo.width;
```

No image-analysis library is required.

---

# 14. Single landscape / square image

Visual behavior:

```text
Photos   1

┌───────────────────────────────────────────────┐
│                                               │
│                full image                     │
│                                               │
│                                      expand   │
└───────────────────────────────────────────────┘
```

Use a large single-image wrapper.

```css
.detail-single-photo {
  position: relative;

  width: 100%;

  overflow: hidden;

  border-radius: 18px;

  background: var(--surface-soft);
}
```

Image:

```css
.detail-single-photo img {
  width: 100%;
  height: auto;

  display: block;

  max-height: 460px;

  object-fit: contain;
}
```

Do not force a landscape image into a fixed portrait-like frame.

---

# 15. Single portrait image

A portrait image should not be stretched across the full content width.

Instead:

```text
Photos   1

          ┌────────────────────┐
          │                    │
          │     portrait       │
          │      photo         │
          │                    │
          └────────────────────┘
```

Container:

```css
.detail-single-photo.is-portrait {
  max-width: 520px;
  margin-inline: auto;
}
```

Image:

```css
.detail-single-photo.is-portrait img {
  width: 100%;
  height: auto;

  max-height: 560px;

  object-fit: contain;
}
```

This preserves the original image without leaving a large awkward frame around it.

---

# 16. Single-image viewer affordance

Do **not** show:

```text
View all 1 photo
```

For one image, show either:

```text
View photo
```

or a compact expand/view icon.

Preferred visual treatment:

```text
[ expand icon  View photo ]
```

Position:

```text
bottom-right of the image
```

Use the same white floating-pill style as the multi-image `View all` action.

---

# 17. Two-photo layout

Desktop/tablet reference:

```text
┌──────────────────────┬──────────────────────┐
│                      │                      │
│       photo 1        │       photo 2        │
│                      │                      │
└──────────────────────┴──────────────────────┘
                              View all 2 photos
```

Exact container:

```css
.detail-photo-gallery.photo-count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  height: 350px;
}
```

Both visible tiles use:

```css
object-fit: cover;
```

The two images must have the same visible height regardless of their original dimensions.

This specifically solves the current portrait + landscape mismatch.

---

# 18. Three-photo layout

Desktop/tablet:

```text
┌────────────────────────┬────────────────────┐
│                        │      photo 2       │
│                        ├────────────────────┤
│        photo 1         │      photo 3       │
│                        │                    │
└────────────────────────┴────────────────────┘
                                View all 3 photos
```

Recommended CSS:

```css
.detail-photo-gallery.photo-count-3 {
  grid-template-columns:
    minmax(0, 1.25fr)
    minmax(0, 0.75fr);

  grid-template-rows: repeat(2, 1fr);

  height: 390px;
}
```

First image:

```css
.detail-photo-gallery.photo-count-3
  .detail-photo-preview:first-child {
  grid-row: 1 / 3;
}
```

All three tiles use:

```css
object-fit: cover;
```

Do not render three equal narrow columns.

---

# 19. View-all action

For 2 or 3 images, show a persistent action:

```text
View all 2 photos
```

or:

```text
View all 3 photos
```

This is important because the current gallery behavior is not obvious until the user clicks an image.

Style:

```css
.detail-photo-view-all {
  position: absolute;

  right: 14px;
  bottom: 14px;

  z-index: 3;

  min-height: 40px;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 8px 12px;

  border: 1px solid rgb(255 255 255 / 72%);
  border-radius: var(--radius-pill);

  background: rgb(255 255 255 / 94%);
  color: var(--ink);

  box-shadow:
    0 6px 18px rgb(23 37 29 / 16%);

  backdrop-filter: blur(8px);

  font-size: 12px;
  font-weight: 700;

  cursor: pointer;
}
```

Hover:

```css
.detail-photo-view-all:hover {
  background: var(--surface);
}
```

Use an image-grid / expand-style icon around 16–17px.

---

# 20. Optional explanatory note

The reference UI includes:

```text
ⓘ Preview images are cropped to keep the tip easy to scan.
   Full photos are always available in the viewer.
```

Recommended styling:

```css
.detail-photo-note {
  display: flex;
  align-items: center;
  gap: 7px;

  margin-top: 10px;

  color: var(--ink-subtle);

  font-size: 12px;
}
```

This is useful during the first version because it makes the crop behavior explicit.

If later user testing shows the behavior is obvious enough, this note can be removed.

---

# 21. Full-screen viewer

Clicking:

```text
any preview image
View photo
View all N photos
```

opens the existing image viewer/lightbox.

The full viewer must show the complete image.

Use:

```css
object-fit: contain;
```

Do not use `cover` inside the lightbox.

---

# 22. Full-screen viewer structure

Target:

```text
┌───────────────────────────────────────────────────────────┐
│  1 / 3      image description                         ×  │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ←                 COMPLETE IMAGE                    →    │
│                                                           │
├───────────────────────────────────────────────────────────┤
│              [thumb 1] [thumb 2] [thumb 3]               │
└───────────────────────────────────────────────────────────┘
```

---

# 23. Lightbox backdrop

```css
.detail-photo-lightbox {
  position: fixed;
  inset: 0;

  z-index: 1000;

  display: grid;
  grid-template-rows: auto 1fr auto;

  background: rgb(12 18 14 / 94%);

  color: white;
}
```

The existing Radix `Dialog` can continue to provide:

```text
portal
focus trap
Escape handling
screen-reader dialog behavior
```

Do not rebuild modal accessibility manually.

---

# 24. Lightbox header

Display:

```text
1 / 3
photo alt text
close button
```

Recommended:

```css
.detail-photo-lightbox-head {
  min-height: 64px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  padding: 12px 20px;

  border-bottom:
    1px solid rgb(255 255 255 / 12%);
}
```

Counter:

```css
font-size: 13px;
font-weight: 650;
```

Alt/description:

```css
color: rgb(255 255 255 / 72%);
font-size: 12px;

white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

---

# 25. Lightbox image stage

```css
.detail-photo-lightbox-stage {
  position: relative;

  min-height: 0;

  display: grid;
  place-items: center;

  padding: 20px 78px;
}
```

Image:

```css
.detail-photo-lightbox-image {
  max-width: 100%;
  max-height: calc(100vh - 150px);

  width: auto;
  height: auto;

  object-fit: contain;

  border-radius: 10px;

  box-shadow:
    0 18px 60px rgb(0 0 0 / 38%);
}
```

This is where the user sees the complete original composition.

---

# 26. Previous / next navigation

If there is more than one image, show:

```text
Previous
Next
```

or icon-only arrows in the lightbox.

Desktop target:

```text
left arrow  → vertically centered at left
right arrow → vertically centered at right
```

Interaction must wrap:

```text
previous from first → last
next from last → first
```

The current gallery already does this and should retain the behavior.

---

# 27. Keyboard behavior

When the viewer is open:

```text
Escape      → close
Arrow Left  → previous image
Arrow Right → next image
```

Preserve focus trapping through the existing dialog primitive.

---

# 28. Thumbnail strip

For 2–3 photos, render small thumbnails at the bottom of the full viewer.

```css
.detail-photo-thumbnails {
  min-height: 64px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  padding: 10px 20px 14px;
}
```

Thumbnail:

```css
.detail-photo-thumbnail {
  width: 54px;
  height: 40px;

  padding: 0;

  overflow: hidden;

  border: 2px solid transparent;
  border-radius: 8px;

  background: transparent;

  opacity: 0.58;

  cursor: pointer;
}
```

Selected:

```css
.detail-photo-thumbnail.is-active {
  border-color: white;
  opacity: 1;
}
```

Thumbnail image:

```css
object-fit: cover;
```

The thumbnail is navigation only; the main viewer still uses `contain`.

---

# 29. One-image lightbox

For a single image:

```text
show:
✓ image
✓ close
✓ optional image description

hide:
✗ previous
✗ next
✗ thumbnail strip
```

Do not show:

```text
Previous
Next
1-thumbnail carousel
```

when only one photo exists.

---

# 30. Mobile gallery behavior

Breakpoint:

```css
@media (max-width: 620px)
```

For 2 or 3 photos, do not squeeze multiple small tiles horizontally.

Show one strong preview image and keep the remaining photos accessible through the viewer.

Example:

```text
Photos   3

┌──────────────────────────────┐
│                              │
│          photo 1             │
│                              │
│          View all 3          │
└──────────────────────────────┘
```

Implementation:

```css
@media (max-width: 620px) {
  .detail-photo-gallery.photo-count-2,
  .detail-photo-gallery.photo-count-3 {
    display: block;
    height: 250px;
  }

  .detail-photo-gallery.photo-count-2
    .detail-photo-preview:nth-child(n + 2),
  .detail-photo-gallery.photo-count-3
    .detail-photo-preview:nth-child(n + 2) {
    display: none;
  }
}
```

The first preview uses:

```css
width: 100%;
height: 100%;
object-fit: cover;
```

---

# 31. Mobile single-image behavior

Single image behavior remains orientation-aware.

Landscape/square:

```text
full-width
natural aspect ratio
max-height applied
```

Portrait:

```text
centered
not artificially widened
full image visible
```

Do not convert a single portrait image into a cropped mobile banner.

---

# 32. Mobile View-all position

```css
@media (max-width: 620px) {
  .detail-photo-view-all {
    right: 10px;
    bottom: 10px;
  }
}
```

---

# 33. Mobile lightbox

```css
@media (max-width: 620px) {
  .detail-photo-lightbox-stage {
    padding: 16px 14px;
  }

  .detail-photo-lightbox-image {
    max-height: calc(100vh - 150px);
  }
}
```

The complete image must remain visible.

Navigation arrows may use:

```css
background: rgb(0 0 0 / 36%);
```

to remain legible over images.

The textual alt description can be hidden from the visual header on very small screens while still remaining available to assistive technologies.

---

# 34. Image sizing with Next.js

Continue using:

```tsx
next/image
```

The DTO already contains:

```text
path
width
height
alt
```

Do not remove these dimensions.

For multi-image preview tiles, because CSS controls the visible crop, use `sizes` values appropriate to the gallery width.

The existing `width` and `height` metadata should remain the intrinsic dimensions.

---

# 35. No resolution-specific layouts

Do not create separate UI rules based on:

```text
1080p
4K
low resolution
phone camera resolution
```

The UI should respond only to:

```text
number of photos
aspect ratio
available viewport width
```

Image resolution itself should not change the gallery structure.

---

# 36. No permanent crop

Important distinction:

```text
preview crop ≠ image crop
```

The inline gallery may use:

```css
object-fit: cover;
```

but the stored file is unchanged.

The lightbox uses:

```css
object-fit: contain;
```

so the entire source photo remains visible.

---

# 37. Future focal-point enhancement

Do not implement this initially.

If real user photos later show that automatic center cropping regularly hides important subjects, TrailNote can add a lightweight focal-point feature.

Possible stored values:

```ts
{
  focalX: 0.64,
  focalY: 0.38
}
```

Then:

```css
object-position: 64% 38%;
```

This is preferable to a full crop editor.

Only add it if real usage demonstrates the need.

---

# 38. Do not introduce a crop library now

Do not add libraries such as:

```text
react-easy-crop
cropperjs
react-image-crop
```

for this iteration.

They are unnecessary for the current requirement.

---

# 39. Behavior matrix

## Zero photos

```text
Do not render the Photos section.
```

## One landscape/square photo

```text
one large preview
preserve aspect ratio
object-fit: contain
full-width within content
max-height 460px
View photo affordance
lightbox opens complete image
```

## One portrait photo

```text
centered preview
max-width 520px
preserve aspect ratio
object-fit: contain
max-height 560px
View photo affordance
lightbox opens complete image
```

## Two photos — desktop/tablet

```text
2 equal columns
350px gallery height
object-fit: cover
View all 2 photos
```

## Three photos — desktop/tablet

```text
large first image on left
2 stacked images on right
390px gallery height
object-fit: cover
View all 3 photos
```

## Two or three photos — mobile

```text
show first preview only
250px preview height
object-fit: cover
View all N photos
all photos available in viewer
```

---

# 40. Accessibility

Required:

```text
[ ] each visible preview is a button
[ ] preview button has photo index + alt text in aria-label
[ ] focus-visible state is obvious
[ ] full viewer is a real dialog
[ ] Escape closes
[ ] Arrow Left/Right navigate
[ ] close button has accessible name
[ ] previous/next buttons have accessible names
[ ] thumbnail buttons have accessible names
[ ] meaningful alt text is preserved
[ ] decorative icons use aria-hidden
```

---

# 41. Visual acceptance checklist

Compare `/tips/[id]` against:

```text
trailnote-tip-photo-gallery-redesign.html
```

## Gallery section

```text
[ ] Photos heading exists
[ ] count badge exists
[ ] desktop hint exists
[ ] section has top divider
[ ] spacing matches reference
```

## Single image

```text
[ ] landscape image is not unnecessarily cropped
[ ] portrait image is centered and not stretched wide
[ ] full image composition is preserved
[ ] View photo affordance is visible
[ ] no "View all 1 photo" label
```

## Two images

```text
[ ] equal-height side-by-side previews
[ ] different aspect ratios do not create empty bars
[ ] both use cover in preview
[ ] View all 2 photos is visible
```

## Three images

```text
[ ] first image is large
[ ] second and third are stacked
[ ] all visible slots align cleanly
[ ] View all 3 photos is visible
```

## Full viewer

```text
[ ] complete source image is visible
[ ] no destructive crop
[ ] counter shows current photo
[ ] previous/next works
[ ] thumbnail selection works
[ ] close works
[ ] keyboard navigation works
```

## Mobile

```text
[ ] only first preview is shown for 2–3 photos
[ ] View all N remains visible
[ ] single portrait remains uncropped
[ ] no horizontal overflow
[ ] lightbox fits viewport
```

---

# 42. Implementation instruction

Use this instruction when implementing:

> Update only the `/tips/[id]` image gallery and viewer. Treat `trailnote-tip-photo-gallery-redesign.html` as the visual source of truth for the image section. Keep the current maximum of three photos and the existing photo data/DTO. Do not add manual cropping or a crop library. For one photo, preserve the source image: full-width/natural aspect ratio for landscape or square, and centered/max-width 520px for portrait. For two photos, use equal-height two-column `object-fit: cover` previews. For three photos, use one large left preview and two stacked right previews, also using `cover`. On mobile, show only the first preview for multi-photo galleries and expose the complete set through a persistent `View all N photos` action. The full-screen viewer must use `object-fit: contain`, show the original image composition, support previous/next navigation, photo count, Escape/Arrow keys, and thumbnails for 2–3 photos. Preserve existing upload/storage behavior and do not modify unrelated tip-page sections.

---

# 43. Final rule

TrailNote should follow this principle:

```text
Single photo
→ preserve the image

Multiple photos
→ optimize the inline preview for layout

Full-screen viewer
→ always preserve the complete original image
```

The contributor should not need to crop an image just to make the tip page look good.
