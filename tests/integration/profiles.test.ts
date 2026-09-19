import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connectDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
import {
  fixtureClock,
  fixtureId,
  seedDevelopment,
} from "../../src/db/seed-development";
import {
  createProfile,
  updateProfile,
} from "../../src/server/services/profiles";
import { publicProfile } from "../../src/server/queries/profiles";

let connection: Awaited<ReturnType<typeof connectDatabase>>;
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "trailnote-profiles-"));
  connection = await connectDatabase({ url: `file:${directory}/db.sqlite` });
  await migrate(connection.db, { migrationsFolder: "./drizzle" });
  await seedDevelopment(connection.db, "test", "file:test");
});

afterEach(async () => {
  connection.client.close();
  await rm(directory, { recursive: true, force: true });
});

describe("public profiles", () => {
  it("persists, returns, and clears profile context fields", async () => {
    const userId = fixtureId(1);
    await updateProfile(connection.db, userId, {
      displayName: "Ananya",
      username: "ananya-context",
      bio: "Backpacker exploring India by train.",
      instagramUrl: "@ananya.travels",
      youtubeUrl: "@ananyatravels",
      avatarIntent: "keep",
      avatarId: null,
    });
    expect(
      await publicProfile(connection.db, userId, undefined, +fixtureClock),
    ).toMatchObject({
      bio: "Backpacker exploring India by train.",
      instagramUrl: "https://www.instagram.com/ananya.travels/",
      youtubeUrl: "https://www.youtube.com/@ananyatravels",
    });

    await updateProfile(connection.db, userId, {
      displayName: "Ananya",
      username: "ananya-context",
      bio: "",
      instagramUrl: "",
      youtubeUrl: "",
      avatarIntent: "keep",
      avatarId: null,
    });
    expect(
      await publicProfile(connection.db, userId, undefined, +fixtureClock),
    ).toMatchObject({ bio: null, instagramUrl: null, youtubeUrl: null });
  });

  it("allocates distinct defaults and releases renamed usernames", async () => {
    const firstId = "10000000-0000-4000-8000-000000000001";
    const secondId = "10000000-0000-4000-8000-000000000002";
    for (const [id, email] of [
      [firstId, "same-1@example.invalid"],
      [secondId, "same-2@example.invalid"],
    ])
      await connection.db.insert(s.user).values({
        id,
        name: "Amal Jose",
        email,
        createdAt: fixtureClock,
        updatedAt: fixtureClock,
      });
    const first = await createProfile(connection.db, firstId, "Amal Jose");
    const second = await createProfile(connection.db, secondId, "Amal Jose");
    expect(
      await createProfile(connection.db, firstId, "Changed Provider Name"),
    ).toEqual(first);
    expect(first.username).not.toBe(second.username);
    expect(first.username.startsWith("amal-")).toBe(true);

    await updateProfile(connection.db, firstId, {
      displayName: "Amal",
      username: "abcd",
      avatarIntent: "keep",
      avatarId: null,
    });
    await expect(
      updateProfile(connection.db, secondId, {
        displayName: "Other Amal",
        username: "abcd",
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      updateProfile(connection.db, firstId, {
        displayName: "Amal",
        username: "abc",
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).resolves.toMatchObject({ username: "abc" });
    await expect(
      updateProfile(connection.db, secondId, {
        displayName: "Other Amal",
        username: "abcd",
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).resolves.toMatchObject({ username: "abcd" });
    await expect(
      updateProfile(connection.db, secondId, {
        displayName: "Other Amal",
        username: "admin",
        avatarIntent: "keep",
        avatarId: null,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("attaches, replaces, publishes, and removes an owned avatar", async () => {
    const userId = fixtureId(1);
    const firstAsset = fixtureId(801);
    const secondAsset = fixtureId(802);
    for (const [id, path] of [
      [firstAsset, "/fieldnotes/test/uploads/first/attempt-1.webp"],
      [secondAsset, "/fieldnotes/test/uploads/second/attempt-1.webp"],
    ])
      await connection.db.insert(s.uploadAssets).values({
        id,
        ownerId: userId,
        uploadRequestId: id,
        slot: 0,
        attempt: 1,
        imagekitFileId: `file-${id}`,
        imagekitPath: path,
        status: "ready",
        byteSize: 12_000,
        width: 600,
        height: 800,
        format: "webp",
        sourceDigest: `digest-${id}`,
        expiresAt: +fixtureClock + 86_400_000,
        createdAt: +fixtureClock,
        updatedAt: +fixtureClock,
      });

    const input = {
      displayName: "Ananya",
      username: "ananya-notes",
    };
    await updateProfile(
      connection.db,
      userId,
      { ...input, avatarIntent: "replace", avatarId: firstAsset },
      +fixtureClock,
    );
    expect(
      await publicProfile(connection.db, userId, undefined, +fixtureClock),
    ).toMatchObject({
      username: "ananya-notes",
      avatar: { path: "/fieldnotes/test/uploads/first/attempt-1.webp" },
    });

    await updateProfile(
      connection.db,
      userId,
      { ...input, avatarIntent: "replace", avatarId: secondAsset },
      +fixtureClock,
    );
    expect(
      await connection.db
        .select({ status: s.uploadAssets.status })
        .from(s.uploadAssets)
        .where(eq(s.uploadAssets.id, firstAsset)),
    ).toEqual([{ status: "deleting" }]);

    await updateProfile(
      connection.db,
      userId,
      { ...input, avatarIntent: "remove", avatarId: null },
      +fixtureClock,
    );
    expect(
      await publicProfile(connection.db, userId, undefined, +fixtureClock),
    ).toMatchObject({ avatar: null });
    expect(
      await connection.db
        .select({ status: s.mediaCleanupJobs.status })
        .from(s.mediaCleanupJobs),
    ).toHaveLength(2);
  });
});
