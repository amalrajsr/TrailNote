import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connectDatabase } from "../../src/db/client";
import {
  seedDevelopment,
  assertDevelopmentSeed,
  fixtureClock,
  fixtureId,
} from "../../src/db/seed-development";
import { seedDestinations } from "../../src/db/seed-destinations";
import {
  destinationBySlug,
  searchDestinations,
} from "../../src/server/queries/destinations";
import { listContributions } from "../../src/server/queries/contributions";
const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
export async function harness() {
  const dir = await mkdtemp(join(tmpdir(), "fieldnotes-test-"));
  const connection = await connectDatabase({ url: `file:${dir}/test.db` });
  cleanups.push(async () => {
    connection.client.close();
    await rm(dir, { recursive: true, force: true });
  });
  await migrate(connection.db, { migrationsFolder: "./drizzle" });
  return connection;
}
describe("migrated database contract", () => {
  it("applies migrations twice, seeds idempotently, and preserves parent/revision relationships", async () => {
    const { db, client } = await harness();
    await seedDevelopment(db, "test", "file:test.db");
    await seedDevelopment(db, "test", "file:test.db");
    await migrate(db, { migrationsFolder: "./drizzle" });
    expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual([]);
    expect(
      Number(
        (await client.execute("select count(*) n from contributions")).rows[0]
          .n,
      ),
    ).toBe(19);
    expect(
      Number(
        (
          await client.execute(
            "select count(*) n from confirmations where contribution_id = '" +
              fixtureId(102) +
              "'",
          )
        ).rows[0].n,
      ),
    ).toBe(7);
  });
  it("destination-only seed never fabricates traveler content", async () => {
    const { db, client } = await harness();
    await seedDestinations(db);
    expect(
      Number(
        (await client.execute("select count(*) n from destinations")).rows[0].n,
      ),
    ).toBe(6);
    expect(
      Number(
        (await client.execute("select count(*) n from contributions")).rows[0]
          .n,
      ),
    ).toBe(0);
  });
  it("rejects production or remote development seeding", () => {
    expect(() => assertDevelopmentSeed("production", "file:test.db")).toThrow();
    expect(() =>
      assertDevelopmentSeed("development", "libsql://remote.turso.io"),
    ).toThrow();
  });
  it("enforces foreign keys, money, category, revision, and verified-photo constraints", async () => {
    const { db, client } = await harness();
    await seedDevelopment(db, "test", "file:test.db");
    for (const statement of [
      "update contributions set category = 'unknown'",
      "update contributions set price_paise = -1",
      "update contributions set price_paise = 1.5",
      "update contributions set price_paise = null where price_paise is not null",
      "update contributions set visited_month = '2026-13'",
      "update contributions set parent_revision = 99 where parent_revision is not null",
      "update contributions set author_id = 'missing'",
      "update upload_assets set byte_size = null where status = 'ready'",
    ]) {
      await expect(client.execute(statement)).rejects.toThrow();
    }
    await expect(
      client.execute(
        "update upload_assets set byte_size = 500001 where status = 'ready'",
      ),
    ).resolves.toBeDefined();
    await expect(
      client.execute({
        sql: "insert into contribution_photos values (?,99,?,0,'')",
        args: [fixtureId(100), fixtureId(602)],
      }),
    ).rejects.toThrow();
    await client.execute({
      sql: "insert into contribution_photos values (?,1,?,0,'')",
      args: [fixtureId(100), fixtureId(602)],
    });
    await expect(
      client.execute({
        sql: "insert into contribution_photos values (?,1,?,1,'')",
        args: [fixtureId(100), fixtureId(602)],
      }),
    ).rejects.toThrow();
  });

  it("searches aliases safely and reports visible root counts", async () => {
    const { db } = await harness();
    await seedDevelopment(db, "test", "file:test.db");

    expect(
      (await searchDestinations(db, "bad")).map((row) => row.slug),
    ).toEqual(["badami"]);
    expect(
      (await searchDestinations(db, "Mysore")).map((row) => row.slug),
    ).toEqual(["mysuru"]);
    expect(await searchDestinations(db, "%_")).toEqual([]);

    const badami = await destinationBySlug(db, "badami");
    expect(badami?.publishedRootTipCount).toBe(17);

    const listing = await listContributions(db, {
      destinationId: badami!.id,
      now: +fixtureClock,
    });
    expect(listing.cards).toHaveLength(12);
    expect(listing.nextCursor).toBeTruthy();
    expect(
      listing.cards.every((tip) => tip.parentContributionId === null),
    ).toBe(true);
  });
});
