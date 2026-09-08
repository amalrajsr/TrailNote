import "server-only";

import { parseMoney } from "../lib/money";
import { contributionInput } from "../lib/validation/contribution";

const text = (data: FormData, name: string) => String(data.get(name) ?? "");

const nullableNumber = (data: FormData, name: string) => {
  const value = text(data, name).trim();
  return value ? Number(value) : null;
};

export function parseContributionForm(data: FormData) {
  return contributionInput.parse({
    destinationId: text(data, "destinationId"),
    category: text(data, "category"),
    body: text(data, "body"),
    visitedMonth: text(data, "visitedMonth"),
    pricePaise: parseMoney(text(data, "price")),
    priceUnit: text(data, "priceUnit"),
    priceUnitLabel: text(data, "priceUnitLabel"),
    placeName: text(data, "placeName"),
    roomType: text(data, "roomType"),
    bookingMethod: text(data, "bookingMethod"),
    dish: text(data, "dish"),
    fromName: text(data, "fromName"),
    toName: text(data, "toName"),
    transportMode: text(data, "transportMode"),
    durationMinutes: nullableNumber(data, "durationMinutes"),
    walkMinutes: nullableNumber(data, "walkMinutes"),
    locationText: text(data, "locationText"),
    mapsUrl: text(data, "mapsUrl"),
    phone: text(data, "phone"),
    publicServiceContact: data.get("publicServiceContact") === "on",
    photos: data.getAll("photoId").map((id, index) => ({
      id: String(id),
      alt: String(data.getAll("photoAlt")[index] ?? ""),
    })),
    parentContributionId: text(data, "parentContributionId") || null,
    parentRevision: nullableNumber(data, "parentRevision"),
  });
}

export const formText = text;
