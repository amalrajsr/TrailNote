import { describe, expect, it } from "vitest";
import {
  profileInput,
  usernameCandidates,
} from "../../src/lib/validation/profile";

describe("profile identity validation", () => {
  it("normalizes editable usernames and rejects ambiguous forms", () => {
    expect(
      profileInput.parse({
        displayName: " Amal ",
        username: " Amal-Jose ",
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).toMatchObject({ displayName: "Amal", username: "amal-jose" });
    for (const username of ["ab", "-amal", "amal-", "amal jose", "amal_jose"])
      expect(() =>
        profileInput.parse({
          displayName: "Amal",
          username,
          avatarIntent: "keep",
          avatarId: null,
        }),
      ).toThrow();
  });

  it("creates readable candidates and a full-ID uniqueness fallback", () => {
    const candidates = usernameCandidates(
      "Ámal Jose",
      "00000000-0000-4000-8000-000000000123",
    );
    expect(candidates[0]).toBe("amal-jose-000000");
    expect(candidates.at(-1)).toBe("ama-00000000000040008000000000000123");
    expect(
      usernameCandidates("അമൽ", "00000000-0000-4000-8000-000000000123")[0],
    ).toBe("traveler-000000");
  });
});
