import { describe, expect, it } from "vitest";
import {
  extractDestinationAliases,
  normalizeGeoapifyDestinations,
} from "../../src/lib/destination-search";

describe("destination search", () => {
  it("promotes an exact traveler alias above road results", () => {
    expect(
      extractDestinationAliases({
        "name:en": "Ooty",
        alt_name: [" Ooty ", 42, "Ootacamund;Queen of Hills"],
        "alt_name:en": "ooty;Udagai",
        "name:hi": "ऊटी",
        old_name: "Otacamund",
      }),
    ).toEqual(["Ooty", "Ootacamund", "Queen of Hills", "Udagai"]);

    const results = normalizeGeoapifyDestinations(
      [
        {
          name: "Mysore Ooty Highway",
          country: "India",
          country_code: "in",
          state: "Karnataka",
          lat: 12,
          lon: 76,
          result_type: "street",
          place_id: "road",
        },
        {
          name: "Udhagamandalam",
          other_names: {
            alt_name: "Ooty;Ootacamund",
            "name:hi": "ऊटी",
          },
          country: "India",
          country_code: "in",
          state: "Tamil Nadu",
          lat: 11.41,
          lon: 76.7,
          result_type: "city",
          place_id: "ooty",
        },
        {
          name: "Ooty",
          country: "United States",
          country_code: "us",
          lat: 1,
          lon: 2,
        },
      ],
      "ooty",
    );

    expect(results.map((result) => result.providerPlaceId)).toEqual([
      "ooty",
      "road",
    ]);
    expect(results[0]).toMatchObject({
      displayName: "Ooty",
      canonicalName: "Udhagamandalam",
      secondaryText: "Udhagamandalam, Tamil Nadu",
      matchType: "alias-exact",
      latitude: 11.41,
      longitude: 76.7,
    });
  });
});
