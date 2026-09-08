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
import { revealContact } from "../../src/server/services/contacts";
import {
  moderationQueues,
  resolveContactRemoval,
  resolveReport,
  setAccountStatus,
  setContributionVisibility,
} from "../../src/server/services/moderation";
import {
  reportContribution,
  submitContactRemoval,
} from "../../src/server/services/reports";
import { deleteAccount } from "../../src/server/services/accounts";
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
  it("keeps contacts out of detail DTOs until a rate-limited reveal and lets a moderator hide them", async () => {
    await conn.db
      .update(s.contacts)
      .set({ status: "visible" })
      .where(eq(s.contacts.contributionId, fixtureId(100)));
    const detail = await contributionDetail(conn.db, fixtureId(100));
    expect(JSON.stringify(detail)).not.toContain("+919000000000");
    const contact = await revealContact(conn.db, fixtureId(100));
    expect(contact.phone).toBe("+919000000000");
    const request = await submitContactRemoval(conn.db, {
      contributionId: fixtureId(100),
      contactId: contact.id,
      requestText:
        "This public service number no longer belongs to this place.",
      replyEmail: "reader@example.test",
      honeypot: "",
    });
    await expect(
      resolveContactRemoval(conn.db, fixtureId(1), {
        requestId: request.id,
        disposition: "hide",
        reason: "Contact owner requested removal.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await conn.db
      .update(s.profiles)
      .set({ role: "moderator" })
      .where(eq(s.profiles.userId, fixtureId(1)));
    await resolveContactRemoval(conn.db, fixtureId(1), {
      requestId: request.id,
      disposition: "hide",
      reason: "Contact owner requested removal.",
    });
    await expect(revealContact(conn.db, fixtureId(100))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("keeps report queues private and applies moderator hide, restore, and suspension immediately", async () => {
    const tip = await visibleContribution(conn.db, fixtureId(101));
    await reportContribution(conn.db, fixtureId(4), {
      id: tip.id,
      revision: tip.revision,
      reason: "inaccurate",
      details: "The details need a moderator review.",
    });
    await expect(moderationQueues(conn.db, fixtureId(1))).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      },
    );
    await conn.db
      .update(s.profiles)
      .set({ role: "moderator" })
      .where(eq(s.profiles.userId, fixtureId(1)));
    const queue = await moderationQueues(conn.db, fixtureId(1));
    const report = queue.contributions.find(
      (entry) => entry.contributionId === tip.id,
    );
    expect(report?.details).toBe("The details need a moderator review.");
    expect(JSON.stringify(queue)).not.toContain("@example.test");
    await resolveReport(conn.db, fixtureId(1), {
      reportId: report!.id,
      disposition: "hide",
      reason: "Needs correction before publication.",
    });
    await expect(visibleContribution(conn.db, tip.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await setContributionVisibility(
      conn.db,
      fixtureId(1),
      tip.id,
      "published",
      "Correction reviewed.",
    );
    await expect(visibleContribution(conn.db, tip.id)).resolves.toBeDefined();
    await setAccountStatus(
      conn.db,
      fixtureId(1),
      tip.authorId,
      "suspended",
      "Repeated policy violations.",
    );
    await expect(visibleContribution(conn.db, tip.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("erases an account graph without leaving a public update whose parent is gone", async () => {
    const root = await visibleContribution(conn.db, fixtureId(102));
    const update = await visibleContribution(conn.db, fixtureId(200));
    const result = await deleteAccount(conn.db, root.authorId, async () => {});
    expect(result.deletedContributions).toBeGreaterThan(0);
    await expect(visibleContribution(conn.db, root.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(visibleContribution(conn.db, update.id)).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
      },
    );
    expect(
      (await conn.client.execute("PRAGMA foreign_key_check")).rows,
    ).toEqual([]);
  });
  it("erases an authored update even when its root belongs to another traveler", async () => {
    await deleteAccount(conn.db, fixtureId(2), async () => {});
    await expect(
      visibleContribution(conn.db, fixtureId(200)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      (await conn.client.execute("PRAGMA foreign_key_check")).rows,
    ).toEqual([]);
  });
});
