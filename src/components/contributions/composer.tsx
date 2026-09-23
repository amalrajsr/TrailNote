"use client";

import { ArrowRight, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  categories,
  categoryLabels,
  priceUnitsByCategory,
  unitLabels,
  type Category,
} from "../../lib/constants";
import {
  currentMonth,
  formatMonth,
  visitMonthChoice,
} from "../../lib/visit-month";
import { parseMoney } from "../../lib/money";
import {
  contributionBodyMaxLength,
  contributionBodyMinLength,
  contributionInput,
  textLength,
} from "../../lib/validation/contribution";
import { CategoryIcon } from "../ui/category-icon";
import { CustomSelect } from "../ui/custom-select";
import { Dialog } from "../ui/overlays";
import { Button, Field, Input, Textarea } from "../ui/primitives";
import { toast } from "../ui/toaster";
import { PhotoUploader, type UploadedPhoto } from "./photo-uploader";
import {
  shareContribution,
  type ComposerActionState,
} from "../../../app/destinations/[slug]/add/actions";
import { shareUpdate } from "../../../app/tips/[id]/update/actions";
import { shareEdit } from "../../../app/tips/[id]/edit/actions";

type Destination = {
  id: string;
  slug: string;
  name: string;
  state: string;
};

type OriginalTipSummary = {
  id: string;
  revision: number;
  title: string;
  body: string;
  priceLabel: string | null;
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
  timingNote: string;
  boardingPoint: string;
  locationText: string;
  mapsUrl: string;
  phone: string;
  publicServiceContact: boolean;
  photos: UploadedPhoto[];
};

const initialActionState: ComposerActionState = { status: "idle" };
const categoryNames: Record<Category, string> = {
  ...categoryLabels,
  general: "General",
};
const categoryCopy: Record<
  Category,
  { prompt: string; helper: string; placeholder: string }
> = {
  general: {
    prompt: "What do you wish you knew before coming here?",
    helper: "A small detail can save someone time, money, or confusion.",
    placeholder: "The ticket counter only accepted cash when I visited.",
  },
  stay: {
    prompt: "What should someone know before staying here?",
    helper:
      "Room price, booking method, location, contact, or something unexpected.",
    placeholder:
      "I called directly and got the room for ₹650, cheaper than the online rate.",
  },
  food: {
    prompt: "What did you eat, and what should someone know?",
    helper: "Dish, price, portion size, timing, or what to order.",
    placeholder: "The meals were ₹90 and sold out by around 1:30 PM.",
  },
  transport: {
    prompt: "How did you get there, and what would make the journey easier?",
    helper: "Route, fare, travel time, boarding point, or last service.",
    placeholder:
      "The local bus to Pattadakal cost ₹35 and took around 40 minutes.",
  },
  explore: {
    prompt: "What should someone know before visiting this place?",
    helper:
      "Entry fee, best time, route, time needed, or something easy to miss.",
    placeholder: "Go before 4 PM — the last entry was earlier than I expected.",
  },
};
const genericTipPatterns = [
  /^nice[.! ]*$/i,
  /^good[.! ]*$/i,
  /^great[.! ]*$/i,
  /^amazing[.! ]*$/i,
  /^beautiful[.! ]*$/i,
  /^awesome[.! ]*$/i,
  /^must visit[.! ]*$/i,
  /^worth visiting[.! ]*$/i,
];
const detailPrompts: Record<Category, string[]> = {
  general: [],
  stay: ["price", "booking", "contact", "location", "photo"],
  food: ["price", "dish", "timing", "location", "photo"],
  transport: [
    "price",
    "route",
    "duration",
    "boarding",
    "timing",
    "location",
    "photo",
  ],
  explore: ["price", "timing", "duration", "location", "photo"],
};
const detailLabels: Record<string, string> = {
  price: "₹ Price",
  booking: "How you booked",
  location: "Location",
  contact: "Contact",
  dish: "What you ordered",
  timing: "Timing",
  route: "Route",
  duration: "Travel time",
  boarding: "Boarding point",
  photo: "Photo",
};
const defaultUnits: Record<Category, string> = {
  stay: "room_night",
  food: "",
  transport: "person_trip",
  explore: "entry_person",
  general: "",
};
const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return {
    value,
    label: new Intl.DateTimeFormat("en", { month: "long" }).format(
      new Date(2000, index, 1),
    ),
  };
});

function previousMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return value === 1
    ? `${year - 1}-12`
    : `${year}-${String(value - 1).padStart(2, "0")}`;
}

function normalizeVisitedChoice(choice: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(choice)) return choice;
  return visitMonthChoice(choice);
}

function previewMonth(value: string) {
  if (!value) return "Not sure";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function initialDetailKeys(initialDraft?: Partial<Draft>) {
  if (!initialDraft) return [];
  return Object.entries({
    price: initialDraft.price,
    place: initialDraft.placeName,
    booking: initialDraft.bookingMethod || initialDraft.roomType,
    location:
      initialDraft.locationText ||
      initialDraft.mapsUrl ||
      initialDraft.placeName,
    contact: initialDraft.phone,
    dish: initialDraft.dish,
    timing: initialDraft.timingNote,
    route: initialDraft.fromName || initialDraft.toName,
    duration: initialDraft.durationMinutes || initialDraft.walkMinutes,
    boarding: initialDraft.boardingPoint,
    photo: initialDraft.photos?.length,
  })
    .filter(([, value]) => !!value)
    .map(([key]) => key);
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
    timingNote: "",
    boardingPoint: "",
    locationText: "",
    mapsUrl: "",
    phone: "",
    publicServiceContact: false,
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
  mode = "create",
  original,
  initialDraft,
  edit,
}: {
  destination: Destination;
  initialCategory: Category;
  initialMutationId: string;
  signedIn: boolean;
  mode?: "create" | "update" | "edit";
  original?: OriginalTipSummary;
  initialDraft?: Partial<Draft>;
  edit?: {
    id: string;
    revision: number;
    confirmationCount: number;
    helpfulCount: number;
    parentContributionId: string | null;
    parentRevision: number | null;
  };
}) {
  const router = useRouter();
  const storageKey =
    mode === "update" && original
      ? `fieldnotes:draft:v1:${destination.id}:update-${original.id}`
      : mode === "edit" && edit
        ? `fieldnotes:draft:v1:${destination.id}:edit-${edit.id}`
        : `fieldnotes:draft:${destination.slug}`;
  const [draft, setDraft] = useState(() => {
    const initial = {
      ...makeDraft(initialCategory, initialMutationId),
      ...initialDraft,
      mutationId: initialMutationId,
    };
    return {
      ...initial,
      visitedChoice: normalizeVisitedChoice(initial.visitedChoice),
    };
  });
  const [restored, setRestored] = useState(false);
  const [details, setDetails] = useState(true);
  const [enabledDetails, setEnabledDetails] = useState<string[]>(() =>
    initialDetailKeys(initialDraft),
  );
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showUsefulnessGuidance, setShowUsefulnessGuidance] = useState(false);
  const [clientFieldErrors, setClientFieldErrors] = useState<
    Record<string, string[]>
  >({});
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const submitAction =
    mode === "update"
      ? shareUpdate
      : mode === "edit"
        ? shareEdit
        : shareContribution;
  const [state, action, pending] = useActionState(
    submitAction,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const draftSaved = useRef(false);
  const initialDraftRef = useRef(draft);
  const confirmedSubmitRef = useRef(false);
  const month = useMemo(() => currentMonth(), []);
  const lastMonth = useMemo(() => previousMonth(month), [month]);

  const focusAndScrollTo = useCallback((target: HTMLElement | null) => {
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  }, []);

  const revealInvalidField = useCallback(
    (name: string) => {
      window.requestAnimationFrame(() => {
        const namedControl = formRef.current?.elements.namedItem(name);
        const target =
          document.getElementById(name) ??
          (namedControl instanceof HTMLElement ? namedControl : null);
        focusAndScrollTo(target ?? summaryRef.current);
      });
    },
    [focusAndScrollTo],
  );

  const inputForDraft = (value: Draft) => {
    let pricePaise: number | null;
    try {
      pricePaise = parseMoney(value.price);
    } catch (error) {
      return {
        success: false as const,
        fieldErrors: {
          price: [
            error instanceof Error ? error.message : "Enter a valid price.",
          ],
        },
      };
    }

    const result = contributionInput.safeParse({
      destinationId: destination.id,
      category: value.category,
      body: value.body,
      visitedMonth:
        value.visitedChoice === "custom"
          ? value.visitedMonth
          : value.visitedChoice,
      pricePaise,
      priceUnit: value.priceUnit,
      priceUnitLabel: value.priceUnitLabel,
      placeName: value.placeName,
      roomType: value.roomType,
      bookingMethod: value.bookingMethod,
      dish: value.dish,
      fromName: value.fromName,
      toName: value.toName,
      transportMode: value.transportMode,
      durationMinutes: value.durationMinutes
        ? Number(value.durationMinutes)
        : null,
      walkMinutes: value.walkMinutes ? Number(value.walkMinutes) : null,
      timingNote: value.timingNote,
      boardingPoint: value.boardingPoint,
      locationText: value.locationText,
      mapsUrl: value.mapsUrl,
      phone: value.phone,
      publicServiceContact: value.publicServiceContact,
      photos: value.photos.map((photo) => ({ id: photo.id, alt: photo.alt })),
      parentContributionId: original?.id ?? edit?.parentContributionId ?? null,
      parentRevision: original?.revision ?? edit?.parentRevision ?? null,
    });

    return result.success
      ? { success: true as const, data: result.data }
      : {
          success: false as const,
          fieldErrors: result.error.flatten().fieldErrors as Record<
            string,
            string[]
          >,
        };
  };

  const validateDraft = () => inputForDraft(draft);

  const hasMeaningfulEdit = () => {
    const current = validateDraft();
    const initial = inputForDraft(initialDraftRef.current);
    return (
      current.success &&
      initial.success &&
      JSON.stringify(current.data) !== JSON.stringify(initial.data)
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setShowValidation(true);
    setClientFieldErrors({});
    const body = draft.body.trim();
    if (
      textLength(body) < contributionBodyMinLength ||
      genericTipPatterns.some((pattern) => pattern.test(body))
    ) {
      event.preventDefault();
      toast("Give the next traveller one detail they can use.", "error");
      setShowUsefulnessGuidance(true);
      revealInvalidField("body");
      return;
    }
    setShowUsefulnessGuidance(false);
    const result = validateDraft();
    if (!result.success) {
      event.preventDefault();
      toast("Review the highlighted fields and try again.", "error");
      setClientFieldErrors(result.fieldErrors);
      setShowValidation(true);
      revealInvalidField(Object.keys(result.fieldErrors)[0]);
      return;
    }
    if (mode === "edit" && !hasMeaningfulEdit()) {
      event.preventDefault();
      toast("No changes to save.");
      return;
    }
    if (
      mode === "edit" &&
      ((edit?.confirmationCount ?? 0) > 0 || (edit?.helpfulCount ?? 0) > 0) &&
      !confirmedSubmitRef.current
    ) {
      event.preventDefault();
      setShowEditConfirmation(true);
      return;
    }
    confirmedSubmitRef.current = false;
  };

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Draft>;
        if (parsed.body || parsed.category) {
          // A saved draft may have been submitted before its response reached
          // the browser. Restore its content, but never reuse that attempt's
          // idempotency key for a new submission.
          const savedDraft = { ...parsed };
          delete savedDraft.mutationId;
          queueMicrotask(() => {
            if (cancelled) return;
            setDraft((current) => {
              const restoredDraft = {
                ...current,
                ...savedDraft,
                phone: "",
                photos: Array.isArray(parsed.photos) ? parsed.photos : [],
              };
              return {
                ...restoredDraft,
                visitedChoice: normalizeVisitedChoice(
                  restoredDraft.visitedChoice,
                ),
              };
            });
            setEnabledDetails(initialDetailKeys(parsed));
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
      toast(
        mode === "update"
          ? "Update shared."
          : mode === "edit"
            ? "Changes saved."
            : "Tip added.",
      );
      if (state.tipId) router.push(`/tips/${state.tipId}`);
      return;
    }
    if (state.status === "unchanged") {
      toast("No changes to save.");
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
  }, [draft, mode, router, state.status, state.tipId, storageKey]);

  useEffect(() => {
    if (state.status === "auth" && state.returnTo) {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify(storableDraft(draft)),
        );
        draftSaved.current = true;
      } catch {
        // The sign-in screen avoids claiming persistence when storage fails.
      }
      router.push(
        `/sign-in?returnTo=${encodeURIComponent(state.returnTo)}${draftSaved.current ? "&draft=1" : ""}`,
      );
    }
  }, [draft, router, state, storageKey]);

  useEffect(() => {
    if (state.status === "error") {
      toast(
        state.message ?? "Review the highlighted fields and try again.",
        "error",
      );
      focusAndScrollTo(summaryRef.current);
    }
  }, [focusAndScrollTo, state.message, state.status]);

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
      `/sign-in?returnTo=${encodeURIComponent(
        mode === "update" && original
          ? `/tips/${original.id}/update`
          : mode === "edit" && edit
            ? `/tips/${edit.id}/edit`
            : `/destinations/${destination.slug}/add`,
      )}&draft=1`,
    );
  }, [destination.slug, draft, edit, mode, original, router, storageKey]);

  if (state.status === "success") return null;

  const error = (name: string) => {
    if (!showValidation) return undefined;
    return clientFieldErrors[name]?.[0] ?? state.fieldErrors?.[name]?.[0];
  };
  const setValue = (name: string, value: string) =>
    setDraft((current) => ({ ...current, [name]: value }));
  const toggleDetail = (key: string) =>
    setEnabledDetails((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key],
    );
  const detailEnabled = (key: string) => enabledDetails.includes(key);
  const feedbackResetMessage = (() => {
    if (!edit) return "";
    const confirmationCount = edit.confirmationCount;
    const helpfulCount = edit.helpfulCount;
    if (confirmationCount > 0 && helpfulCount > 0)
      return `${confirmationCount} ${confirmationCount === 1 ? "traveller confirmed" : "travellers confirmed"} the current information and ${helpfulCount} marked it as helpful. Saving your changes will reset this feedback because it was given before the tip was edited.`;
    if (confirmationCount > 0)
      return `${confirmationCount} ${confirmationCount === 1 ? "traveller confirmed" : "travellers confirmed"} the current information. Saving your changes will reset these confirmations because they were given before the tip was edited.`;
    return `${helpfulCount} ${helpfulCount === 1 ? "traveller marked" : "travellers marked"} the current tip as helpful. Saving your changes will reset ${helpfulCount === 1 ? "this Helpful mark" : "these Helpful marks"} because ${helpfulCount === 1 ? "it was" : "they were"} given for the information before your edit.`;
  })();
  const category = draft.category;
  const currentYear = month.slice(0, 4);
  const currentMonthValue = month.slice(5, 7);
  const [visitedYear, visitedMonthValue] = draft.visitedMonth.split("-");
  const selectableMonths = monthOptions.filter(
    ({ value }) => visitedYear !== currentYear || value <= currentMonthValue,
  );
  const visitedYears = Array.from(
    { length: Number(currentYear) - 1999 },
    (_, index) => String(Number(currentYear) - index),
  );
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
          <CustomSelect
            id="priceUnit"
            ariaLabel="What the price covers"
            name="priceUnit"
            value={draft.priceUnit}
            onValueChange={(nextValue) => setValue("priceUnit", nextValue)}
            options={[
              { value: "", label: "Choose a unit" },
              ...priceUnitsByCategory[category].map((value) => ({
                value,
                label: unitLabels[value].replace(/^\/ /, ""),
              })),
            ]}
          />
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
      {mode === "create" && (
        <fieldset className="composer-categories">
          <legend className="composer-section-label">
            What are you sharing?
          </legend>
          <div className="composer-category-grid">
            {[
              "general",
              ...categories.filter((value) => value !== "general"),
            ].map((value) => (
              <button
                type="button"
                className={`composer-category ${category === value ? "selected" : ""}`}
                aria-pressed={category === value}
                key={value}
                onClick={() => {
                  setEnabledDetails([]);
                  setDraft((current) => ({
                    ...current,
                    category: value as Category,
                    price: "",
                    priceUnit: defaultUnits[value as Category],
                    priceUnitLabel: "",
                  }));
                }}
              >
                <CategoryIcon category={value as Category} />
                {categoryNames[value as Category]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <form
        ref={formRef}
        action={action}
        className="form-card contribution-form"
        noValidate
        onChange={() => setShowValidation(false)}
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="destinationId" value={destination.id} />
        <input type="hidden" name="slug" value={destination.slug} />
        <input type="hidden" name="mutationId" value={draft.mutationId} />
        <input type="hidden" name="category" value={category} />
        <input
          type="hidden"
          name="parentContributionId"
          value={original?.id ?? edit?.parentContributionId ?? ""}
        />
        <input
          type="hidden"
          name="parentRevision"
          value={original?.revision ?? edit?.parentRevision ?? ""}
        />
        {edit && (
          <>
            <input type="hidden" name="id" value={edit.id} />
            <input
              type="hidden"
              name="expectedRevision"
              value={edit.revision}
            />
          </>
        )}
        <input
          type="hidden"
          name="visitedMonth"
          value={
            draft.visitedChoice === "custom"
              ? draft.visitedMonth
              : draft.visitedChoice
          }
        />

        {showValidation &&
          (state.status === "error" ||
            Object.keys(clientFieldErrors).length > 0) && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              className="sr-only"
              aria-hidden="true"
            />
          )}

        {mode === "update" && original ? (
          <section className="original-summary" aria-labelledby="original-tip">
            <p className="eyebrow" id="original-tip">
              Original report · version {original.revision}
            </p>
            <h2>{original.title}</h2>
            {original.priceLabel && <strong>{original.priceLabel}</strong>}
            <p>{original.body}</p>
            <p className="small muted">
              Destination and category stay linked to this report. Leave revised
              facts blank when you did not observe a new value.
            </p>
          </section>
        ) : null}

        <div className="category-fields">
          <Field
            id="body"
            label={
              mode === "update"
                ? "Tell travellers what's different"
                : categoryCopy[category].prompt
            }
            error={error("body")}
            helper={categoryCopy[category].helper}
          >
            <Textarea
              id="body"
              name="body"
              required
              placeholder={categoryCopy[category].placeholder}
              value={draft.body}
              onChange={(event) => {
                setValue(
                  "body",
                  Array.from(event.target.value)
                    .slice(0, contributionBodyMaxLength)
                    .join(""),
                );
                setShowUsefulnessGuidance(false);
              }}
              aria-describedby={`body-help${error("body") ? " body-error" : ""}${showUsefulnessGuidance ? " body-usefulness" : ""}`}
              aria-invalid={!!error("body") || showUsefulnessGuidance}
            />
            <div id="body-help" className="field-foot">
              <span>Share a useful detail rather than a general review.</span>
              <span>
                {textLength(draft.body)} /{" "}
                {contributionBodyMaxLength.toLocaleString("en-IN")}
              </span>
            </div>
            {showUsefulnessGuidance && (
              <p
                id="body-usefulness"
                className="usefulness-guidance"
                role="alert"
              >
                Give the next traveller one detail they can use — for example a
                price, route, timing, place, or something to avoid.
              </p>
            )}
          </Field>

          <div className="visited-row">
            <div className="visited-title">
              <label htmlFor="visitedChoice">When were you there?</label>
              <small>Freshness helps the next traveller judge the tip.</small>
            </div>
            <CustomSelect
              id="visitedChoice"
              ariaLabel="When were you there?"
              value={draft.visitedChoice}
              onValueChange={(nextValue) =>
                setValue("visitedChoice", nextValue)
              }
              options={[
                { value: month, label: formatMonth(month) },
                { value: lastMonth, label: formatMonth(lastMonth) },
                { value: "custom", label: "Choose a month…" },
                { value: "", label: "Not sure" },
              ]}
            />
          </div>
          {draft.visitedChoice === "custom" && (
            <Field id="visitedMonthCustom" label="Visit month">
              <div className="input-grid month-picker">
                <CustomSelect
                  id="visitedMonthCustom"
                  ariaLabel="Visit month"
                  value={visitedMonthValue}
                  onValueChange={(nextValue) =>
                    setValue("visitedMonth", `${visitedYear}-${nextValue}`)
                  }
                  options={selectableMonths.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
                <CustomSelect
                  ariaLabel="Visit year"
                  value={visitedYear}
                  onValueChange={(nextValue) => {
                    const nextYear = nextValue;
                    const nextMonth =
                      nextYear === currentYear &&
                      visitedMonthValue > currentMonthValue
                        ? currentMonthValue
                        : visitedMonthValue;
                    setValue("visitedMonth", `${nextYear}-${nextMonth}`);
                  }}
                  options={visitedYears.map((year) => ({
                    value: year,
                    label: year,
                  }))}
                />
              </div>
            </Field>
          )}
        </div>

        {category !== "general" && (
          <details
            open={details}
            onToggle={(event) => setDetails(event.currentTarget.open)}
          >
            <summary>Anything else worth adding?</summary>
            <p className="details-copy">
              Optional prompts to help you remember useful details. You
              don&apos;t need to fill everything.
            </p>
            <div
              className="composer-detail-chips"
              aria-label="Optional details"
            >
              {detailPrompts[category].map((key) => (
                <button
                  type="button"
                  className={`composer-detail-chip ${detailEnabled(key) ? "active" : ""}`}
                  aria-pressed={detailEnabled(key)}
                  key={key}
                  onClick={() => toggleDetail(key)}
                >
                  {detailLabels[key]}
                </button>
              ))}
            </div>
            <div className="stack">
              {(category === "stay" ||
                category === "food" ||
                category === "explore") &&
                detailEnabled("location") && (
                  <Field
                    id="placeName"
                    label={
                      category === "stay" ? "Where did you stay?" : "Place"
                    }
                    optional
                    error={error("placeName")}
                  >
                    <Input
                      id="placeName"
                      name="placeName"
                      value={draft.placeName}
                      onChange={(event) =>
                        setValue("placeName", event.target.value)
                      }
                      aria-describedby={
                        error("placeName") ? "placeName-error" : undefined
                      }
                      aria-invalid={!!error("placeName")}
                    />
                  </Field>
                )}
              {category === "food" && detailEnabled("dish") && (
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
              {category === "transport" && detailEnabled("route") && (
                <div className="input-grid">
                  <Field id="fromName" label="From" optional>
                    <Input
                      id="fromName"
                      name="fromName"
                      value={draft.fromName}
                      onChange={(event) =>
                        setValue("fromName", event.target.value)
                      }
                    />
                  </Field>
                  <Field id="toName" label="To" optional>
                    <Input
                      id="toName"
                      name="toName"
                      value={draft.toName}
                      onChange={(event) =>
                        setValue("toName", event.target.value)
                      }
                    />
                  </Field>
                </div>
              )}
              {detailEnabled("price") && priceFields}
              {category === "stay" && detailEnabled("booking") && (
                <div className="input-grid">
                  <Field id="roomType" label="Room type" optional>
                    <CustomSelect
                      id="roomType"
                      name="roomType"
                      ariaLabel="Room type"
                      value={draft.roomType}
                      onValueChange={(nextValue) =>
                        setValue("roomType", nextValue)
                      }
                      options={[
                        { value: "", label: "Not provided" },
                        { value: "private", label: "Private room" },
                        { value: "dorm", label: "Dorm bed" },
                        { value: "shared", label: "Shared room" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </Field>
                  <Field id="bookingMethod" label="Booking method" optional>
                    <CustomSelect
                      id="bookingMethod"
                      name="bookingMethod"
                      ariaLabel="Booking method"
                      value={draft.bookingMethod}
                      onValueChange={(nextValue) =>
                        setValue("bookingMethod", nextValue)
                      }
                      options={[
                        { value: "", label: "Not provided" },
                        { value: "direct_call", label: "Direct call" },
                        { value: "walk_in", label: "Walk in" },
                        { value: "online", label: "Online" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </Field>
                </div>
              )}
              {category === "transport" && detailEnabled("duration") && (
                <div className="input-grid">
                  <Field id="transportMode" label="Mode" optional>
                    <CustomSelect
                      id="transportMode"
                      name="transportMode"
                      ariaLabel="Mode"
                      value={draft.transportMode}
                      onValueChange={(nextValue) =>
                        setValue("transportMode", nextValue)
                      }
                      options={[
                        { value: "", label: "Not provided" },
                        ...[
                          "bus",
                          "train",
                          "shared_jeep",
                          "auto",
                          "taxi",
                          "ferry",
                          "rental",
                          "other",
                        ].map((value) => ({
                          value,
                          label: value.replace("_", " "),
                        })),
                      ]}
                    />
                  </Field>
                  <Field
                    id="durationMinutes"
                    label="Approximate duration (minutes)"
                    optional
                    error={error("durationMinutes")}
                  >
                    <Input
                      id="durationMinutes"
                      name="durationMinutes"
                      type="number"
                      min="1"
                      max="2880"
                      value={draft.durationMinutes}
                      aria-invalid={!!error("durationMinutes")}
                      aria-describedby={
                        error("durationMinutes")
                          ? "durationMinutes-error"
                          : undefined
                      }
                      onChange={(event) =>
                        setValue("durationMinutes", event.target.value)
                      }
                    />
                  </Field>
                </div>
              )}
              {category === "transport" && detailEnabled("boarding") && (
                <Field
                  id="boardingPoint"
                  label="Where did you board?"
                  optional
                  error={error("boardingPoint")}
                >
                  <Input
                    id="boardingPoint"
                    name="boardingPoint"
                    value={draft.boardingPoint}
                    aria-invalid={!!error("boardingPoint")}
                    aria-describedby={
                      error("boardingPoint") ? "boardingPoint-error" : undefined
                    }
                    onChange={(event) =>
                      setValue("boardingPoint", event.target.value)
                    }
                  />
                </Field>
              )}
              {category === "explore" && detailEnabled("duration") && (
                <Field
                  id="durationMinutes"
                  label="Time needed (minutes)"
                  optional
                  error={error("durationMinutes")}
                >
                  <Input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="1"
                    max="2880"
                    value={draft.durationMinutes}
                    aria-invalid={!!error("durationMinutes")}
                    aria-describedby={
                      error("durationMinutes")
                        ? "durationMinutes-error"
                        : undefined
                    }
                    onChange={(event) =>
                      setValue("durationMinutes", event.target.value)
                    }
                  />
                </Field>
              )}
              {detailEnabled("timing") && (
                <Field
                  id="timingNote"
                  label="Anything useful about timing?"
                  optional
                  error={error("timingNote")}
                >
                  <Input
                    id="timingNote"
                    name="timingNote"
                    value={draft.timingNote}
                    aria-invalid={!!error("timingNote")}
                    aria-describedby={
                      error("timingNote") ? "timingNote-error" : undefined
                    }
                    onChange={(event) =>
                      setValue("timingNote", event.target.value)
                    }
                  />
                </Field>
              )}
              {detailEnabled("location") && (
                <>
                  <Field
                    id="locationText"
                    label="Where exactly?"
                    optional
                    error={error("locationText")}
                  >
                    <Input
                      id="locationText"
                      name="locationText"
                      value={draft.locationText}
                      aria-invalid={!!error("locationText")}
                      aria-describedby={
                        error("locationText") ? "locationText-error" : undefined
                      }
                      onChange={(event) =>
                        setValue("locationText", event.target.value)
                      }
                    />
                  </Field>
                  <Field
                    id="mapsUrl"
                    label="Google Maps link"
                    optional
                    error={error("mapsUrl")}
                  >
                    <Input
                      id="mapsUrl"
                      name="mapsUrl"
                      type="url"
                      value={draft.mapsUrl}
                      aria-invalid={!!error("mapsUrl")}
                      aria-describedby={
                        error("mapsUrl") ? "mapsUrl-error" : undefined
                      }
                      onChange={(event) =>
                        setValue("mapsUrl", event.target.value)
                      }
                    />
                  </Field>
                </>
              )}
              {detailEnabled("contact") && (
                <>
                  <Field
                    id="phone"
                    label="Public business/service contact"
                    optional
                  >
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={draft.phone}
                      onChange={(event) =>
                        setValue("phone", event.target.value)
                      }
                    />
                  </Field>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="publicServiceContact"
                      checked={draft.publicServiceContact}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          publicServiceContact: event.target.checked,
                        }))
                      }
                    />{" "}
                    I confirm this is a public service number and I have
                    permission to share it.
                  </label>
                </>
              )}
            </div>
          </details>
        )}

        <div className="reader-preview" aria-live="polite">
          <p className="reader-preview-label">The next traveller will see</p>
          <p className="reader-preview-meta">
            {categoryNames[category]} · Visited{" "}
            {previewMonth(
              draft.visitedChoice === "custom"
                ? draft.visitedMonth
                : draft.visitedChoice,
            )}
          </p>
          <p className="reader-preview-text">
            {draft.body.trim() || "Your tip will appear here as you write it."}
          </p>
        </div>

        {(detailEnabled("photo") || draft.photos.length > 0) && (
          <PhotoUploader
            key={restored ? "restored-photos" : "new-photos"}
            signedIn={signedIn}
            photos={draft.photos}
            onChange={setPhotos}
            onBusyChange={setPhotoBusy}
            onRequireAuth={requirePhotoAuth}
          />
        )}

        <div className="composer-footer">
          <span className="small muted">Shared from your own experience.</span>
          <Button busy={pending} disabled={photoBusy} type="submit">
            {photoBusy
              ? "Finish uploading photos…"
              : pending
                ? "Sharing…"
                : mode === "update"
                  ? "Share update"
                  : mode === "edit"
                    ? "Save changes"
                    : "Share tip"}
            {mode === "create" && <ArrowRight size={17} aria-hidden="true" />}
          </Button>
        </div>
      </form>
      {mode === "edit" && edit && (
        <Dialog
          open={showEditConfirmation}
          onOpenChange={setShowEditConfirmation}
          title="Save changes?"
          description={feedbackResetMessage}
          className="edit-feedback-dialog"
        >
          <div className="dialog-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowEditConfirmation(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                confirmedSubmitRef.current = true;
                setShowEditConfirmation(false);
                formRef.current?.requestSubmit();
              }}
            >
              Save changes
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
