import "server-only";
import { and, eq, sql, desc, inArray, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import {
  categories,
  categoryLabels,
  type Category,
  type PriceUnit,
} from "../../lib/constants";
import { freshness } from "../../lib/visit-month";
import { DomainError } from "../result";
import { visibleContribution } from "../services/contributions";

const c = s.contributions;
const lastMonth = sql<
  string | null
>`(select max(f.visited_month) from confirmations f join profiles p on p.user_id=f.user_id and p.status='active' where f.contribution_id=${c.id} and f.revision=${c.revision} and f.user_id<>${c.authorId} and (${c.visitedMonth} is null or f.visited_month>=${c.visitedMonth}))`;
const effective = sql<string>`coalesce(max(coalesce(${c.visitedMonth},''),coalesce(${lastMonth},'')),'')`;
const cursorSchema = z.object({
  v: z.literal(1),
  destination: z.uuid(),
  category: z.enum(categories).nullable(),
  sort: z.enum(["recent", "newest"]),
  snapshot: z.number().int().positive(),
  month: z.string().max(7),
  created: z.number().int(),
  id: z.uuid(),
});
const visible = sql`exists(select 1 from profiles p where p.user_id=${c.authorId} and p.status='active') and exists(select 1 from destinations d where d.id=${c.destinationId} and d.enabled=1)`;
export async function listContributions(
  db: Database,
  {
    destinationId,
    category,
    sort = "recent",
    cursor,
    now = Date.now(),
  }: {
    destinationId: string;
    category?: Category;
    sort?: "recent" | "newest";
    cursor?: string;
    now?: number;
  },
) {
  let snapshot = now,
    after: SQL | undefined;
  if (cursor) {
    try {
      if (cursor.length > 2048) throw Error();
      const data = cursorSchema.parse(
        JSON.parse(Buffer.from(cursor, "base64url").toString()),
      );
      if (
        data.destination !== destinationId ||
        data.category !== (category ?? null) ||
        data.sort !== sort ||
        data.snapshot > now ||
        data.snapshot < now - 86400000
      )
        throw Error();
      snapshot = data.snapshot;
      after =
        sort === "newest"
          ? sql`(${c.createdAt},${c.id}) < (${data.created},${data.id})`
          : sql`(${effective},${c.createdAt},${c.id}) < (${data.month},${data.created},${data.id})`;
    } catch {
      throw new DomainError(
        "VALIDATION",
        "This page link expired or is invalid. Refresh the tips.",
      );
    }
  }
  const rows = await db
    .select({ tip: c, effective })
    .from(c)
    .where(
      and(
        eq(c.destinationId, destinationId),
        eq(c.status, "published"),
        sql`${c.parentContributionId} is null`,
        visible,
        category ? eq(c.category, category) : undefined,
        sql`${c.createdAt} <= ${snapshot}`,
        after,
      ),
    )
    .orderBy(
      ...(sort === "recent" ? [desc(effective)] : []),
      desc(c.createdAt),
      desc(c.id),
    )
    .limit(13);
  const selected = rows.slice(0, 12),
    cards = await cardsForRows(
      db,
      selected.map((r) => r.tip),
    );
  const last = selected.at(-1);
  const nextCursor =
    rows.length > 12 && last
      ? Buffer.from(
          JSON.stringify({
            v: 1,
            destination: destinationId,
            category: category ?? null,
            sort,
            snapshot,
            month: last.effective,
            created: last.tip.createdAt,
            id: last.tip.id,
          }),
        ).toString("base64url")
      : null;
  return { cards, nextCursor };
}
type Tip = typeof c.$inferSelect;
export async function cardsForRows(db: Database, rows: Tip[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [authors, destinations, confirm, helpful, updates, photos] =
    await Promise.all([
      db
        .select({ id: s.profiles.userId, name: s.profiles.displayName })
        .from(s.profiles)
        .where(
          inArray(
            s.profiles.userId,
            rows.map((r) => r.authorId),
          ),
        ),
      db
        .select({
          id: s.destinations.id,
          slug: s.destinations.slug,
          name: s.destinations.name,
        })
        .from(s.destinations)
        .where(
          inArray(
            s.destinations.id,
            rows.map((r) => r.destinationId),
          ),
        ),
      db
        .select({
          id: s.confirmations.contributionId,
          revision: s.confirmations.revision,
          month: sql<string>`max(${s.confirmations.visitedMonth})`,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(s.confirmations)
        .innerJoin(
          s.profiles,
          and(
            eq(s.profiles.userId, s.confirmations.userId),
            eq(s.profiles.status, "active"),
          ),
        )
        .innerJoin(
          c,
          and(
            eq(c.id, s.confirmations.contributionId),
            eq(c.revision, s.confirmations.revision),
            sql`${s.confirmations.userId} <> ${c.authorId}`,
            sql`(${c.visitedMonth} is null or ${s.confirmations.visitedMonth} >= ${c.visitedMonth})`,
          ),
        )
        .where(inArray(s.confirmations.contributionId, ids))
        .groupBy(s.confirmations.contributionId, s.confirmations.revision),
      db
        .select({
          id: s.helpfulVotes.contributionId,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(s.helpfulVotes)
        .innerJoin(
          s.profiles,
          and(
            eq(s.profiles.userId, s.helpfulVotes.userId),
            eq(s.profiles.status, "active"),
          ),
        )
        .where(inArray(s.helpfulVotes.contributionId, ids))
        .groupBy(s.helpfulVotes.contributionId),
      db
        .select({ id: c.parentContributionId, revision: c.parentRevision })
        .from(c)
        .where(
          and(
            inArray(c.parentContributionId, ids),
            eq(c.status, "published"),
            visible,
          ),
        ),
      db
        .select({
          id: s.contributionPhotos.contributionId,
          revision: s.contributionPhotos.revision,
          path: s.uploadAssets.imagekitPath,
          width: s.uploadAssets.width,
          height: s.uploadAssets.height,
          alt: s.contributionPhotos.altText,
          position: s.contributionPhotos.position,
        })
        .from(s.contributionPhotos)
        .innerJoin(
          s.uploadAssets,
          and(
            eq(s.uploadAssets.id, s.contributionPhotos.assetId),
            eq(s.uploadAssets.status, "attached"),
          ),
        )
        .where(inArray(s.contributionPhotos.contributionId, ids))
        .orderBy(s.contributionPhotos.position),
    ]);
  return rows.map((t) => {
    const author = authors.find((a) => a.id === t.authorId),
      destination = destinations.find((d) => d.id === t.destinationId),
      confirmation = confirm.find(
        (f) => f.id === t.id && f.revision === t.revision,
      ),
      changed = updates.some((u) => u.id === t.id && u.revision === t.revision);
    const title =
      t.placeName ||
      (t.fromName && t.toName
        ? `${t.fromName} → ${t.toName}`
        : `${categoryLabels[t.category]} tip in ${destination?.name ?? "this destination"}`);
    return {
      id: t.id,
      destinationId: t.destinationId,
      destination: {
        slug: destination?.slug ?? "",
        name: destination?.name ?? "Destination",
      },
      category: t.category,
      title,
      body: t.body,
      price:
        t.pricePaise === null
          ? null
          : {
              paise: t.pricePaise,
              currency: "INR" as const,
              unit: t.priceUnit!,
              unitLabel: t.priceUnitLabel,
            },
      visitedMonth: t.visitedMonth,
      lastConfirmedMonth: confirmation?.month ?? null,
      confirmationCount: confirmation?.count ?? 0,
      helpfulCount: helpful.find((h) => h.id === t.id)?.count ?? 0,
      changeReported: changed,
      freshness: freshness(
        t.visitedMonth,
        confirmation?.month ?? null,
        changed,
      ),
      author: {
        displayName: author?.name ?? "Traveler",
        initial: Array.from(author?.name ?? "T")[0],
      },
      revision: t.revision,
      createdAt: t.createdAt,
      parentContributionId: t.parentContributionId,
      parentRevision: t.parentRevision,
      photos: photos
        .filter(
          (p) =>
            p.id === t.id &&
            p.revision === t.revision &&
            p.path &&
            p.width &&
            p.height,
        )
        .map((p) => ({
          path: p.path!,
          width: p.width!,
          height: p.height!,
          alt: p.alt || `Traveler photo attached to ${title}`,
        })),
    };
  });
}
export type ContributionCardDTO = Awaited<
  ReturnType<typeof cardsForRows>
>[number];

type Snapshot = Partial<{
  body: string;
  visitedMonth: string | null;
  pricePaise: number | null;
  priceUnit: PriceUnit | null;
  priceUnitLabel: string | null;
}>;

function readSnapshot(value: string): Snapshot {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Snapshot) : {};
  } catch {
    return {};
  }
}

export async function contributionDetail(db: Database, id: string) {
  const tip = await visibleContribution(db, id);
  const [card] = await cardsForRows(db, [tip]);
  const [destination] = await db
    .select({
      id: s.destinations.id,
      slug: s.destinations.slug,
      name: s.destinations.name,
      state: s.destinations.state,
    })
    .from(s.destinations)
    .where(eq(s.destinations.id, tip.destinationId));
  const [contact] = await db
    .select({ id: s.contacts.id })
    .from(s.contacts)
    .where(
      and(eq(s.contacts.contributionId, id), eq(s.contacts.status, "visible")),
    );
  const parentTip = tip.parentContributionId
    ? await visibleContribution(db, tip.parentContributionId)
    : null;
  const root = parentTip ?? tip;
  const updateRows = parentTip
    ? []
    : await db
        .select()
        .from(c)
        .where(
          and(
            eq(c.parentContributionId, root.id),
            eq(c.status, "published"),
            visible,
          ),
        )
        .orderBy(desc(c.createdAt));
  const revisions = await db
    .select({
      revision: s.contributionRevisions.revision,
      snapshot: s.contributionRevisions.snapshotJson,
    })
    .from(s.contributionRevisions)
    .where(eq(s.contributionRevisions.contributionId, id));
  const updateCards = await cardsForRows(db, updateRows);
  const revisionSnapshots = new Map(
    revisions.map((revision) => [
      revision.revision,
      readSnapshot(revision.snapshot),
    ]),
  );
  const [parentCard] = parentTip ? await cardsForRows(db, [parentTip]) : [];
  return {
    ...card,
    destination,
    isUpdate: !!parentTip,
    parent: parentCard
      ? {
          id: parentCard.id,
          revision: parentCard.revision,
          title: parentCard.title,
          body: parentCard.body,
          price: parentCard.price,
        }
      : null,
    hasContact: !!contact,
    details: {
      placeName: tip.placeName,
      roomType: tip.roomType,
      bookingMethod: tip.bookingMethod,
      dish: tip.dish,
      fromName: tip.fromName,
      toName: tip.toName,
      transportMode: tip.transportMode,
      durationMinutes: tip.durationMinutes,
      walkMinutes: tip.walkMinutes,
      locationText: tip.locationText,
      mapsUrl: tip.mapsUrl,
    },
    updates: updateCards.filter(
      (update) => update.parentRevision === root.revision,
    ),
    earlierUpdates: updateCards.filter(
      (update) => update.parentRevision !== root.revision,
    ),
    previousRevisions: revisions
      .filter((r) => r.revision !== tip.revision)
      .sort((a, b) => b.revision - a.revision)
      .map((r) => {
        const snapshot = readSnapshot(r.snapshot);
        return {
          revision: r.revision,
          body: String(snapshot.body ?? ""),
          visitedMonth: snapshot.visitedMonth ?? null,
          price:
            snapshot.pricePaise == null || !snapshot.priceUnit
              ? null
              : {
                  paise: snapshot.pricePaise,
                  currency: "INR" as const,
                  unit: snapshot.priceUnit,
                  unitLabel: snapshot.priceUnitLabel ?? null,
                },
        };
      }),
    updateOriginalPrices: Object.fromEntries(
      updateRows.map((update) => {
        const snapshot = revisionSnapshots.get(update.parentRevision ?? -1);
        return [
          update.id,
          update.parentRevision === root.revision
            ? card.price
            : snapshot?.pricePaise == null || !snapshot.priceUnit
              ? null
              : {
                  paise: snapshot.pricePaise,
                  currency: "INR" as const,
                  unit: snapshot.priceUnit,
                  unitLabel: snapshot.priceUnitLabel ?? null,
                },
        ];
      }),
    ),
  };
}

export type ContributionDetailDTO = Awaited<
  ReturnType<typeof contributionDetail>
>;

export async function viewerReactionState(
  db: Database,
  id: string,
  userId?: string,
) {
  const tip = await visibleContribution(db, id);
  if (!userId)
    return {
      authenticated: false,
      isAuthor: false,
      confirmationMonth: null,
      helpful: false,
    };
  const [confirmation, helpful] = await Promise.all([
    db
      .select({ month: s.confirmations.visitedMonth })
      .from(s.confirmations)
      .where(
        and(
          eq(s.confirmations.contributionId, id),
          eq(s.confirmations.revision, tip.revision),
          eq(s.confirmations.userId, userId),
        ),
      )
      .limit(1),
    db
      .select({ id: s.helpfulVotes.contributionId })
      .from(s.helpfulVotes)
      .where(
        and(
          eq(s.helpfulVotes.contributionId, id),
          eq(s.helpfulVotes.userId, userId),
        ),
      )
      .limit(1),
  ]);
  return {
    authenticated: true,
    isAuthor: tip.authorId === userId,
    confirmationMonth: confirmation[0]?.month ?? null,
    helpful: !!helpful[0],
  };
}
