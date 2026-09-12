import {
  normalizeDestinationText,
  type SearchDestination,
} from "../../../../src/lib/destination-search";
import { getDatabase } from "../../../../src/db";
import { env } from "../../../../src/server/env";
import { searchDestinations } from "../../../../src/server/queries/destinations";
import { consumeRateLimit } from "../../../../src/server/rate-limit";
import { DomainError } from "../../../../src/server/result";
import { anonymousKey, safeLog } from "../../../../src/server/security";
import { searchGeoapifyDestinations } from "../../../../src/server/services/destination-search";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80)
    return Response.json(
      { error: "Search must be between 2 and 80 characters." },
      { status: 400 },
    );

  try {
    const { db } = await getDatabase();
    await consumeRateLimit(
      db,
      anonymousKey(request),
      "destination_search",
      60,
      60_000,
    );
    const local = await searchDestinations(db, query);
    let providerResults: SearchDestination[] = [];
    let providerFailed = false;

    if (env.GEOAPIFY_API_KEY) {
      try {
        providerResults = await searchGeoapifyDestinations(
          query,
          env.GEOAPIFY_API_KEY,
        );
      } catch {
        providerFailed = true;
        safeLog("destination_search_provider_failed");
      }
    }

    const localResults = local.map((destination) => {
      const normalizedName = normalizeDestinationText(destination.name);
      const provider = providerResults.find(
        (candidate) =>
          normalizeDestinationText(candidate.state ?? "") ===
            normalizeDestinationText(destination.state) &&
          [candidate.canonicalName, ...candidate.aliases].some(
            (name) => normalizeDestinationText(name) === normalizedName,
          ),
      );

      return provider
        ? { ...provider, trailnoteSlug: destination.slug }
        : {
            provider: destination.provider ?? ("trailnote" as const),
            providerPlaceId: destination.providerPlaceId ?? undefined,
            trailnoteSlug: destination.slug,
            displayName: destination.name,
            canonicalName: destination.canonicalName ?? destination.name,
            secondaryText:
              destination.canonicalName &&
              destination.canonicalName !== destination.name
                ? `${destination.canonicalName}, ${destination.state}`
                : destination.state,
            state: destination.state,
            country: "India",
            latitude: destination.latitude ?? undefined,
            longitude: destination.longitude ?? undefined,
            aliases: [],
            matchType: "provider" as const,
          };
    });
    const linkedPlaceIds = new Set(
      localResults.map((result) => result.providerPlaceId).filter(Boolean),
    );
    const results = [
      ...localResults,
      ...providerResults.filter(
        (result) => !linkedPlaceIds.has(result.providerPlaceId),
      ),
    ].slice(0, 5);

    if (providerFailed && results.length === 0)
      return Response.json(
        { error: "Couldn't load destinations right now." },
        { status: 503 },
      );

    return Response.json(
      { query, results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const rateLimited =
      error instanceof DomainError && error.code === "RATE_LIMITED";
    return Response.json(
      {
        error: rateLimited
          ? "Too many searches. Please wait a moment."
          : "Couldn't load destinations right now.",
      },
      { status: rateLimited ? 429 : 503 },
    );
  }
}
