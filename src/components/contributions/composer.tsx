"use client";

import { Check, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  categories,
  categoryLabels,
  unitLabels,
  type Category,
} from "../../lib/constants";
import { currentMonth, formatMonth } from "../../lib/visit-month";
import { CategoryIcon } from "../ui/category-icon";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";
import { PhotoUploader, type UploadedPhoto } from "./photo-uploader";
import {
  shareContribution,
  type ComposerActionState,
} from "../../../app/destinations/[slug]/add/actions";

type Destination = {
  id: string;
  slug: string;
  name: string;
  state: string;
};

type Draft = {
  category: Category;
  body: string;
  visitedChoice: string;
  visitedMonth: string;
  mutationId: string;
  price: string;
  priceUnit: string;
  priceUnitLabel: string;
  placeName: string;
  roomType: string;
  bookingMethod: string;
  dish: string;
  fromName: string;
  toName: string;
  transportMode: string;
  durationMinutes: string;
  walkMinutes: string;
  locationText: string;
  mapsUrl: string;
  phone: string;
  photos: UploadedPhoto[];
};

const initialActionState: ComposerActionState = { status: "idle" };
const categoryNames: Record<Category, string> = {
  ...categoryLabels,
  general: "Quick tip",
};
const defaultUnits: Record<Category, string> = {
  stay: "room_night",
  food: "meal",
  transport: "person_trip",
  explore: "entry_person",
  general: "",
};

function previousMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return value === 1
    ? `${year - 1}-12`
    : `${year}-${String(value - 1).padStart(2, "0")}`;
}

function makeDraft(category: Category, mutationId: string): Draft {
  const month = currentMonth();
  return {
    category,
    body: "",
    visitedChoice: month,
    visitedMonth: month,
    mutationId,
    price: "",
    priceUnit: defaultUnits[category],
    priceUnitLabel: "",
    placeName: "",
    roomType: "",
    bookingMethod: "",
    dish: "",
    fromName: "",
    toName: "",
    transportMode: "",
    durationMinutes: "",
    walkMinutes: "",
    locationText: "",
    mapsUrl: "",
    phone: "",
    photos: [],
  };
}

function storableDraft(draft: Draft) {
  return {
    ...draft,
    phone: "",
    schemaVersion: 1,
    updatedAt: Date.now(),
  };
}

export function ContributionComposer({
  destination,
  initialCategory,
  initialMutationId,
  signedIn,
}: {
  destination: Destination;
  initialCategory: Category;
  initialMutationId: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const storageKey = `fieldnotes:draft:${destination.slug}`;
  const [draft, setDraft] = useState(() =>
    makeDraft(initialCategory, initialMutationId),
  );
  const [restored, setRestored] = useState(false);
  const [details, setDetails] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [state, action, pending] = useActionState(
    shareContribution,
    initialActionState,
  );
  const summaryRef = useRef<HTMLDivElement>(null);
  const draftSaved = useRef(false);
  const month = useMemo(() => currentMonth(), []);
  const lastMonth = useMemo(() => previousMonth(month), [month]);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Draft>;
        if (parsed.body || parsed.category) {
          queueMicrotask(() => {
            if (cancelled) return;
            setDraft((current) => ({
              ...current,
              ...parsed,
              phone: "",
              photos: Array.isArray(parsed.photos) ? parsed.photos : [],
            }));
            setRestored(true);
          });
        }
      }
    } catch {
      // Storage is an enhancement; the server action still works without it.
    }
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (state.status === "success") {
      sessionStorage.removeItem(storageKey);
      return;
    }
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify(storableDraft(draft)),
        );
        draftSaved.current = true;
      } catch {
        // Private browsing can make session storage unavailable.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [draft, state.status, storageKey]);

  useEffect(() => {
    if (state.status === "auth" && state.returnTo) {
      router.push(
        `/sign-in?returnTo=${encodeURIComponent(state.returnTo)}${draftSaved.current ? "&draft=1" : ""}`,
      );
    }
    if (state.status === "error") summaryRef.current?.focus();
  }, [router, state]);

  const setPhotos = useCallback(
    (photos: UploadedPhoto[]) =>
      setDraft((current) => ({ ...current, photos })),
    [],
  );
  const requirePhotoAuth = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(storableDraft(draft)));
      draftSaved.current = true;
    } catch {
      // The in-memory draft remains available if the user returns with Back.
    }
    router.push(
      `/sign-in?returnTo=${encodeURIComponent(`/destinations/${destination.slug}/add`)}&draft=1`,
    );
  }, [destination.slug, draft, router, storageKey]);

  if (state.status === "success" && state.tipId) {
    return (
      <section className="form-card field-hint" aria-live="polite">
        <Check size={48} aria-hidden="true" />
        <h2>Tip added</h2>
        <p className="muted">Thanks for sharing something practical.</p>
        <div className="row">
          <Link className="btn secondary" href={`/tips/${state.tipId}`}>
            View tip
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => window.location.reload()}
          >
            Add another thing about {destination.name}
          </button>
        </div>
      </section>
    );
  }

  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  const setValue = (name: string, value: string) =>
    setDraft((current) => ({ ...current, [name]: value }));
  const category = draft.category;
  const priceFields = (
    <>
      <Field
        id="price"
        label={
          category === "transport"
            ? "Fare"
            : category === "explore"
              ? "Entry price"
              : "What did you pay?"
        }
        optional
        error={error("price")}
      >
        <div className="input-grid">
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="0.00"
            value={draft.price}
            onChange={(event) => setValue("price", event.target.value)}
            aria-invalid={!!error("price")}
          />
          <Select
            aria-label="What the price covers"
            name="priceUnit"
            value={draft.priceUnit}
            onChange={(event) => setValue("priceUnit", event.target.value)}
          >
            <option value="">Choose a unit</option>
            {Object.entries(unitLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label.replace(/^\/ /, "")}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      {draft.priceUnit === "other" && (
        <Field
          id="priceUnitLabel"
          label="Describe the price unit"
          optional={false}
          error={error("priceUnitLabel")}
        >
          <Input
            id="priceUnitLabel"
            name="priceUnitLabel"
            value={draft.priceUnitLabel}
            onChange={(event) => setValue("priceUnitLabel", event.target.value)}
          />
        </Field>
      )}
    </>
  );

  return (
    <>
      <p className="context">
        <MapPin size={18} aria-hidden="true" />
        {destination.name}, {destination.state}
      </p>
      {restored && (
        <p className="status-message">Your saved draft was restored.</p>
      )}
      <form action={action} className="form-card" noValidate>
        <input type="hidden" name="destinationId" value={destination.id} />
        <input type="hidden" name="slug" value={destination.slug} />
        <input type="hidden" name="mutationId" value={draft.mutationId} />
        <input type="hidden" name="category" value={category} />
        <input
          type="hidden"
          name="visitedMonth"
          value={
            draft.visitedChoice === "custom"
              ? draft.visitedMonth
              : draft.visitedChoice
          }
        />

        {state.status === "error" && (
          <div
            ref={summaryRef}
            tabIndex={-1}
            className="error-notice"
            role="alert"
          >
            {state.message}
          </div>
        )}

        <fieldset className="composer-categories">
          <legend className="label">What did you discover?</legend>
          <div className="pills">
            {[
              "general",
              ...categories.filter((value) => value !== "general"),
            ].map((value) => (
              <button
                type="button"
                className={`pill ${category === value ? "selected" : ""}`}
                aria-pressed={category === value}
                key={value}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    category: value as Category,
                    price: "",
                    priceUnit: defaultUnits[value as Category],
                    priceUnitLabel: "",
                  }))
                }
              >
                <CategoryIcon category={value as Category} />
                {categoryNames[value as Category]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="category-fields">
          {(category === "stay" ||
            category === "food" ||
            category === "explore") && (
            <Field
              id="placeName"
              label={category === "stay" ? "Where did you stay?" : "Place"}
              optional
              error={error("placeName")}
            >
              <Input
                id="placeName"
                name="placeName"
                value={draft.placeName}
                onChange={(event) => setValue("placeName", event.target.value)}
                aria-describedby={
                  error("placeName") ? "placeName-error" : undefined
                }
                aria-invalid={!!error("placeName")}
              />
            </Field>
          )}
          {category === "food" && (
            <Field
              id="dish"
              label="What did you try?"
              optional
              error={error("dish")}
            >
              <Input
                id="dish"
                name="dish"
                value={draft.dish}
                onChange={(event) => setValue("dish", event.target.value)}
              />
            </Field>
          )}
          {category === "transport" && (
            <div className="input-grid">
              <Field id="fromName" label="From" optional>
                <Input
                  id="fromName"
                  name="fromName"
                  value={draft.fromName}
                  onChange={(event) => setValue("fromName", event.target.value)}
                />
              </Field>
              <Field id="toName" label="To" optional>
                <Input
                  id="toName"
                  name="toName"
                  value={draft.toName}
                  onChange={(event) => setValue("toName", event.target.value)}
                />
              </Field>
            </div>
          )}

          {category !== "general" && priceFields}

          <Field
            id="body"
            label="What should the next traveler know?"
            error={error("body")}
          >
            <Textarea
              id="body"
              name="body"
              maxLength={1000}
              required
              placeholder="A bus fare, a good meal, a useful contact, or something you wish you'd known…"
              value={draft.body}
              onChange={(event) => setValue("body", event.target.value)}
              aria-describedby={`body-help${error("body") ? " body-error" : ""}`}
              aria-invalid={!!error("body")}
            />
            <div id="body-help" className="field-foot">
              <span>Specific details help more than a review.</span>
              <span>{Array.from(draft.body).length} / 1,000</span>
            </div>
          </Field>

          <div className="visited-row">
            <label htmlFor="visitedChoice">Visited</label>
            <Select
              id="visitedChoice"
              value={draft.visitedChoice}
              onChange={(event) =>
                setValue("visitedChoice", event.target.value)
              }
            >
              <option value={month}>This month ({formatMonth(month)})</option>
              <option value={lastMonth}>
                Last month ({formatMonth(lastMonth)})
              </option>
              <option value="custom">Choose a month…</option>
              <option value="">Not sure</option>
            </Select>
          </div>
          {draft.visitedChoice === "custom" && (
            <Field id="visitedMonthCustom" label="Visit month">
              <Input
                id="visitedMonthCustom"
                type="month"
                min="2000-01"
                max={month}
                value={draft.visitedMonth}
                onChange={(event) =>
                  setValue("visitedMonth", event.target.value)
                }
              />
            </Field>
          )}
        </div>

        <details
          open={details}
          onToggle={(event) => setDetails(event.currentTarget.open)}
        >
          <summary>Add details</summary>
          <div className="stack">
            {category === "general" && priceFields}
            {category === "stay" && (
              <div className="input-grid">
                <Field id="roomType" label="Room type" optional>
                  <Select
                    id="roomType"
                    name="roomType"
                    value={draft.roomType}
                    onChange={(event) =>
                      setValue("roomType", event.target.value)
                    }
                  >
                    <option value="">Not provided</option>
                    <option value="private">Private room</option>
                    <option value="dorm">Dorm bed</option>
                    <option value="shared">Shared room</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field id="bookingMethod" label="Booking method" optional>
                  <Select
                    id="bookingMethod"
                    name="bookingMethod"
                    value={draft.bookingMethod}
                    onChange={(event) =>
                      setValue("bookingMethod", event.target.value)
                    }
                  >
                    <option value="">Not provided</option>
                    <option value="direct_call">Direct call</option>
                    <option value="walk_in">Walk in</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
              </div>
            )}
            {category === "transport" && (
              <div className="input-grid">
                <Field id="transportMode" label="Mode" optional>
                  <Select
                    id="transportMode"
                    name="transportMode"
                    value={draft.transportMode}
                    onChange={(event) =>
                      setValue("transportMode", event.target.value)
                    }
                  >
                    <option value="">Not provided</option>
                    {[
                      "bus",
                      "train",
                      "shared_jeep",
                      "auto",
                      "taxi",
                      "ferry",
                      "rental",
                      "other",
                    ].map((value) => (
                      <option value={value} key={value}>
                        {value.replace("_", " ")}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  id="durationMinutes"
                  label="Approximate duration (minutes)"
                  optional
                >
                  <Input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="1"
                    max="2880"
                    value={draft.durationMinutes}
                    onChange={(event) =>
                      setValue("durationMinutes", event.target.value)
                    }
                  />
                </Field>
              </div>
            )}
            {category === "explore" && (
              <Field id="walkMinutes" label="Walking time (minutes)" optional>
                <Input
                  id="walkMinutes"
                  name="walkMinutes"
                  type="number"
                  min="1"
                  max="2880"
                  value={draft.walkMinutes}
                  onChange={(event) =>
                    setValue("walkMinutes", event.target.value)
                  }
                />
              </Field>
            )}
            <Field id="locationText" label="Location" optional>
              <Input
                id="locationText"
                name="locationText"
                value={draft.locationText}
                onChange={(event) =>
                  setValue("locationText", event.target.value)
                }
              />
            </Field>
            <Field id="mapsUrl" label="Google Maps link" optional>
              <Input
                id="mapsUrl"
                name="mapsUrl"
                type="url"
                value={draft.mapsUrl}
                onChange={(event) => setValue("mapsUrl", event.target.value)}
              />
            </Field>
            <Field id="phone" label="Public service contact" optional>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={draft.phone}
                onChange={(event) => setValue("phone", event.target.value)}
              />
            </Field>
            <label className="check-row">
              <input type="checkbox" name="publicServiceContact" /> I confirm
              this is a public service number and I have permission to share it.
            </label>
          </div>
        </details>

        <PhotoUploader
          key={restored ? "restored-photos" : "new-photos"}
          signedIn={signedIn}
          photos={draft.photos}
          onChange={setPhotos}
          onBusyChange={setPhotoBusy}
          onRequireAuth={requirePhotoAuth}
        />

        <div className="composer-footer">
          <span className="small muted">Shared from your own experience.</span>
          <Button busy={pending} disabled={photoBusy} type="submit">
            {photoBusy
              ? "Finish uploading photos…"
              : pending
                ? "Sharing…"
                : "Share tip"}
          </Button>
        </div>
      </form>
    </>
  );
}
