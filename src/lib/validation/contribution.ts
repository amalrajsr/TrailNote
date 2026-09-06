import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  categories,
  priceUnits,
  roomTypes,
  bookingMethods,
  transportModes,
} from "../constants";
import { validMonth } from "../visit-month";
import { validMapsUrl } from "../urls";
export const textLength = (value: string) => Array.from(value).length;
const nullableText = (max: number) =>
  z.preprocess(
    (v) =>
      v == null || v === ""
        ? null
        : typeof v === "string"
          ? v.trim() || null
          : v,
    z
      .string()
      .refine((v) => textLength(v) <= max, `Use at most ${max} characters.`)
      .nullable(),
  );
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (v == null || v === "" ? null : v),
    z.enum(values).nullable(),
  );
const minutes = z.preprocess(
  (v) => (v == null || v === "" ? null : v),
  z.number().int().min(1).max(2880).nullable(),
);
export const contributionInput = z
  .object({
    destinationId: z.uuid(),
    category: z.enum(categories),
    body: z
      .string()
      .trim()
      .refine(
        (v) => textLength(v) >= 10 && textLength(v) <= 1000,
        "Write between 10 and 1,000 characters.",
      ),
    visitedMonth: nullableText(7).refine(
      (v) => v === null || validMonth(v),
      "Choose a valid month from January 2000 through this month.",
    ),
    pricePaise: z.number().int().min(0).max(100000000).nullable().default(null),
    priceUnit: optionalChoice(priceUnits),
    priceUnitLabel: nullableText(40),
    placeName: nullableText(120),
    roomType: optionalChoice(roomTypes),
    bookingMethod: optionalChoice(bookingMethods),
    dish: nullableText(120),
    fromName: nullableText(120),
    toName: nullableText(120),
    transportMode: optionalChoice(transportModes),
    durationMinutes: minutes,
    walkMinutes: minutes,
    locationText: nullableText(200),
    mapsUrl: nullableText(1000).refine(
      (v) => v === null || validMapsUrl(v),
      "Use an HTTPS Google Maps link.",
    ),
    phone: nullableText(30),
    publicServiceContact: z.boolean().default(false),
    photos: z
      .array(z.object({ id: z.uuid(), alt: nullableText(160) }))
      .max(3)
      .default([]),
    parentContributionId: z.uuid().nullable().default(null),
    parentRevision: z.number().int().positive().nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.pricePaise !== null && !v.priceUnit)
      ctx.addIssue({
        code: "custom",
        path: ["priceUnit"],
        message: "Choose what this price covers.",
      });
    if (v.pricePaise !== null && v.priceUnit === "other" && !v.priceUnitLabel)
      ctx.addIssue({
        code: "custom",
        path: ["priceUnitLabel"],
        message: "Describe the price unit.",
      });
    if (
      v.phone &&
      (!v.publicServiceContact ||
        !parsePhoneNumberFromString(v.phone, "IN")?.isValid() ||
        parsePhoneNumberFromString(v.phone, "IN")?.country !== "IN")
    )
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message:
          "Enter a valid Indian public service number and confirm permission to share it.",
      });
    if (new Set(v.photos.map((p) => p.id)).size !== v.photos.length)
      ctx.addIssue({
        code: "custom",
        path: ["photos"],
        message: "Choose each photo only once.",
      });
    if (!!v.parentContributionId !== !!v.parentRevision)
      ctx.addIssue({
        code: "custom",
        path: ["parentRevision"],
        message: "The original version is required.",
      });
  })
  .transform((v) => ({
    ...v,
    priceUnit: v.pricePaise === null ? null : v.priceUnit,
    priceUnitLabel:
      v.pricePaise !== null && v.priceUnit === "other"
        ? v.priceUnitLabel
        : null,
    phone: v.phone ? parsePhoneNumberFromString(v.phone, "IN")!.number : null,
    placeName: ["stay", "food", "explore"].includes(v.category)
      ? v.placeName
      : null,
    roomType: v.category === "stay" ? v.roomType : null,
    bookingMethod: v.category === "stay" ? v.bookingMethod : null,
    dish: v.category === "food" ? v.dish : null,
    fromName: v.category === "transport" ? v.fromName : null,
    toName: v.category === "transport" ? v.toName : null,
    transportMode: v.category === "transport" ? v.transportMode : null,
    durationMinutes: v.category === "transport" ? v.durationMinutes : null,
    walkMinutes: v.category === "explore" ? v.walkMinutes : null,
  }));
export type ContributionInput = z.output<typeof contributionInput>;
