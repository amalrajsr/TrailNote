import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import { cardsForRows } from "./contributions";

export async function accountContributions(
  db: Database,
  userId: string,
  filter: "all" | "published" | "hidden" = "all",
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
  return cards.map((card, index) => ({ ...card, status: rows[index]!.status }));
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
