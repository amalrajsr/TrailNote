import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { connectDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";
import { seedDevelopment, fixtureId } from "../../src/db/seed-development";
import {
  createContribution,
  editContribution,
  deleteContribution,
  visibleContribution,
} from "../../src/server/services/contributions";
import {
  setConfirmation,
  removeConfirmation,
  setHelpful,
} from "../../src/server/services/reactions";
import { contributionDetail } from "../../src/server/queries/contributions";
let conn: Awaited<ReturnType<typeof connectDatabase>>,
  dir: string,
  destinationId: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fieldnotes-services-"));
  conn = await connectDatabase({ url: `file:${dir}/db.sqlite` });
  await migrate(conn.db, { migrationsFolder: "./drizzle" });
  await seedDevelopment(conn.db, "test", "file:test");
  destinationId = (
    await conn.db
      .select()
      .from(s.destinations)
      .where(eq(s.destinations.slug, "badami"))
  )[0].id;
});
afterEach(async () => {
  conn.client.close();
  await rm(dir, { recursive: true, force: true });
});
const input = () => ({
  destinationId,
  category: "general",
  body: "Useful first hand advice for a trip.",
  photos: [],
});
describe("transactional contribution services", () => {
  it("replays create once, rejects changed payload, and retains the original digest after edit", async () => {
    const key = crypto.randomUUID(),
      raw = input();
    const first = await createContribution(conn.db, fixtureId(1), key, raw);
    expect(await createContribution(conn.db, fixtureId(1), key, raw)).toEqual(
      first,
    );
    await expect(
      createContribution(conn.db, fixtureId(1), key, {
        ...raw,
        body: "A different piece of travel advice.",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const editKey = crypto.randomUUID();
    expect(
      await editContribution(conn.db, fixtureId(1), first.id, 1, editKey, {
        ...raw,
        body: "Updated first hand advice for a trip.",
      }),
    ).toEqual({ id: first.id, revision: 2 });
    expect(await createContribution(conn.db, fixtureId(1), key, raw)).toEqual({
      id: first.id,
      revision: 2,
    });
    expect(
      await editContribution(conn.db, fixtureId(1), first.id, 1, editKey, {
        ...raw,
        body: "Updated first hand advice for a trip.",
      }),
    ).toEqual({ id: first.id, revision: 2 });
    await expect(
      editContribution(
        conn.db,
        fixtureId(1),
        first.id,
        1,
        crypto.randomUUID(),
        raw,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("keeps confirmations unique, disallows self confirmation and separates historical revisions", async () => {
    const tip = await createContribution(
      conn.db,
      fixtureId(1),
      crypto.randomUUID(),
      input(),
    );
    await expect(
      setConfirmation(conn.db, fixtureId(1), tip.id, 1, "2026-09"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setConfirmation(conn.db, fixtureId(4), tip.id, 1, "2026-08");
    await setConfirmation(conn.db, fixtureId(4), tip.id, 1, "2026-09");
    expect(
      (
        await conn.db
          .select()
          .from(s.confirmations)
          .where(eq(s.confirmations.contributionId, tip.id))
      ).length,
    ).toBe(1);
    await editContribution(
      conn.db,
      fixtureId(1),
      tip.id,
      1,
      crypto.randomUUID(),
      input(),
    );
    await expect(
      setConfirmation(conn.db, fixtureId(4), tip.id, 1, "2026-09"),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("rolls back an entire contribution when a photo cannot be attached", async () => {
    const before = await conn.db.select().from(s.contributions);
    await expect(
      createContribution(conn.db, fixtureId(2), crypto.randomUUID(), {
        ...input(),
        photos: [{ id: fixtureId(602), alt: "" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await conn.db.select().from(s.contributions)).toHaveLength(
      before.length,
    );
  });
  it("keeps changed prices separate and hides children when the root is deleted", async () => {
    const parent = await visibleContribution(conn.db, fixtureId(102));
    expect(parent.pricePaise).toBe(3500);
    const detail = await contributionDetail(conn.db, parent.id);
    expect(
      (await visibleContribution(conn.db, fixtureId(200))).pricePaise,
    ).toBe(4000);
    expect(detail.price?.paise).toBe(3500);
    expect(detail.updates[0]?.price?.paise).toBe(4000);
    expect(detail.updateOriginalPrices[fixtureId(200)]?.paise).toBe(3500);
    expect(detail.changeReported).toBe(true);
    await deleteContribution(conn.db, fixtureId(3), parent.id, 1);
    await expect(
      visibleContribution(conn.db, fixtureId(200)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("moves confirmations and updates into revision history after an edit", async () => {
    const parent = await visibleContribution(conn.db, fixtureId(102));
    await editContribution(
      conn.db,
      parent.authorId,
      parent.id,
      parent.revision,
      crypto.randomUUID(),
      {
        destinationId: parent.destinationId,
        category: parent.category,
        body: `${parent.body} The timetable was checked again.`,
        visitedMonth: "2026-09",
        pricePaise: parent.pricePaise,
        priceUnit: parent.priceUnit,
        fromName: parent.fromName,
        toName: parent.toName,
        photos: [],
      },
    );
    const detail = await contributionDetail(conn.db, parent.id);
    expect(detail.revision).toBe(2);
    expect(detail.confirmationCount).toBe(0);
    expect(detail.changeReported).toBe(false);
    expect(detail.updates).toHaveLength(0);
    expect(detail.earlierUpdates.map((update) => update.id)).toContain(
      fixtureId(200),
    );
    expect(detail.previousRevisions[0]).toMatchObject({
      revision: 1,
      price: { paise: 3500 },
    });
    await expect(
      removeConfirmation(conn.db, fixtureId(4), parent.id, 1),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("excludes an observer month older than the original visit from freshness", async () => {
    const oldTip = await visibleContribution(conn.db, fixtureId(108));
    await conn.db.insert(s.confirmations).values({
      contributionId: oldTip.id,
      revision: oldTip.revision,
      userId: fixtureId(4),
      visitedMonth: "2024-12",
    });
    const detail = await contributionDetail(conn.db, oldTip.id);
    expect(detail.visitedMonth).toBe("2025-01");
    expect(detail.confirmationCount).toBe(0);
    expect(detail.lastConfirmedMonth).toBeNull();
    expect(detail.freshness.label).toBe("May have changed");
  });
  it("rejects cross-user edits and duplicate helpful votes", async () => {
    const tip = await createContribution(
      conn.db,
      fixtureId(1),
      crypto.randomUUID(),
      input(),
    );
    await expect(
      editContribution(
        conn.db,
        fixtureId(2),
        tip.id,
        1,
        crypto.randomUUID(),
        input(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setHelpful(conn.db, fixtureId(4), tip.id, true);
    await setHelpful(conn.db, fixtureId(4), tip.id, true);
    expect(
      await conn.db
        .select()
        .from(s.helpfulVotes)
        .where(eq(s.helpfulVotes.contributionId, tip.id)),
    ).toHaveLength(1);
  });
});
