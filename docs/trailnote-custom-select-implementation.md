# TrailNote Custom Select / Dropdown — Implementation Approach

## 1. Goal

TrailNote currently uses the browser-native `<select>` element through the shared UI primitive in:

```text
src/components/ui/primitives.tsx
```

Current implementation:

```tsx
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx("field-input", props.className)}
    />
  );
}
```

This works functionally, but the open dropdown panel is rendered by the browser/OS, so its appearance cannot be styled consistently with the rest of TrailNote.

The goal is to introduce a reusable custom select that:

- visually matches the current TrailNote UI
- keeps keyboard and screen-reader accessibility
- does not require building complex dropdown behavior manually
- avoids breaking existing native selects
- can be adopted gradually
- reuses TrailNote's existing design tokens
- works with React 19 / Next.js 16
- fits the project's existing Radix-based UI architecture

## 2. Recommended approach

Use:

```text
@radix-ui/react-select
```

Do **not** build the dropdown interaction manually.

TrailNote already uses Radix for:

```text
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-popover
```

in:

```text
src/components/ui/overlays.tsx
```

So adding Radix Select keeps the UI layer consistent with the current codebase.

Install:

```bash
pnpm add @radix-ui/react-select
```

## 3. Why Radix Select fits TrailNote

Radix Select gives TrailNote the behavior that would otherwise have to be implemented manually:

```text
keyboard navigation
Arrow Up / Arrow Down
Enter to select
Escape to close
focus management
screen-reader semantics
ARIA behavior
portal rendering
collision-aware positioning
selected-item handling
disabled-item support
scroll handling
touch support
```

The visual layer remains completely custom.

That means TrailNote controls:

```text
border
background
spacing
radius
hover state
selected state
icons
dropdown width
shadow
typography
```

while Radix controls the difficult interaction/accessibility behavior.

## 4. Do not replace the existing native `Select` immediately

The current application already contains multiple usages of:

```tsx
<Select>
  <option />
</Select>
```

including areas such as:

```text
destination sorting
report reason
composer fields
moderation filters
development component gallery
```

Radix Select uses a different API.

Therefore, replacing this:

```tsx
export function Select(...) {
  return <select ... />;
}
```

directly with Radix would break existing consumers.

Instead, introduce a second component first.

Recommended initial naming:

```text
CustomSelect
NativeSelect
```

Suggested files:

```text
src/components/ui/
├── primitives.tsx
├── overlays.tsx
├── custom-select.tsx
├── category-icon.tsx
├── info-tooltip.tsx
└── toaster.tsx
```

After migration is stable, rename:

```text
CustomSelect → Select
existing HTML Select → NativeSelect
```

## 5. Suggested component API

Avoid exposing Radix internals across the application.

Create a TrailNote-specific API:

```tsx
type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;

  options: SelectOption[];

  placeholder?: string;

  name?: string;
  id?: string;

  disabled?: boolean;
  invalid?: boolean;

  ariaLabel?: string;

  className?: string;
};
```

Usage:

```tsx
<CustomSelect
  value={sort}
  onValueChange={setSort}
  ariaLabel="Sort tips"
  options={[
    {
      value: "recent",
      label: "Most recent",
    },
    {
      value: "helpful",
      label: "Most helpful",
    },
  ]}
/>
```

## 6. Recommended component structure

Create:

```text
src/components/ui/custom-select.tsx
```

Suggested implementation:

```tsx
"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function CustomSelect({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Select an option",
  disabled,
  invalid,
  name,
  ariaLabel,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        className={clsx("tn-select-trigger", className)}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
      >
        <SelectPrimitive.Value placeholder={placeholder} />

        <SelectPrimitive.Icon className="tn-select-chevron">
          <ChevronDown size={16} aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="tn-select-content"
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.ScrollUpButton className="tn-select-scroll">
            <ChevronUp size={15} aria-hidden="true" />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="tn-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="tn-select-item"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>

                <SelectPrimitive.ItemIndicator className="tn-select-check">
                  <Check size={15} aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="tn-select-scroll">
            <ChevronDown size={15} aria-hidden="true" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
```

Keep all Radix-specific markup inside this component.

## 7. Visual style — match current TrailNote UI

Reuse the existing tokens from:

```text
src/styles/tokens.css
```

Relevant tokens:

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
--control-border: #829087;
--focus: #245c43;

--shadow-popover: 0 16px 42px rgb(23 37 29 / 13%);

--radius-control: 12px;
--radius-card: 18px;
--radius-pill: 999px;

--motion-fast: 120ms;
--motion-standard: 180ms;
--ease: cubic-bezier(0.2, 0.8, 0.2, 1);
```

Do not introduce an unrelated pre-styled component-library look.

## 8. Trigger styling

The closed select should visually belong to the same family as TrailNote's existing inputs.

```css
.tn-select-trigger {
  width: 100%;
  min-height: 46px;

  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  padding: 10px 12px;

  border: 1px solid var(--control-border);
  border-radius: var(--radius-control);

  background: var(--surface);
  color: var(--ink);

  font: inherit;
  font-size: 14px;

  text-align: left;

  outline: none;

  transition:
    border-color var(--motion-fast) var(--ease),
    box-shadow var(--motion-fast) var(--ease),
    background var(--motion-fast) var(--ease);
}
```

Hover:

```css
.tn-select-trigger:hover:not([data-disabled]) {
  border-color: var(--brand-border);
}
```

Open/focus:

```css
.tn-select-trigger:focus-visible,
.tn-select-trigger[data-state="open"] {
  border-color: var(--brand);

  box-shadow:
    0 0 0 3px rgb(36 92 67 / 12%);
}
```

Disabled:

```css
.tn-select-trigger[data-disabled] {
  cursor: not-allowed;

  background: var(--surface-soft);
  color: var(--ink-subtle);

  opacity: 0.7;
}
```

Placeholder:

```css
.tn-select-trigger [data-placeholder] {
  color: var(--ink-subtle);
}
```

## 9. Chevron

```css
.tn-select-chevron {
  display: inline-flex;
  flex: 0 0 auto;

  color: var(--ink-muted);

  transition:
    transform var(--motion-fast) var(--ease);
}
```

Open:

```css
.tn-select-trigger[data-state="open"] .tn-select-chevron {
  transform: rotate(180deg);
}
```

Keep the motion subtle.

## 10. Dropdown content

The dropdown should feel consistent with TrailNote's account menu and popovers.

```css
.tn-select-content {
  z-index: 100;

  min-width: var(--radix-select-trigger-width);
  max-width: min(420px, calc(100vw - 24px));
  max-height: min(
    var(--radix-select-content-available-height),
    320px
  );

  overflow: hidden;

  border: 1px solid var(--border);
  border-radius: 14px;

  background: var(--surface);

  box-shadow: var(--shadow-popover);

  animation: tn-select-in var(--motion-standard) var(--ease);
}
```

Avoid:

```text
heavy black shadows
bright green dropdown surfaces
glassmorphism
very large radius
strong animation
```

## 11. Viewport

```css
.tn-select-viewport {
  padding: 6px;
}
```

## 12. Option styling

```css
.tn-select-item {
  position: relative;

  min-height: 40px;

  display: flex;
  align-items: center;

  padding: 8px 34px 8px 10px;

  border-radius: 9px;

  color: var(--ink);

  font-size: 13px;
  font-weight: 550;

  line-height: 1.4;

  cursor: default;
  user-select: none;

  outline: none;
}
```

Highlighted:

```css
.tn-select-item[data-highlighted] {
  background: var(--surface-soft);
}
```

Selected:

```css
.tn-select-item[data-state="checked"] {
  background: var(--brand-faint);
  color: var(--brand);

  font-weight: 650;
}
```

Disabled:

```css
.tn-select-item[data-disabled] {
  color: var(--ink-subtle);
  opacity: 0.55;

  pointer-events: none;
}
```

## 13. Checkmark

```css
.tn-select-check {
  position: absolute;
  right: 10px;

  display: inline-flex;
  align-items: center;

  color: var(--brand);
}
```

## 14. Scroll controls

```css
.tn-select-scroll {
  height: 28px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: var(--surface);
  color: var(--ink-muted);
}
```

Most TrailNote dropdowns are short, so these will rarely appear.

## 15. Animation

```css
@keyframes tn-select-in {
  from {
    opacity: 0;
    transform: translateY(-3px) scale(0.99);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

Reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  .tn-select-content {
    animation: none;
  }

  .tn-select-chevron {
    transition: none;
  }
}
```

## 16. Error state

Support:

```tsx
invalid?: boolean;
```

CSS:

```css
.tn-select-trigger[aria-invalid="true"] {
  border-color: var(--danger);
}

.tn-select-trigger[aria-invalid="true"]:focus-visible {
  box-shadow:
    0 0 0 3px rgb(180 35 24 / 10%);
}
```

Continue rendering the actual validation message through TrailNote's existing `Field` component.

## 17. Form integration

Controlled component:

```tsx
const [value, setValue] = useState("recent");

<CustomSelect
  value={value}
  onValueChange={setValue}
  options={options}
/>
```

React Hook Form:

```tsx
<Controller
  name="transportMode"
  control={control}
  render={({ field }) => (
    <CustomSelect
      value={field.value}
      onValueChange={field.onChange}
      options={transportOptions}
    />
  )}
/>
```

## 18. Native form submission

Radix Select supports `name`.

Example:

```tsx
<CustomSelect
  name="status"
  defaultValue="all"
  options={statusOptions}
/>
```

Verify submitted values during migration.

## 19. Field integration

The custom component can still live inside TrailNote's existing `Field`.

```tsx
<Field
  id="visitedChoice"
  label="When did you visit?"
>
  <CustomSelect
    value={visitedChoice}
    onValueChange={setVisitedChoice}
    options={visitedOptions}
    ariaLabel="When did you visit?"
  />
</Field>
```

Because the trigger is not a native `<select>`, do not rely blindly on `label htmlFor` for the accessible name. Pass `ariaLabel` or wire `aria-labelledby`.

## 20. Mobile behavior

No separate mobile implementation is required initially.

Use:

```css
.tn-select-trigger {
  min-height: 46px;
}

.tn-select-item {
  min-height: 44px;
}

.tn-select-content {
  max-width: calc(100vw - 24px);
}
```

Keep touch targets around 44px or larger.

## 21. Where to migrate first

Do not migrate every select in one pull request.

### Phase 1 — traveller-facing UI

Prioritize:

```text
composer selects
report reason
destination sort
other public contribution forms
```

### Phase 2 — lower priority

Later:

```text
moderation filters
development component gallery
internal tools
```

Native selects are acceptable in internal/admin screens if visual polish is not important.

## 22. Destination search is not a Select

Do not use this component for destination search.

Destination search needs:

```text
text input
autocomplete
remote lookup
keyboard-highlighted suggestions
loading state
empty state
aliases
```

That is a combobox/autocomplete.

Keep it as a separate component.

## 23. Multi-select is not this component

Do not stretch this primitive into:

```text
tags
multiple categories
multiple amenities
multiple travel styles
```

Use a dedicated multi-select/combobox when needed.

This custom Select should remain:

> one value from a relatively small predefined list.

## 24. Dropdown menu vs Select

Use the existing Radix `DropdownMenu` for actions:

```text
Profile
View public profile
Community guidelines
Sign out
```

Use Radix `Select` for values:

```text
Sort by
Reason
Visit month
Transport mode
Price unit
Status
```

Do not use DropdownMenu as a Select replacement.

## 25. CSS naming

Use scoped names:

```text
tn-select-trigger
tn-select-content
tn-select-viewport
tn-select-item
tn-select-check
tn-select-chevron
tn-select-scroll
```

Avoid:

```text
.select
.option
.dropdown
.item
.menu
```

The current `globals.css` already contains many shared/global selectors, so specific names reduce collision risk.

## 26. CSS placement

For consistency with the current project, initially place the shared select styles in:

```text
app/globals.css
```

Keep all rules together under a section such as:

```css
/* Custom select */
```

Do not scatter them across feature-specific CSS sections.

## 27. Migration example — destination sort

Before:

```tsx
<select
  className="field-input"
  value={sort}
  onChange={(event) => {
    ...
  }}
>
  ...
</select>
```

After:

```tsx
<CustomSelect
  value={sort}
  onValueChange={(nextSort) => {
    ...
  }}
  ariaLabel="Sort tips"
  options={[
    {
      value: "recent",
      label: "Most recent",
    },
    {
      value: "newest",
      label: "Newest",
    },
  ]}
/>
```

Preserve existing URL/query behavior.

## 28. Migration example — report reason

Before:

```tsx
<Select
  id="report-reason"
  value={reason}
  onChange={(event) => setReason(event.target.value)}
>
  ...
</Select>
```

After:

```tsx
<CustomSelect
  value={reason}
  onValueChange={setReason}
  ariaLabel="Reason"
  options={reportReasonOptions}
/>
```

Do not change report submission or validation logic.

## 29. Visual target

Closed:

```text
┌──────────────────────────────────┐
│ Most recent                  ˅   │
└──────────────────────────────────┘
```

Open:

```text
┌──────────────────────────────────┐
│ Most recent                  ˄   │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Most recent                  ✓   │
│ Newest                           │
│ Most helpful                     │
└──────────────────────────────────┘
```

The result should feel like a natural extension of TrailNote's current:

```text
profile modal inputs
profile social pills
account menu
buttons
green interaction states
subtle surfaces and borders
```

## 30. Accessibility checklist

Verify:

```text
[ ] Tab focuses trigger
[ ] Enter opens
[ ] Space opens
[ ] Arrow Down navigates
[ ] Arrow Up navigates
[ ] Enter selects
[ ] Escape closes
[ ] focus returns correctly
[ ] selected item is announced
[ ] disabled options cannot be selected
[ ] trigger has accessible label
[ ] error state uses aria-invalid
[ ] focus ring is visible
[ ] no keyboard trap
```

Do not remove Radix-generated ARIA behavior.

## 31. Visual testing checklist

Closed:

```text
[ ] same approximate height as TrailNote inputs
[ ] same border language
[ ] same radius language
[ ] Commissioner typography
[ ] muted chevron
[ ] no browser-native arrow
```

Open:

```text
[ ] white surface
[ ] subtle border
[ ] uses TrailNote popover shadow
[ ] compact option spacing
[ ] hover uses surface-soft
[ ] selected uses brand-faint
[ ] selected text/check uses brand
```

Responsive:

```text
[ ] no overflow at 320px
[ ] menu aligns with trigger
[ ] touch options are at least ~44px
[ ] long labels wrap safely
```

## 32. Functional regression checklist

After migrating each select:

```text
[ ] selected value is preserved
[ ] form sends the same value as before
[ ] validation still works
[ ] default value still works
[ ] disabled state works
[ ] query-param behavior remains correct
[ ] browser Back/Forward remains correct where relevant
[ ] React Hook Form integration remains correct
[ ] no hydration errors
```

## 33. Testing

Add tests for:

```text
render
initial selected value
open
select option
disabled option
keyboard selection
onValueChange
```

For important flows, retain/add Playwright checks:

```text
composer can select visit option
report form can select reason
destination sort updates correctly
```

Because Radix renders dropdown content through a portal, tests should query from the document body rather than assuming content is nested under the trigger.

## 34. Migration plan

Recommended order:

```text
1. Install @radix-ui/react-select

2. Create:
   src/components/ui/custom-select.tsx

3. Add TrailNote-specific styles to app/globals.css

4. Add CustomSelect to:
   app/dev/components/page.tsx

5. Review visually against:
   existing input fields
   account menu
   profile modal
   buttons

6. Test keyboard and accessibility behavior

7. Migrate one simple traveller-facing select

8. Verify form/query behavior

9. Migrate remaining traveller-facing selects

10. Leave moderation/internal selects native initially

11. Once migration is stable:
    rename old native Select to NativeSelect
    rename CustomSelect to Select
```

Do not combine this migration with unrelated composer or form architecture changes.

## 35. What not to do

Avoid:

```text
building listbox keyboard navigation manually
using divs with click handlers as options
using DropdownMenu as a form Select
adding react-select for simple fixed option lists
replacing every native select in one large change
changing global .field-input just to support Radix
copy-pasting Radix markup into feature components
hard-coding an unrelated color palette
```

## 36. Implementation instruction for coding agent

Use this prompt:

> Review the current beta branch before implementing. Add a reusable custom single-select primitive using `@radix-ui/react-select`. Do not replace the existing native `Select` implementation immediately because current consumers rely on standard `<select>/<option>` semantics. Create a separate `CustomSelect` first. Style it using the existing TrailNote tokens from `src/styles/tokens.css` so the trigger visually matches current form controls and the dropdown surface matches the existing Radix popover/menu language: white surface, subtle border, `--shadow-popover`, restrained green hover/selected states, Commissioner typography, and existing radius tokens. Encapsulate all Radix primitives inside `src/components/ui/custom-select.tsx`. Preserve existing form/query/business behavior and migrate one traveller-facing select at a time.

## 37. Final architecture

Preferred:

```text
@radix-ui/react-select
        ↓
TrailNote CustomSelect
        ↓
TrailNote design tokens
        ↓
feature-specific options
```

Not:

```text
hand-written custom dropdown
```

and not:

```text
pre-styled third-party component UI
```

This gives TrailNote:

```text
consistent UI
accessible behavior
lower maintenance
full visual control
gradual migration
low regression risk
```

while keeping the component aligned with the current design system.
