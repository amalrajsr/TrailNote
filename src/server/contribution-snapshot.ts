import "server-only";

import { z } from "zod";
import {
  bookingMethods,
  categories,
  priceUnits,
  roomTypes,
  transportModes,
  type Category,
  type PriceUnit,
} from "../lib/constants";

const nullableText = z.string().nullable();

const snapshotSchema = z.object({
  destinationId: z.uuid().optional().default(""),
  category: z.enum(categories),
  body: z.string(),
  visitedMonth: nullableText.optional().default(null),
  pricePaise: z.number().int().nullable().optional().default(null),
  priceUnit: z.enum(priceUnits).nullable().optional().default(null),
  priceUnitLabel: nullableText.optional().default(null),
  placeName: nullableText.optional().default(null),
  roomType: z.enum(roomTypes).nullable().optional().default(null),
  bookingMethod: z.enum(bookingMethods).nullable().optional().default(null),
  dish: nullableText.optional().default(null),
  fromName: nullableText.optional().default(null),
  toName: nullableText.optional().default(null),
  transportMode: z.enum(transportModes).nullable().optional().default(null),
  durationMinutes: z.number().int().nullable().optional().default(null),
  walkMinutes: z.number().int().nullable().optional().default(null),
  timingNote: nullableText.optional().default(null),
  boardingPoint: nullableText.optional().default(null),
  locationText: nullableText.optional().default(null),
  mapsUrl: nullableText.optional().default(null),
  parentContributionId: z.uuid().nullable().optional().default(null),
  parentRevision: z
    .number()
    .int()
    .positive()
    .nullable()
    .optional()
    .default(null),
});

export type PublicContributionSnapshot = z.infer<typeof snapshotSchema> & {
  category: Category;
  priceUnit: PriceUnit | null;
};

export function readPublicContributionSnapshot(
  value: string,
): PublicContributionSnapshot | null {
  try {
    return snapshotSchema.safeParse(JSON.parse(value)).data ?? null;
  } catch {
    return null;
  }
}
