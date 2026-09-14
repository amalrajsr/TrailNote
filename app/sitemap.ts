import type { MetadataRoute } from "next";
import { getDatabase } from "../src/db";
import { env } from "../src/server/env";
import { sitemapContributions } from "../src/server/queries/contributions";
import { sitemapDestinations } from "../src/server/queries/destinations";

export const dynamic = "force-dynamic";

const baseUrl = new URL(
  env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL ?? "http://localhost:3000",
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { db } = await getDatabase();
  const [destinations, contributions] = await Promise.all([
    sitemapDestinations(db),
    sitemapContributions(db),
  ]);
  return [
    { url: new URL("/", baseUrl).toString(), priority: 1 },
    { url: new URL("/search", baseUrl).toString(), priority: 0.8 },
    { url: new URL("/privacy", baseUrl).toString(), priority: 0.3 },
    { url: new URL("/terms", baseUrl).toString(), priority: 0.3 },
    {
      url: new URL("/community-guidelines", baseUrl).toString(),
      priority: 0.3,
    },
    ...destinations.map((destination) => ({
      url: new URL(`/destinations/${destination.slug}`, baseUrl).toString(),
      lastModified: new Date(destination.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...contributions.map((contribution) => ({
      url: new URL(`/tips/${contribution.id}`, baseUrl).toString(),
      lastModified: new Date(contribution.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
