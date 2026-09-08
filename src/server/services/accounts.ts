import "server-only";

import { eq, inArray, or } from "drizzle-orm";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";

type Media = { id: string; fileId: string | null; path: string | null };

/** Support-only erasure. Media deletion happens before database erasure. */
export async function deleteAccount(
  db: Database,
  userId: string,
  deleteMedia: (asset: Media) => Promise<void>,
) {
  const [owned, assets] = await Promise.all([
    db
      .select({
        id: s.contributions.id,
        parentId: s.contributions.parentContributionId,
      })
      .from(s.contributions)
      .where(eq(s.contributions.authorId, userId)),
    db
      .select({
        id: s.uploadAssets.id,
        fileId: s.uploadAssets.imagekitFileId,
        path: s.uploadAssets.imagekitPath,
      })
      .from(s.uploadAssets)
      .where(eq(s.uploadAssets.ownerId, userId)),
  ]);
  const rootIds = owned
    .filter((row) => row.parentId === null)
    .map((row) => row.id);
  const children = rootIds.length
    ? await db
        .select({ id: s.contributions.id })
        .from(s.contributions)
        .where(inArray(s.contributions.parentContributionId, rootIds))
    : [];
  const dependentIds = [
    ...owned.filter((row) => row.parentId !== null).map((row) => row.id),
    ...children.map((row) => row.id),
  ];
  const ids = [...new Set([...rootIds, ...dependentIds])];
  for (const asset of assets) await deleteMedia(asset);
  await db.transaction(async (tx) => {
    const contacts = ids.length
      ? await tx
          .select({ id: s.contacts.id })
          .from(s.contacts)
          .where(inArray(s.contacts.contributionId, ids))
      : [];
    const contactIds = contacts.map((row) => row.id);
    if (ids.length) {
      await tx
        .delete(s.contactRemovalRequests)
        .where(
          or(
            inArray(s.contactRemovalRequests.contributionId, ids),
            contactIds.length
              ? inArray(s.contactRemovalRequests.contactId, contactIds)
              : undefined,
          ),
        );
      await tx
        .delete(s.reports)
        .where(
          or(
            inArray(s.reports.contributionId, ids),
            eq(s.reports.reporterId, userId),
          ),
        );
      await tx
        .delete(s.contributionPhotos)
        .where(inArray(s.contributionPhotos.contributionId, ids));
      await tx
        .delete(s.confirmations)
        .where(
          or(
            inArray(s.confirmations.contributionId, ids),
            eq(s.confirmations.userId, userId),
          ),
        );
      await tx
        .delete(s.helpfulVotes)
        .where(
          or(
            inArray(s.helpfulVotes.contributionId, ids),
            eq(s.helpfulVotes.userId, userId),
          ),
        );
      await tx
        .delete(s.contacts)
        .where(inArray(s.contacts.contributionId, ids));
      if (dependentIds.length) {
        await tx
          .delete(s.contributionRevisions)
          .where(inArray(s.contributionRevisions.contributionId, dependentIds));
        await tx
          .delete(s.contributions)
          .where(inArray(s.contributions.id, dependentIds));
      }
      if (rootIds.length) {
        await tx
          .delete(s.contributionRevisions)
          .where(inArray(s.contributionRevisions.contributionId, rootIds));
        await tx
          .delete(s.contributions)
          .where(inArray(s.contributions.id, rootIds));
      }
    } else {
      await tx.delete(s.reports).where(eq(s.reports.reporterId, userId));
      await tx
        .delete(s.confirmations)
        .where(eq(s.confirmations.userId, userId));
      await tx.delete(s.helpfulVotes).where(eq(s.helpfulVotes.userId, userId));
    }
    const assetIds = assets.map((asset) => asset.id);
    if (assetIds.length)
      await tx
        .delete(s.mediaCleanupJobs)
        .where(inArray(s.mediaCleanupJobs.assetId, assetIds));
    await tx.delete(s.uploadAssets).where(eq(s.uploadAssets.ownerId, userId));
    await tx
      .delete(s.mutationReceipts)
      .where(eq(s.mutationReceipts.userId, userId));
    await tx
      .delete(s.moderationEvents)
      .where(eq(s.moderationEvents.moderatorId, userId));
    await tx.delete(s.profiles).where(eq(s.profiles.userId, userId));
    await tx.delete(s.user).where(eq(s.user.id, userId));
  });
  return { deletedContributions: ids.length, deletedAssets: assets.length };
}
