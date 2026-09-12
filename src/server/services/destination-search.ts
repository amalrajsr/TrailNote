import "server-only";
import { and, eq } from "drizzle-orm";
import {
  normalizeDestinationText,
  normalizeGeoapifyDestinations,
  type SearchDestination,
} from "../../lib/destination-search";
import type { Database, Transaction } from "../../db/client";
import { destinationAliases, destinations } from "../../db/schema";
import { searchDestinations } from "../queries/destinations";
import { DomainError } from "../result";

export async function searchGeoapifyDestinations(
  query: string,
  apiKey: string,
) {
  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.search = new URLSearchParams({
    text: query,
    filter: "countrycode:in",
    limit: "4",
    format: "json",
    apiKey,
  }).toString();

  const response = await fetch(url, {
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Geoapify search failed");

  const body = (await response.json()) as { results?: unknown };
  return normalizeGeoapifyDestinations(body.results, query);
}

function slugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function byProvider(db: Database | Transaction, providerPlaceId: string) {
  return (
    (
      await db
        .select({ id: destinations.id, slug: destinations.slug })
        .from(destinations)
        .where(
          and(
            eq(destinations.provider, "geoapify"),
            eq(destinations.providerPlaceId, providerPlaceId),
          ),
        )
        .limit(1)
    )[0] ?? null
  );
}

export async function saveGeoapifyDestination(
  db: Database,
  destination: SearchDestination,
) {
  const { providerPlaceId, state, latitude, longitude } = destination;
  if (
    destination.provider !== "geoapify" ||
    !providerPlaceId ||
    latitude === undefined ||
    longitude === undefined ||
    !state
  )
    throw new DomainError("VALIDATION", "That destination cannot be saved.");

  const existingByProvider = await byProvider(db, providerPlaceId);
  if (existingByProvider)
    return { ...existingByProvider, created: false as const };

  const names = [
    destination.displayName,
    destination.canonicalName,
    ...destination.aliases,
  ].map(normalizeDestinationText);
  const existingByName = (
    await searchDestinations(db, destination.displayName)
  ).find(
    (candidate) =>
      normalizeDestinationText(candidate.state) ===
        normalizeDestinationText(state) &&
      names.includes(normalizeDestinationText(candidate.name)),
  );
  if (existingByName)
    return {
      id: existingByName.id,
      slug: existingByName.slug,
      created: false as const,
    };

  return db.transaction(async (tx) => {
    const raced = await byProvider(tx, providerPlaceId);
    if (raced) return { ...raced, created: false as const };

    const base = slugPart(destination.displayName) || "destination";
    const suffix = slugPart(state) || "india";
    const providerSuffix = slugPart(providerPlaceId.slice(-8));
    const slugCandidates = [
      ...new Set([base, `${base}-${suffix}`, `${base}-${providerSuffix}`]),
    ];

    for (const slug of slugCandidates) {
      const inserted = await tx
        .insert(destinations)
        .values({
          slug,
          name: destination.displayName,
          canonicalName: destination.canonicalName,
          state,
          normalizedName: normalizeDestinationText(destination.displayName),
          description: "",
          latitude,
          longitude,
          provider: "geoapify",
          providerPlaceId,
        })
        .onConflictDoNothing()
        .returning({ id: destinations.id, slug: destinations.slug });
      if (!inserted[0]) {
        const concurrent = await byProvider(tx, providerPlaceId);
        if (concurrent) return { ...concurrent, created: false as const };
        continue;
      }

      const aliases = destination.aliases.filter(
        (alias) =>
          ![
            normalizeDestinationText(destination.displayName),
            normalizeDestinationText(destination.canonicalName),
          ].includes(normalizeDestinationText(alias)),
      );
      if (aliases.length)
        await tx.insert(destinationAliases).values(
          aliases.map((alias) => ({
            destinationId: inserted[0]!.id,
            alias,
            normalizedAlias: normalizeDestinationText(alias),
          })),
        );
      return { ...inserted[0], created: true as const };
    }

    throw new DomainError("CONFLICT", "That destination could not be saved.");
  });
}
