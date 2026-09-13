import { describe, expect, it } from "vitest";
import { priceUnits, priceUnitsByCategory } from "../../src/lib/constants";
import { parseMoney, formatMoney } from "../../src/lib/money";
import { currentMonth, validMonth, freshness } from "../../src/lib/visit-month";
import { safeReturnUrl, validMapsUrl } from "../../src/lib/urls";
describe("travel domain rules", () => {
  it("limits price units to choices relevant to each category", () => {
    expect(priceUnitsByCategory.stay).toEqual([
      "room_night",
      "bed_night",
      "person_night",
      "other",
    ]);
    expect(priceUnitsByCategory.food).toEqual(["meal", "item", "other"]);
    expect(priceUnitsByCategory.transport).toEqual([
      "person_trip",
      "vehicle_trip",
      "other",
    ]);
    expect(priceUnitsByCategory.explore).toEqual(["entry_person", "other"]);
    expect(priceUnitsByCategory.general).toEqual(priceUnits);
  });

  it("parses money exactly and keeps null distinct from zero", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney("650.05")).toBe(65005);
    for (const v of ["-1", "1e3", "NaN", "2.333", "1000000.01"])
      expect(() => parseMoney(v)).toThrow();
    expect(formatMoney(null, null)).toBe("Price not provided");
    expect(formatMoney(0, "entry_person")).toBe("Free");
    expect(formatMoney(0, "meal")).toBe("₹0");
  });
  it("uses India month boundaries and preserves update precedence", () => {
    const now = new Date("2026-08-31T18:30:00Z");
    expect(currentMonth(now)).toBe("2026-09");
    expect(validMonth("2026-10", now)).toBe(false);
    expect(freshness("2025-01", null, false, now).label).toBe(
      "May have changed",
    );
    expect(freshness("2026-08", "2026-09", true, now).label).toBe(
      "Change reported",
    );
  });
  it("blocks external redirects and non-maps links", () => {
    for (const url of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/\n/evil.test",
    ])
      expect(safeReturnUrl(url)).toBe("/");
    expect(safeReturnUrl("/tips/one?intent=confirm")).toBe(
      "/tips/one?intent=confirm",
    );
    expect(validMapsUrl("https://maps.app.goo.gl/hello")).toBe(true);
    expect(validMapsUrl("https://google.com/evil")).toBe(false);
    expect(validMapsUrl("https://maps.google.com.evil.test/maps")).toBe(false);
  });
});
