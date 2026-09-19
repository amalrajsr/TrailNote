import { describe, expect, it } from "vitest";
import {
  normalizeInstagramProfile,
  normalizeYouTubeProfile,
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

  it("normalizes bio and supported social profile inputs", () => {
    expect(
      profileInput.parse({
        displayName: "Amal",
        username: "amal",
        bio: "  Backpacker by train.  ",
        instagramUrl: "@amal.travels",
        youtubeUrl: "youtube.com/@amaltravels",
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).toMatchObject({
      bio: "Backpacker by train.",
      instagramUrl: "https://www.instagram.com/amal.travels/",
      youtubeUrl: "https://www.youtube.com/@amaltravels",
    });
    expect(normalizeInstagramProfile("https://instagram.com/amal/")).toBe(
      "https://www.instagram.com/amal/",
    );
    expect(
      normalizeYouTubeProfile("https://www.youtube.com/channel/UC123"),
    ).toBe("https://www.youtube.com/channel/UC123");
  });

  it("rejects unsafe or non-profile social URLs and invalid bios", () => {
    for (const instagramUrl of [
      "https://instagram.com.evil.example/user",
      "javascript:alert(1)",
      "https://instagram.com/p/abc",
    ])
      expect(() =>
        profileInput.parse({
          displayName: "Amal",
          username: "amal",
          instagramUrl,
          avatarIntent: "keep",
          avatarId: null,
        }),
      ).toThrow();
    for (const youtubeUrl of [
      "https://www.youtube.com/watch?v=abc",
      "https://www.youtube.com/shorts/abc",
      "https://youtube.com.evil.example/@amal",
    ])
      expect(() =>
        profileInput.parse({
          displayName: "Amal",
          username: "amal",
          youtubeUrl,
          avatarIntent: "keep",
          avatarId: null,
        }),
      ).toThrow();
    expect(() =>
      profileInput.parse({
        displayName: "Amal",
        username: "amal",
        bio: "x".repeat(161),
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).toThrow();
  });
});
