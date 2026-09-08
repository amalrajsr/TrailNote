import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import sharp from "sharp";
import { connectDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
import {
  fixtureClock,
  fixtureId,
  seedDevelopment,
} from "../../src/db/seed-development";
import { createContribution } from "../../src/server/services/contributions";
import {
  cancelUpload,
  runCleanup,
  uploadPhoto,
  validateUploadSource,
  type RemoteFile,
  type UploadProvider,
} from "../../src/server/services/uploads";

class FakeProvider implements UploadProvider {
  attempts: Array<{ assetId: string; attempt: number; pre: string }> = [];
  deleted: string[] = [];
  purged: string[] = [];
  private files = new Map<string, RemoteFile>();

  constructor(private readonly sizes: number[] = [280_000]) {}

  async upload({
    assetId,
    attempt,
    pre,
  }: {
    bytes: Uint8Array;
    assetId: string;
    attempt: number;
    pre: string;
  }) {
    this.attempts.push({ assetId, attempt, pre });
    const fileId = `${assetId}-${attempt}`;
    this.files.set(fileId, {
      fileId,
      filePath: `/fieldnotes/test/uploads/${assetId}/attempt-${attempt}.webp`,
      size: this.sizes[Math.min(attempt - 1, this.sizes.length - 1)],
      width: 1200,
      height: 800,
      mime: "image/webp",
      embeddedMetadata: {
        ImageWidth: 1200,
        ImageHeight: 800,
        ImageSize: "1200x800",
        Megapixels: 0.96,
      },
    });
    return { fileId };
  }

  async get(fileId: string) {
    return this.files.get(fileId)!;
  }

  async find(assetId: string) {
    return [...this.files.values()].filter((file) =>
      file.filePath.includes(`/uploads/${assetId}/`),
    );
  }

  async delete(fileId: string) {
    this.deleted.push(fileId);
  }

  async purge(path: string) {
    this.purged.push(path);
  }
}

let connection: Awaited<ReturnType<typeof connectDatabase>>;
let directory: string;
let source: Uint8Array;
let destinationId: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "fieldnotes-uploads-"));
  connection = await connectDatabase({ url: `file:${directory}/db.sqlite` });
  await migrate(connection.db, { migrationsFolder: "./drizzle" });
  await seedDevelopment(connection.db, "test", "file:test");
  source = new Uint8Array(
    await sharp({
      create: {
        width: 80,
        height: 60,
        channels: 3,
        background: { r: 80, g: 120, b: 90 },
      },
    })
      .jpeg()
      .toBuffer(),
  );
  destinationId = (
    await connection.db
      .select({ id: s.destinations.id })
      .from(s.destinations)
      .where(eq(s.destinations.slug, "badami"))
  )[0].id;
});

afterEach(async () => {
  connection.client.close();
  await rm(directory, { recursive: true, force: true });
});

describe("photo upload pipeline", () => {
  it("validates supported content, accepts photos over 400 KB, and replays a ready request", async () => {
    await expect(validateUploadSource(source)).resolves.toMatchObject({
      format: "jpeg",
      width: 80,
      height: 60,
    });
    await expect(
      validateUploadSource(new TextEncoder().encode("not an image")),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      validateUploadSource(
        new Uint8Array(await sharp(source).png().toBuffer()),
      ),
    ).resolves.toMatchObject({ format: "png" });
    await expect(
      validateUploadSource(
        new Uint8Array(await sharp(source).webp().toBuffer()),
      ),
    ).resolves.toMatchObject({ format: "webp" });

    const provider = new FakeProvider([500_001]);
    const requestId = crypto.randomUUID();
    const asset = await uploadPhoto(
      connection.db,
      provider,
      fixtureId(1),
      requestId,
      0,
      source,
    );

    expect(asset).toMatchObject({
      status: "ready",
      byteSize: 500_001,
      format: "webp",
    });
    expect(provider.attempts.map(({ attempt }) => attempt)).toEqual([1]);
    expect(
      await uploadPhoto(
        connection.db,
        provider,
        fixtureId(1),
        requestId,
        0,
        source,
      ),
    ).toMatchObject({ id: asset.id });
    expect(provider.attempts).toHaveLength(1);
    expect(await connection.db.select().from(s.mediaCleanupJobs)).toHaveLength(
      0,
    );
  });

  it("atomically attaches an owned ready photo and rejects cross-user reuse", async () => {
    const owned = await uploadPhoto(
      connection.db,
      new FakeProvider(),
      fixtureId(1),
      crypto.randomUUID(),
      0,
      source,
    );
    const result = await createContribution(
      connection.db,
      fixtureId(1),
      crypto.randomUUID(),
      {
        destinationId,
        category: "general",
        body: "The station entrance is easier to find from the north road.",
        photos: [{ id: owned.id, alt: "North entrance sign" }],
      },
    );
    expect(
      await connection.db
        .select()
        .from(s.contributionPhotos)
        .where(eq(s.contributionPhotos.contributionId, result.id)),
    ).toMatchObject([
      { assetId: owned.id, position: 0, altText: "North entrance sign" },
    ]);
    expect(
      (
        await connection.db
          .select()
          .from(s.uploadAssets)
          .where(eq(s.uploadAssets.id, owned.id))
      )[0],
    ).toMatchObject({
      status: "attached",
      attachedContributionId: result.id,
    });

    const second = await uploadPhoto(
      connection.db,
      new FakeProvider(),
      fixtureId(1),
      crypto.randomUUID(),
      1,
      source,
    );
    await expect(
      createContribution(connection.db, fixtureId(2), crypto.randomUUID(), {
        destinationId,
        category: "general",
        body: "This contribution must not claim another user's photo.",
        photos: [{ id: second.id, alt: "" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("cancels an unattached asset and completes provider cleanup", async () => {
    const now = +fixtureClock + 60_000;
    const provider = new FakeProvider();
    const asset = await uploadPhoto(
      connection.db,
      provider,
      fixtureId(1),
      crypto.randomUUID(),
      0,
      source,
      now,
    );
    await cancelUpload(connection.db, fixtureId(1), asset.id, now);
    await expect(
      cancelUpload(connection.db, fixtureId(2), asset.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      runCleanup(connection.db, provider, now),
    ).resolves.toMatchObject({ completed: 1 });
    expect(provider.deleted).toEqual([asset.imagekitFileId]);
    expect(provider.purged).toEqual([asset.imagekitPath]);
    expect(
      (
        await connection.db
          .select()
          .from(s.uploadAssets)
          .where(eq(s.uploadAssets.id, asset.id))
      )[0].status,
    ).toBe("deleted");
  });

  it("enforces the per-user processing limit in the reservation transaction", async () => {
    const now = Date.now();
    await connection.db.insert(s.uploadAssets).values(
      [0, 1].map((slot) => ({
        id: crypto.randomUUID(),
        ownerId: fixtureId(1),
        uploadRequestId: crypto.randomUUID(),
        slot,
        attempt: 1,
        status: "processing" as const,
        sourceDigest: `digest-${slot}`,
        expiresAt: now + 60_000,
        createdAt: now,
        updatedAt: now,
      })),
    );

    await expect(
      uploadPhoto(
        connection.db,
        new FakeProvider(),
        fixtureId(1),
        crypto.randomUUID(),
        2,
        source,
        now,
      ),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(
      (
        await connection.db
          .select()
          .from(s.uploadAssets)
          .where(eq(s.uploadAssets.ownerId, fixtureId(1)))
      ).filter(({ status }) => status === "processing"),
    ).toHaveLength(2);
  });
});
