export type SearchDestination = {
  provider: "geoapify" | "trailnote";
  providerPlaceId?: string;
  trailnoteSlug?: string;
  displayName: string;
  canonicalName: string;
  secondaryText: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  aliases: string[];
  resultType?: string;
  matchType:
    | "canonical-exact"
    | "alias-exact"
    | "canonical-prefix"
    | "alias-prefix"
    | "contains"
    | "provider";
};

type GeoapifyResult = Record<string, unknown>;

export const normalizeDestinationText = (value: string) =>
  value.trim().toLowerCase().normalize("NFKD").replace(/\s+/g, " ");

export function extractDestinationAliases(otherNames: unknown): string[] {
  if (!otherNames || typeof otherNames !== "object") return [];

  const allowed = new Set(["name:en", "alt_name", "alt_name:en"]);
  const aliases = Object.entries(otherNames)
    .filter(([key]) => allowed.has(key))
    .flatMap(([, value]) =>
      typeof value === "string"
        ? [value]
        : Array.isArray(value)
          ? value.filter((item): item is string => typeof item === "string")
          : [],
    )
    .flatMap((value) => value.split(";"));
  const seen = new Set<string>();

  return aliases
    .filter((alias) => {
      const normalized = normalizeDestinationText(alias);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .map((alias) => alias.trim());
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function matchType(
  query: string,
  canonicalName: string,
  aliases: string[],
): SearchDestination["matchType"] {
  const q = normalizeDestinationText(query);
  const canonical = normalizeDestinationText(canonicalName);
  const normalizedAliases = aliases.map(normalizeDestinationText);

  if (canonical === q) return "canonical-exact";
  if (normalizedAliases.includes(q)) return "alias-exact";
  if (canonical.startsWith(q)) return "canonical-prefix";
  if (normalizedAliases.some((alias) => alias.startsWith(q)))
    return "alias-prefix";
  if (
    canonical.includes(q) ||
    normalizedAliases.some((alias) => alias.includes(q))
  )
    return "contains";
  return "provider";
}

const matchScores: Record<SearchDestination["matchType"], number> = {
  "canonical-exact": 1_000,
  "alias-exact": 950,
  "canonical-prefix": 500,
  "alias-prefix": 450,
  contains: 200,
  provider: 0,
};

export function normalizeGeoapifyDestinations(
  rawResults: unknown,
  query: string,
): SearchDestination[] {
  if (!Array.isArray(rawResults)) return [];

  const ranked = rawResults.flatMap((raw, providerRank) => {
    if (!raw || typeof raw !== "object") return [];
    const result = raw as GeoapifyResult;
    if (stringValue(result.country_code)?.toLowerCase() !== "in") return [];

    const canonicalName =
      stringValue(result.name) ??
      stringValue(result.city) ??
      stringValue(result.district);
    const latitude = result.lat;
    const longitude = result.lon;
    if (
      !canonicalName ||
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude)
    )
      return [];

    const aliases = extractDestinationAliases(result.other_names).filter(
      (alias) =>
        normalizeDestinationText(alias) !==
        normalizeDestinationText(canonicalName),
    );
    const match = matchType(query, canonicalName, aliases);
    const exactAlias = aliases.find(
      (alias) =>
        normalizeDestinationText(alias) === normalizeDestinationText(query),
    );
    const displayName = exactAlias ?? canonicalName;
    const state = stringValue(result.state);
    const country = stringValue(result.country) ?? "India";
    const resultType = stringValue(result.result_type);
    const context = [
      displayName !== canonicalName ? canonicalName : undefined,
      state,
      !state ? country : undefined,
    ].filter((value): value is string => Boolean(value));
    const score =
      matchScores[match] +
      (resultType &&
      ["city", "locality", "district", "suburb", "county"].includes(resultType)
        ? 150
        : 0) -
      (resultType === "street" ||
      /\b(?:highway|road|street)\b/i.test(canonicalName)
        ? 200
        : 0);

    return [
      {
        destination: {
          provider: "geoapify" as const,
          providerPlaceId: stringValue(result.place_id),
          displayName,
          canonicalName,
          secondaryText: [...new Set(context)].join(", "),
          state,
          country,
          latitude,
          longitude,
          aliases,
          resultType,
          matchType: match,
        },
        providerRank,
        score,
      },
    ];
  });

  ranked.sort((a, b) => b.score - a.score || a.providerRank - b.providerRank);

  const seen = new Set<string>();
  return ranked
    .flatMap(({ destination }) => {
      const key =
        destination.providerPlaceId ??
        [
          normalizeDestinationText(destination.canonicalName),
          normalizeDestinationText(destination.state ?? ""),
          destination.latitude.toFixed(4),
          destination.longitude.toFixed(4),
        ].join("|");
      if (seen.has(key)) return [];
      seen.add(key);
      return [destination];
    })
    .slice(0, 5);
}
