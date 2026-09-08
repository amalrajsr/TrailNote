import "server-only";
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client";
import { confirmations, helpfulVotes } from "../../db/schema";
import { activeProfile, visibleContribution } from "./contributions";
import { validMonth } from "../../lib/visit-month";
import { DomainError } from "../result";
export async function setConfirmation(
  db: Database,
  userId: string,
  id: string,
  revision: number,
  month: string,
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    await activeProfile(tx, userId);
    const tip = await visibleContribution(tx, id);
    if (tip.authorId === userId)
      throw new DomainError(
        "FORBIDDEN",
        "Authors cannot confirm their own tips.",
      );
    if (tip.revision !== revision)
      throw new DomainError(
        "CONFLICT",
        "This tip was edited. Review the latest version before confirming.",
      );
    if (
      !validMonth(month, now) ||
      (tip.visitedMonth && month < tip.visitedMonth)
    )
      throw new DomainError(
        "VALIDATION",
        "Choose a month on or after the original visit, through this month.",
      );
    await tx
      .insert(confirmations)
      .values({
        contributionId: id,
        revision,
        userId,
        visitedMonth: month,
        createdAt: +now,
        updatedAt: +now,
      })
      .onConflictDoUpdate({
        target: [
          confirmations.contributionId,
          confirmations.revision,
          confirmations.userId,
        ],
        set: { visitedMonth: month, updatedAt: +now },
      });
    return { month };
  });
}
export async function removeConfirmation(
  db: Database,
  userId: string,
  id: string,
  revision: number,
) {
  return db.transaction(async (tx) => {
    await activeProfile(tx, userId);
    const tip = await visibleContribution(tx, id);
    if (tip.revision !== revision)
      throw new DomainError(
        "CONFLICT",
        "This tip was edited. Review the latest version before changing your confirmation.",
      );
    await tx
      .delete(confirmations)
      .where(
        and(
          eq(confirmations.contributionId, id),
          eq(confirmations.revision, revision),
          eq(confirmations.userId, userId),
        ),
      );
    return { id };
  });
}
export async function setHelpful(
  db: Database,
  userId: string,
  id: string,
  helpful: boolean,
) {
  return db.transaction(async (tx) => {
    await activeProfile(tx, userId);
    const tip = await visibleContribution(tx, id);
    if (tip.authorId === userId)
      throw new DomainError(
        "FORBIDDEN",
        "Authors cannot vote on their own tips.",
      );
    if (helpful)
      await tx
        .insert(helpfulVotes)
        .values({ contributionId: id, userId })
        .onConflictDoNothing();
    else
      await tx
        .delete(helpfulVotes)
        .where(
          and(
            eq(helpfulVotes.contributionId, id),
            eq(helpfulVotes.userId, userId),
          ),
        );
    return { helpful };
  });
}
