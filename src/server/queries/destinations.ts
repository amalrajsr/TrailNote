import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "../../db/client";
import { destinations as d, contributions as c } from "../../db/schema";
import { normalizeDestinationText } from "../../lib/destination-search";
export const normalizeSearch = normalizeDestinationText;
const likeEscape = (s: string) => s.replace(/[!%_]/g, "!$&");
const rootCount =
  sql<number>`(select count(*) from contributions c join profiles p on p.user_id = c.author_id and p.status = 'active' where c.destination_id = destinations.id and c.status = 'published' and c.parent_contribution_id is null)`.mapWith(
    Number,
  );
const shape = {
  id: d.id,
  slug: d.slug,
  name: d.name,
  canonicalName: d.canonicalName,
  state: d.state,
  latitude: d.latitude,
  longitude: d.longitude,
  provider: d.provider,
  providerPlaceId: d.providerPlaceId,
  description: d.description,
  heroPath: d.heroPath,
  publishedRootTipCount: rootCount,
};

const cardShape = {
  id: d.id,
  slug: d.slug,
  name: d.name,
  state: d.state,
  publishedRootTipCount: rootCount,
};

const pageShape = {
  ...cardShape,
  normalizedName: d.normalizedName,
};

export const DESTINATION_PAGE_SIZE = 6;
const MAX_DESTINATION_PAGE_SIZE = 24;

type DestinationCursor = {
  publishedRootTipCount: number;
  normalizedName: string;
  id: string;
};

export class InvalidDestinationCursorError extends Error {}

function encodeCursor(cursor: DestinationCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string): DestinationCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<DestinationCursor>;
    if (
      !Number.isSafeInteger(parsed.publishedRootTipCount) ||
      parsed.publishedRootTipCount! < 0 ||
      typeof parsed.normalizedName !== "string" ||
      !parsed.normalizedName ||
      parsed.normalizedName.length > 160 ||
      typeof parsed.id !== "string" ||
      !parsed.id ||
      parsed.id.length > 100
    )
      throw new Error("Invalid cursor shape");
    return {
      publishedRootTipCount: parsed.publishedRootTipCount!,
      normalizedName: parsed.normalizedName,
      id: parsed.id,
    };
  } catch {
    throw new InvalidDestinationCursorError("Invalid destination cursor");
  }
}

export async function destinationMapList(db: Database) {
  return db
    .select({
      id: d.id,
      slug: d.slug,
      name: d.name,
      state: d.state,
      latitude: d.latitude,
      longitude: d.longitude,
    })
    .from(d)
    .where(
      and(eq(d.enabled, true), isNotNull(d.latitude), isNotNull(d.longitude)),
    )
    .orderBy(desc(rootCount), asc(d.normalizedName), asc(d.id))
    .limit(16);
}

export async function destinationPage(
  db: Database,
  options: { after?: string | null; limit?: number } = {},
) {
  const requestedLimit = options.limit ?? DESTINATION_PAGE_SIZE;
  const limit = Math.min(
    Math.max(
      Number.isFinite(requestedLimit)
        ? Math.trunc(requestedLimit)
        : DESTINATION_PAGE_SIZE,
      1,
    ),
    MAX_DESTINATION_PAGE_SIZE,
  );
  const cursor = options.after ? decodeCursor(options.after) : null;
  const cursorFilter = cursor
    ? or(
        sql`${rootCount} < ${cursor.publishedRootTipCount}`,
        and(
          sql`${rootCount} = ${cursor.publishedRootTipCount}`,
          gt(d.normalizedName, cursor.normalizedName),
        ),
        and(
          sql`${rootCount} = ${cursor.publishedRootTipCount}`,
          eq(d.normalizedName, cursor.normalizedName),
          gt(d.id, cursor.id),
        ),
      )
    : undefined;
  const rows = await db
    .select(pageShape)
    .from(d)
    .where(and(eq(d.enabled, true), cursorFilter))
    .orderBy(desc(rootCount), asc(d.normalizedName), asc(d.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const visibleRows = rows.slice(0, limit);
  const destinations = visibleRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    state: row.state,
    publishedRootTipCount: row.publishedRootTipCount,
  }));
  const last = visibleRows.at(-1);

  return {
    destinations,
    nextCursor:
      hasMore && last
        ? encodeCursor({
            publishedRootTipCount: last.publishedRootTipCount,
            normalizedName: last.normalizedName,
            id: last.id,
          })
        : null,
  };
}
export async function destinationBySlug(db: Database, slug: string) {
  return (
    (
      await db
        .select(shape)
        .from(d)
        .where(and(eq(d.enabled, true), eq(d.slug, slug)))
        .limit(1)
    )[0] ?? null
  );
}
export async function searchDestinations(db: Database, raw: string) {
  const q = normalizeSearch(raw);
  if (q.length < 2 || q.length > 80) return [];
  const contains = `%${likeEscape(q)}%`,
    prefix = `${likeEscape(q)}%`;
  return db
    .select(shape)
    .from(d)
    .where(
      and(
        eq(d.enabled, true),
        sql`(${d.normalizedName} like ${contains} escape '!' or ${d.canonicalName} like ${contains} escape '!' or exists (select 1 from destination_aliases a where a.destination_id = ${d.id} and a.normalized_alias like ${contains} escape '!'))`,
      ),
    )
    .orderBy(
      sql`case when ${d.normalizedName} = ${q} or ${d.canonicalName} = ${q} or exists (select 1 from destination_aliases a where a.destination_id = ${d.id} and a.normalized_alias = ${q}) then 0 when ${d.normalizedName} like ${prefix} escape '!' or ${d.canonicalName} like ${prefix} escape '!' or exists (select 1 from destination_aliases a where a.destination_id = ${d.id} and a.normalized_alias like ${prefix} escape '!') then 1 else 2 end`,
      asc(d.name),
      asc(d.id),
    )
    .limit(8);
}
export type DestinationPage = Awaited<ReturnType<typeof destinationPage>>;
export type DestinationSummary = DestinationPage["destinations"][number];

export async function destinationCount(db: Database) {
  const [result] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(d)
    .where(eq(d.enabled, true));
  return result?.count ?? 0;
}

export async function categoryCountsForDestinations(
  db: Database,
  destinationIds: string[],
) {
  if (!destinationIds.length) return {};

  const rows = await db
    .select({
      destinationId: c.destinationId,
      category: c.category,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(c)
    .where(
      and(
        inArray(c.destinationId, destinationIds),
        eq(c.status, "published"),
        sql`${c.parentContributionId} is null`,
        sql`exists(select 1 from profiles p where p.user_id = ${c.authorId} and p.status = 'active')`,
      ),
    )
    .groupBy(c.destinationId, c.category);

  return Object.fromEntries(
    destinationIds.map((destinationId) => [
      destinationId,
      rows
        .filter((row) => row.destinationId === destinationId)
        .map(({ category, count }) => ({ category, count })),
    ]),
  );
}
export async function categoryCounts(db: Database, destinationId: string) {
  return db
    .select({
      category: c.category,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(c)
    .where(
      and(
        eq(c.destinationId, destinationId),
        eq(c.status, "published"),
        sql`${c.parentContributionId} is null`,
        sql`exists(select 1 from profiles p where p.user_id = ${c.authorId} and p.status = 'active')`,
      ),
    )
    .groupBy(c.category);
}
