"use server";

import { ZodError } from "zod";
import { getDatabase } from "../../../../src/db";
import { parseMoney } from "../../../../src/lib/money";
import { contributionInput } from "../../../../src/lib/validation/contribution";
import { viewer } from "../../../../src/server/auth";
import { DomainError } from "../../../../src/server/result";
import { createContribution } from "../../../../src/server/services/contributions";

export type ComposerActionState = {
  status: "idle" | "error" | "auth" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  tipId?: string;
  returnTo?: string;
};

const text = (data: FormData, name: string) => String(data.get(name) ?? "");
const nullableNumber = (data: FormData, name: string) => {
  const value = text(data, name).trim();
  return value ? Number(value) : null;
};

export async function shareContribution(
  _previous: ComposerActionState,
  data: FormData,
): Promise<ComposerActionState> {
  const slug = text(data, "slug");
  const returnTo = `/destinations/${encodeURIComponent(slug)}/add`;

  try {
    const pricePaise = parseMoney(text(data, "price"));
    const input = contributionInput.parse({
      destinationId: text(data, "destinationId"),
      category: text(data, "category"),
      body: text(data, "body"),
      visitedMonth: text(data, "visitedMonth"),
      pricePaise,
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
      parentContributionId: null,
      parentRevision: null,
    });
    const user = await viewer();
    if (!user) {
      return {
        status: "auth",
        message:
          "Sign in with Google to share this tip. Your draft is still available.",
        returnTo,
      };
    }
    const { db } = await getDatabase();
    const result = await createContribution(
      db,
      user.id,
      text(data, "mutationId"),
      input,
    );
    return { status: "success", tipId: result.id };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        status: "error",
        message: "Review the highlighted fields and try again.",
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    if (error instanceof DomainError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof Error && /price|₹/.test(error.message)) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: { price: [error.message] },
      };
    }
    return {
      status: "error",
      message:
        "Your tip could not be shared. Your draft is retained; try again.",
    };
  }
}
