import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { Database, Transaction } from "../../db/client";
import * as s from "../../db/schema";
import {
  contributionInput,
  type ContributionInput,
} from "../../lib/validation/contribution";
import { DomainError } from "../result";

export const payloadDigest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function activeProfile(
  db: Database | Transaction,
  userId: string,
) {
  const p = (
    await db.select().from(s.profiles).where(eq(s.profiles.userId, userId))
  )[0];
  if (!p || p.status !== "active")
    throw new DomainError(
      "FORBIDDEN",
      "This account cannot perform that action.",
    );
  return p;
}
export async function visibleContribution(
  db: Database | Transaction,
  id: string,
) {
  const row = (
    await db
      .select({ tip: s.contributions })
      .from(s.contributions)
      .innerJoin(
        s.profiles,
        and(
          eq(s.profiles.userId, s.contributions.authorId),
          eq(s.profiles.status, "active"),
        ),
      )
      .innerJoin(
        s.destinations,
        and(
          eq(s.destinations.id, s.contributions.destinationId),
          eq(s.destinations.enabled, true),
        ),
      )
      .where(
        and(
          eq(s.contributions.id, id),
          eq(s.contributions.status, "published"),
        ),
      )
  )[0]?.tip;
  if (!row) throw new DomainError("NOT_FOUND", "This tip is unavailable.");
  if (row.parentContributionId) {
    const root = await visibleContribution(db, row.parentContributionId);
    if (root.parentContributionId)
      throw new DomainError("NOT_FOUND", "This tip is unavailable.");
  }
  return row;
}
export function publicSnapshot(input: ContributionInput) {
  const { phone, publicServiceContact, photos, ...fields } = input;
  void phone;
  void publicServiceContact;
  void photos;
  return fields;
}
async function associations(
  tx: Transaction,
  userId: string,
  id: string,
  revision: number,
  input: ContributionInput,
  now: number,
) {
  if (input.phone) {
    await tx
      .insert(s.contacts)
      .values({
        contributionId: id,
        phoneE164: input.phone,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: s.contacts.contributionId,
        set: { phoneE164: input.phone, updatedAt: now },
      });
  } else {
    await tx
      .update(s.contacts)
      .set({ status: "hidden", updatedAt: now })
      .where(eq(s.contacts.contributionId, id));
  }
  for (const [position, photo] of input.photos.entries()) {
    const asset = (
      await tx
        .select()
        .from(s.uploadAssets)
        .where(eq(s.uploadAssets.id, photo.id))
    )[0];
    if (!asset || asset.ownerId !== userId)
      throw new DomainError(
        "VALIDATION",
        "A photo is unavailable. Remove it or upload it again.",
      );
    if (asset.status === "ready") {
      const claimed = await tx
        .update(s.uploadAssets)
        .set({ status: "attached", attachedContributionId: id, updatedAt: now })
        .where(
          and(
            eq(s.uploadAssets.id, photo.id),
            eq(s.uploadAssets.ownerId, userId),
            eq(s.uploadAssets.status, "ready"),
            gt(s.uploadAssets.expiresAt, now),
            isNull(s.uploadAssets.attachedContributionId),
          ),
        )
        .returning({ id: s.uploadAssets.id });
      if (!claimed.length)
        throw new DomainError(
          "VALIDATION",
          "A photo is unavailable. Remove it or upload it again.",
        );
    } else if (
      asset.status !== "attached" ||
      asset.attachedContributionId !== id
    ) {
      throw new DomainError(
        "VALIDATION",
        "A photo is unavailable. Remove it or upload it again.",
      );
    }
    await tx.insert(s.contributionPhotos).values({
      contributionId: id,
      revision,
      assetId: photo.id,
      position,
      altText: photo.alt ?? "",
    });
  }
}
export async function createContribution(
  db: Database,
  userId: string,
  key: string,
  raw: unknown,
  now = Date.now(),
) {
  const input = contributionInput.parse(raw),
    digest = payloadDigest(input);
  return db.transaction(async (tx) => {
    await activeProfile(tx, userId);
    const existing = (
      await tx
        .select()
        .from(s.contributions)
        .where(
          and(
            eq(s.contributions.authorId, userId),
            eq(s.contributions.clientMutationId, key),
          ),
        )
    )[0];
    if (existing) {
      if (existing.initialPayloadDigest !== digest)
        throw new DomainError(
          "CONFLICT",
          "This submission key was already used. Review your draft.",
        );
      return { id: existing.id, revision: existing.revision };
    }
    const destination = (
      await tx
        .select()
        .from(s.destinations)
        .where(
          and(
            eq(s.destinations.id, input.destinationId),
            eq(s.destinations.enabled, true),
          ),
        )
    )[0];
    if (!destination)
      throw new DomainError("NOT_FOUND", "This destination is unavailable.");
    if (input.parentContributionId) {
      const parent = await visibleContribution(tx, input.parentContributionId);
      if (
        parent.parentContributionId ||
        parent.category !== input.category ||
        parent.destinationId !== input.destinationId
      )
        throw new DomainError(
          "VALIDATION",
          "Updates must refer to the original tip in the same category and destination.",
        );
      if (parent.revision !== input.parentRevision)
        throw new DomainError(
          "CONFLICT",
          "The original tip was edited. Review its latest version.",
        );
    }
    const id = crypto.randomUUID(),
      fields = publicSnapshot(input);
    await tx.insert(s.contributions).values({
      ...fields,
      id,
      authorId: userId,
      clientMutationId: key,
      initialPayloadDigest: digest,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(s.contributionRevisions).values({
      contributionId: id,
      revision: 1,
      editorId: userId,
      snapshotJson: JSON.stringify(fields),
      createdAt: now,
    });
    await associations(tx, userId, id, 1, input, now);
    return { id, revision: 1 };
  });
}
export async function editContribution(
  db: Database,
  userId: string,
  id: string,
  expectedRevision: number,
  key: string,
  raw: unknown,
  now = Date.now(),
) {
  const input = contributionInput.parse(raw),
    hash = payloadDigest({ id, expectedRevision, input });
  return db.transaction(async (tx) => {
    await activeProfile(tx, userId);
    const receipt = (
      await tx
        .select()
        .from(s.mutationReceipts)
        .where(
          and(
            eq(s.mutationReceipts.userId, userId),
            eq(s.mutationReceipts.key, key),
          ),
        )
    )[0];
    if (receipt && receipt.expiresAt > now) {
      if (receipt.payloadHash !== hash)
        throw new DomainError(
          "CONFLICT",
          "This submission key was already used.",
        );
      return JSON.parse(receipt.resultRef) as { id: string; revision: number };
    }
    const old = await visibleContribution(tx, id);
    if (old.authorId !== userId)
      throw new DomainError("FORBIDDEN", "Only the author can edit this tip.");
    if (old.revision !== expectedRevision)
      throw new DomainError(
        "CONFLICT",
        "This tip was edited. Your draft is retained; review the latest version.",
      );
    if (
      old.parentContributionId !== input.parentContributionId ||
      old.parentRevision !== input.parentRevision ||
      old.destinationId !== input.destinationId ||
      old.category !== input.category
    )
      throw new DomainError(
        "VALIDATION",
        "Destination, category, and original report cannot change when editing.",
      );
    const revision = old.revision + 1,
      fields = publicSnapshot(input);
    const changed = await tx
      .update(s.contributions)
      .set({ ...fields, revision, updatedAt: now })
      .where(
        and(
          eq(s.contributions.id, id),
          eq(s.contributions.revision, expectedRevision),
        ),
      )
      .returning({ id: s.contributions.id });
    if (!changed.length)
      throw new DomainError(
        "CONFLICT",
        "This tip was edited. Review its latest version.",
      );
    await tx.insert(s.contributionRevisions).values({
      contributionId: id,
      revision,
      editorId: userId,
      snapshotJson: JSON.stringify(fields),
      createdAt: now,
    });
    await associations(tx, userId, id, revision, input, now);
    const result = { id, revision };
    await tx
      .insert(s.mutationReceipts)
      .values({
        userId,
        key,
        payloadHash: hash,
        resultRef: JSON.stringify(result),
        createdAt: now,
        expiresAt: now + 86400000,
      })
      .onConflictDoUpdate({
        target: [s.mutationReceipts.userId, s.mutationReceipts.key],
        set: {
          payloadHash: hash,
          resultRef: JSON.stringify(result),
          createdAt: now,
          expiresAt: now + 86400000,
        },
      });
    return result;
  });
}
export async function enqueueCleanup(
  tx: Transaction,
  ids: string[],
  reason: string,
  now: number,
) {
  if (!ids.length) return;
  const assets = await tx
    .select()
    .from(s.uploadAssets)
    .where(inArray(s.uploadAssets.attachedContributionId, ids));
  for (const asset of assets) {
    await tx.insert(s.mediaCleanupJobs).values({
      assetId: asset.id,
      operation: "delete",
      reason,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}
export async function deleteContribution(
  db: Database,
  userId: string,
  id: string,
  revision: number,
  reason?: string,
  now = Date.now(),
) {
  return db.transaction(async (tx) => {
    const profile = await activeProfile(tx, userId);
    const tip = (
      await tx.select().from(s.contributions).where(eq(s.contributions.id, id))
    )[0];
    if (!tip) throw new DomainError("NOT_FOUND", "This tip is unavailable.");
    if (
      tip.authorId !== userId &&
      (profile.role !== "moderator" || !reason?.trim())
    )
      throw new DomainError(
        "FORBIDDEN",
        "Only the author or a moderator can delete this tip.",
      );
    if (tip.status === "deleted") return { id };
    if (tip.revision !== revision)
      throw new DomainError(
        "CONFLICT",
        "This tip was edited. Review its latest version.",
      );
    await tx
      .update(s.contributions)
      .set({ status: "deleted", deletedAt: now, updatedAt: now })
      .where(eq(s.contributions.id, id));
    const children = await tx
      .select({ id: s.contributions.id })
      .from(s.contributions)
      .where(eq(s.contributions.parentContributionId, id));
    const ids = [id, ...children.map((c) => c.id)];
    await tx
      .update(s.contacts)
      .set({ status: "hidden", updatedAt: now })
      .where(inArray(s.contacts.contributionId, ids));
    await enqueueCleanup(tx, ids, "contribution_deleted", now);
    if (profile.role === "moderator" && tip.authorId !== userId)
      await tx.insert(s.moderationEvents).values({
        moderatorId: userId,
        targetType: "contribution",
        targetId: id,
        action: "delete",
        reason: reason!,
        createdAt: now,
      });
    return { id };
  });
}
// Stable canonical ordering for receipt data is handled by the parsed input shape.
void sql;
