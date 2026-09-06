import { describe, expect, it } from "vitest";

import {
  parseEnvironment,
  requireAuthEnvironment,
  requireDatabaseEnvironment,
  requireImageKitEnvironment,
} from "@/src/server/env-schema";

describe("environment validation", () => {
  it("uses a local libSQL file without provider credentials in development", () => {
    const config = requireDatabaseEnvironment(parseEnvironment({}));

    expect(config).toEqual({
      url: "file:./data/trailnote.db",
      authToken: undefined,
    });
  });

  it("requires a token for a remote Turso database", () => {
    const env = parseEnvironment({
      TURSO_DATABASE_URL: "libsql://trailnote.example.turso.io",
    });

    expect(() => requireDatabaseEnvironment(env)).toThrow(
      "Missing required environment variables: TURSO_AUTH_TOKEN",
    );
  });

  it("reports all missing auth values without exposing supplied secrets", () => {
    const env = parseEnvironment({ BETTER_AUTH_SECRET: "do-not-print-this" });

    expect(() => requireAuthEnvironment(env)).toThrow(
      "Missing required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET",
    );
  });

  it("reports malformed public URLs by variable name only", () => {
    expect(() =>
      parseEnvironment({ NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: "not a url" }),
    ).toThrow(
      "Invalid environment variables: NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT",
    );
  });

  it("keeps ImageKit's private key on the server-only configuration path", () => {
    const env = parseEnvironment({
      IMAGEKIT_PRIVATE_KEY: "private_test",
      NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/fieldnotes",
    });

    expect(requireImageKitEnvironment(env)).toEqual({
      privateKey: "private_test",
      urlEndpoint: "https://ik.imagekit.io/fieldnotes",
    });
  });
});
