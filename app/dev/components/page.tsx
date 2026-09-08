import { notFound } from "next/navigation";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Select,
  SkeletonCards,
  Textarea,
} from "../../../src/components/ui/primitives";
import { Dialog, Menu, Popover } from "../../../src/components/ui/overlays";
import { CategoryIcon } from "../../../src/components/ui/category-icon";
import { env } from "../../../src/server/env";

export const metadata = { title: "Component gallery" };

export default function ComponentGalleryPage() {
  if (env.APP_ENV !== "development" && env.APP_ENV !== "test") notFound();

  return (
    <main id="main" className="container page-top stack">
      <div>
        <p className="eyebrow">Development only</p>
        <h1 className="page-title">Component gallery</h1>
        <p className="muted">Visual and interaction states for TrailNote.</p>
      </div>

      <section className="gallery" aria-label="Buttons and statuses">
        <div className="form-card stack">
          <h2>Actions</h2>
          <div className="row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="quiet">Quiet</Button>
            <Button disabled>Disabled</Button>
            <Button busy>Saving</Button>
          </div>
          <div className="row">
            <span className="badge">
              <CategoryIcon category="general" /> Recent visit
            </span>
            <span className="badge warning">
              <CategoryIcon category="transport" /> Change reported
            </span>
            <span className="badge muted">Unavailable</span>
          </div>
        </div>

        <div className="form-card stack">
          <h2>Overlays</h2>
          <div className="row">
            <Dialog
              title="Confirm this action"
              description="Keyboard focus stays inside this dialog until it closes."
              trigger={<Button variant="secondary">Open dialog</Button>}
            >
              <div className="row">
                <Button>Confirm</Button>
              </div>
            </Dialog>
            <Popover
              trigger={<Button variant="secondary">Open popover</Button>}
            >
              <p>Popover content remains readable at narrow widths.</p>
            </Popover>
            <Menu
              trigger={<Button variant="secondary">Open menu</Button>}
              items={[{ label: "Edit" }, { label: "Report" }]}
            />
          </div>
        </div>
      </section>

      <section className="form-card stack" aria-labelledby="gallery-form-title">
        <h2 id="gallery-form-title">Form controls</h2>
        <Field id="gallery-name" label="Place" optional>
          <Input id="gallery-name" placeholder="e.g. Railway station" />
        </Field>
        <Field id="gallery-category" label="Category">
          <Select id="gallery-category" defaultValue="transport">
            <option value="stay">Stay</option>
            <option value="food">Food</option>
            <option value="transport">Transport</option>
          </Select>
        </Field>
        <Field
          id="gallery-tip"
          label="Useful tip"
          error="Add at least 10 characters so another traveler can use this."
        >
          <Textarea
            id="gallery-tip"
            aria-invalid="true"
            aria-describedby="gallery-tip-error"
            defaultValue="Too short"
          />
        </Field>
      </section>

      <section className="gallery" aria-label="Content states">
        <EmptyState title="No tips here yet">
          Know something useful? Help the next traveler.
        </EmptyState>
        <div className="error-notice" role="alert">
          Couldn&apos;t load tips. Check your connection and try again.
        </div>
      </section>
      <SkeletonCards />
    </main>
  );
}
