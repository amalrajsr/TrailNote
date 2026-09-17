import { describe, expect, it } from "vitest";
import {
  contributionBodyMaxLength,
  contributionBodyMinLength,
  contributionInput,
} from "../../src/lib/validation/contribution";

const validContribution = (body: string) => ({
  destinationId: "10000000-0000-4000-8000-000000000001",
  category: "general" as const,
  body,
  visitedMonth: null,
  pricePaise: null,
  priceUnit: null,
  priceUnitLabel: null,
  placeName: null,
  roomType: null,
  bookingMethod: null,
  dish: null,
  fromName: null,
  toName: null,
  transportMode: null,
  durationMinutes: null,
  walkMinutes: null,
  timingNote: null,
  boardingPoint: null,
  locationText: null,
  mapsUrl: null,
  phone: null,
  publicServiceContact: false,
  photos: [],
  parentContributionId: null,
  parentRevision: null,
});

describe("contribution body validation", () => {
  it("accepts the same inclusive limits used by the composer", () => {
    expect(
      contributionInput.safeParse(
        validContribution("a".repeat(contributionBodyMinLength)),
      ).success,
    ).toBe(true);
    expect(
      contributionInput.safeParse(
        validContribution("a".repeat(contributionBodyMaxLength)),
      ).success,
    ).toBe(true);
  });

  it("rejects text outside the shared limits", () => {
    expect(
      contributionInput.safeParse(
        validContribution("a".repeat(contributionBodyMinLength - 1)),
      ).success,
    ).toBe(false);
    expect(
      contributionInput.safeParse(
        validContribution("a".repeat(contributionBodyMaxLength + 1)),
      ).success,
    ).toBe(false);
  });

  it("counts submitted CRLF line breaks the same way as the textarea", () => {
    const browserText = "a\n".repeat(contributionBodyMaxLength / 2 - 1) + "ab";
    const submittedText = browserText.replaceAll("\n", "\r\n");
    const result = contributionInput.safeParse(
      validContribution(submittedText),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toBe(browserText);
      expect(Array.from(result.data.body)).toHaveLength(
        contributionBodyMaxLength,
      );
    }
  });
});
