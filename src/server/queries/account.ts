import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import { cardsForRows } from "./contributions";

export async function accountContributions(
  db: Database,
  userId: string,
  filter: "all" | "published" | "hidden" | "deleted" = "all",
) {
  const rows = await db
    .select()
    .from(s.contributions)
    .where(
      and(
        eq(s.contributions.authorId, userId),
        filter === "all" ? undefined : eq(s.contributions.status, filter),
      ),
    )
    .orderBy(desc(s.contributions.createdAt));
  const cards = await cardsForRows(db, rows);
  const hiddenRows = rows.filter((row) => row.status === "hidden");
  const hiddenReasons = new Map<string, string>();

  if (hiddenRows.length) {
    const hiddenIds = hiddenRows.map((row) => row.id);
    const [events, reports] = await Promise.all([
      db
        .select({
          targetId: s.moderationEvents.targetId,
          action: s.moderationEvents.action,
          reason: s.moderationEvents.reason,
          createdAt: s.moderationEvents.createdAt,
        })
        .from(s.moderationEvents)
        .where(
          and(
            eq(s.moderationEvents.targetType, "contribution"),
            inArray(s.moderationEvents.targetId, hiddenIds),
          ),
        ),
      db
        .select({
          contributionId: s.reports.contributionId,
          resolutionNote: s.reports.resolutionNote,
          resolvedAt: s.reports.resolvedAt,
        })
        .from(s.reports)
        .where(
          and(
            eq(s.reports.status, "resolved"),
            inArray(s.reports.contributionId, hiddenIds),
          ),
        ),
    ]);

    const fallbackReason =
      "This tip was hidden because it didn't meet TrailNote's community guidelines.";

    for (const row of hiddenRows) {
      // updatedAt marks the transition into the current Hidden state. A later
      // hide event can be a report resolution while the tip was already hidden.
      const currentHide = events
        .filter(
          (event) =>
            event.targetId === row.id &&
            event.action === "hide" &&
            event.createdAt >= row.updatedAt,
        )
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!currentHide) {
        hiddenReasons.set(row.id, fallbackReason);
        continue;
      }

      const reportHide = reports.find(
        (report) =>
          report.contributionId === row.id &&
          report.resolvedAt === currentHide.createdAt &&
          report.resolutionNote === currentHide.reason,
      );
      hiddenReasons.set(
        row.id,
        reportHide?.resolutionNote ?? currentHide.reason ?? fallbackReason,
      );
    }
  }

  return cards.map((card, index) => {
    const row = rows[index]!;
    return {
      ...card,
      status: row.status,
      deletedAt: row.deletedAt,
      hiddenReason: hiddenReasons.get(row.id) ?? null,
    };
  });
}

export async function ownedContribution(
  db: Database,
  userId: string,
  id: string,
) {
  return (
    (
      await db
        .select()
        .from(s.contributions)
        .where(
          and(eq(s.contributions.id, id), eq(s.contributions.authorId, userId)),
        )
    )[0] ?? null
  );
}
