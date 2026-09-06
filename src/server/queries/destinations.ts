import "server-only";
import { and, eq, sql, asc } from "drizzle-orm";
import type { Database } from "../../db/client";
import { destinations as d, contributions as c } from "../../db/schema";
export const normalizeSearch = (s: string) =>
  s.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
const likeEscape = (s: string) => s.replace(/[!%_]/g, "!$&");
const rootCount =
  sql<number>`(select count(*) from contributions c join profiles p on p.user_id = c.author_id and p.status = 'active' where c.destination_id = destinations.id and c.status = 'published' and c.parent_contribution_id is null)`.mapWith(
    Number,
  );
const shape = {
  id: d.id,
  slug: d.slug,
  name: d.name,
  state: d.state,
  description: d.description,
  heroPath: d.heroPath,
  publishedRootTipCount: rootCount,
};
export async function destinationList(db: Database) {
  return db
    .select(shape)
    .from(d)
    .where(eq(d.enabled, true))
    .orderBy(asc(d.createdAt), asc(d.name))
    .limit(60);
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
        sql`(${d.normalizedName} like ${contains} escape '!' or exists (select 1 from destination_aliases a where a.destination_id = ${d.id} and a.normalized_alias like ${contains} escape '!'))`,
      ),
    )
    .orderBy(
      sql`case when ${d.normalizedName} = ${q} or exists (select 1 from destination_aliases a where a.destination_id = ${d.id} and a.normalized_alias = ${q}) then 0 when ${d.normalizedName} like ${prefix} escape '!' or exists (select 1 from destination_aliases a where a.destination_id = ${d.id} and a.normalized_alias like ${prefix} escape '!') then 1 else 2 end`,
      asc(d.name),
      asc(d.id),
    )
    .limit(8);
}
export type DestinationSummary = Awaited<
  ReturnType<typeof destinationList>
>[number];
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
