# TrailNote Destination Search & Map Navigation — Implementation Specification

## 1. Goal

Build a low-friction destination search for TrailNote that lets a traveler type a place name such as **Ooty**, **Hampi**, **Badami**, or **Varkala**, choose the intended destination from autocomplete, and then:

1. resolve the destination to a canonical internal representation,
2. navigate the user to that destination's TrailNote content,
3. optionally zoom the map to the destination using latitude/longitude,
4. use traveler-friendly names even when the provider's canonical name is different.

The feature should work whether TrailNote eventually uses:

- a map-first UI,
- a search + destination cards UI,
- or a hybrid search + map + content-sheet UI.

The search layer should therefore be designed as a reusable product feature rather than as something tightly coupled to the map.

---

## 2. Core Product Principle

TrailNote should not try to become a general-purpose Google Maps replacement.

The search is primarily for:

> **Travel destinations in India**

Examples:

- Ooty
- Hampi
- Badami
- Varkala
- Gokarna
- Fort Kochi
- Munnar
- Majuli

We are primarily interested in destinations such as cities, towns, villages and localities that travelers use as a base or destination.

Hotels, restaurants and individual POIs can exist inside a destination as community contributions, but they should not dominate the main destination search.

---

## 3. Recommended Architecture

```text
User types destination
        │
        ▼
TrailNote Search API
        │
        ├── debounce / validation
        │
        ▼
Geoapify Autocomplete
        │
        ▼
TrailNote normalization + ranking layer
        │
        ├── keep India results
        ├── inspect name
        ├── inspect city/locality
        ├── inspect other_names
        ├── identify alias matches
        ├── reduce irrelevant street results
        └── rank travel destinations
        │
        ▼
Autocomplete suggestions
        │
        ▼
User selects destination
        │
        ├───────────────┐
        ▼               ▼
Canonical place       Map
resolution            flyTo(lat, lng)
        │
        ▼
Load TrailNote contributions
for the selected place
```

The key architectural idea is:

> **Geoapify provides geographic data. TrailNote owns search relevance and presentation.**

Do not blindly render Geoapify's result order.

---

## 4. Why an Internal Processing Layer Is Needed

A traveler may type:

```text
Ooty
```

but the geographic provider may consider the canonical place name to be:

```text
Udhagamandalam
```

while returning `Ooty` inside an `other_names` or alternative-name field.

A raw provider result list may also contain entries such as:

```text
Mysore Ooty Highway
```

before the actual destination.

For a travel product, that ordering is undesirable.

TrailNote should therefore detect that the query `ooty` is an exact alias of `Udhagamandalam` and present the destination prominently as:

```text
Ooty
Udhagamandalam, Tamil Nadu
```

rather than showing road results first.

---

## 5. Search UX

### Search input

Example:

```text
Where are you going?

[ ooty________________________ ]
```

Recommended behavior:

- begin search after 2-3 characters,
- debounce requests by approximately 300-500 ms,
- show a loading state only if the request is not near-instant,
- show no more than approximately 5 useful suggestions,
- optimize for destination recognition rather than displaying every provider field.

Example autocomplete:

```text
📍 Ooty
   Udhagamandalam, Tamil Nadu

📍 Ooty Road
   Tamil Nadu
```

The actual destination should appear before less relevant matches.

---

## 6. Geoapify Request

Use Geoapify's autocomplete endpoint through the TrailNote backend rather than exposing all search logic directly in the browser.

Example concept:

```http
GET /api/places/search?q=ooty
```

The server can call Geoapify approximately as follows:

```text
https://api.geoapify.com/v1/geocode/autocomplete
  ?text=ooty
  &filter=countrycode:in
  &limit=10
  &format=json
```

Geoapify currently documents:

- `text` for the search string,
- `filter=countrycode:in` to constrain results to India,
- `limit` for result count.

Do not initially request only five provider results if TrailNote intends to rerank them. Fetching around 8-10 gives the internal ranking logic more candidates to work with before returning the best 5.


---

## 7. Backend API

Recommended endpoint:

```http
GET /api/places/search?q=<query>
```

Example:

```http
GET /api/places/search?q=ooty
```

Response:

```json
{
  "query": "ooty",
  "results": [
    {
      "provider": "geoapify",
      "providerPlaceId": "provider-id",
      "displayName": "Ooty",
      "canonicalName": "Udhagamandalam",
      "secondaryText": "Udhagamandalam, Tamil Nadu",
      "state": "Tamil Nadu",
      "country": "India",
      "latitude": 11.41,
      "longitude": 76.70,
      "aliases": [
        "Ooty",
        "Ootacamund"
      ],
      "resultType": "city"
    }
  ]
}
```

The frontend should consume TrailNote's normalized format, not Geoapify's raw response.

This is important because it keeps the frontend independent of the geocoding provider.

Later Geoapify could be swapped for another service without rewriting the autocomplete UI.

---

## 8. Normalized Destination Model

Use an internal type similar to:

```ts
type SearchDestination = {
  provider: "geoapify";
  providerPlaceId?: string;

  displayName: string;
  canonicalName: string;
  secondaryText: string;

  state?: string;
  country: string;

  latitude: number;
  longitude: number;

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
```

### Field meanings

#### `displayName`

What TrailNote shows prominently.

For query:

```text
ooty
```

this should ideally be:

```text
Ooty
```

#### `canonicalName`

The provider's primary geographic name.

Example:

```text
Udhagamandalam
```

#### `aliases`

Alternative names returned by Geoapify.

Example:

```json
[
  "Ooty",
  "Ootacamund"
]
```

#### `secondaryText`

Location context shown below the result.

Example:

```text
Udhagamandalam, Tamil Nadu
```

or:

```text
Tamil Nadu
```

---

## 9. Extracting Aliases

Geoapify may return alternative names under an `other_names` object.

The exact structure can contain several keys, including language-specific or alternate-name variants.

Do not hardcode only:

```ts
other_names.alt_name
```

Instead flatten usable string values from the entire object.

Conceptually:

```ts
function extractAliases(otherNames: unknown): string[] {
  if (!otherNames || typeof otherNames !== "object") {
    return [];
  }

  return Object.values(otherNames)
    .flatMap((value) => {
      if (typeof value === "string") return [value];

      if (Array.isArray(value)) {
        return value.filter((item) => typeof item === "string");
      }

      return [];
    })
    .map((value) => value.trim())
    .filter(Boolean);
}
```

Then deduplicate aliases case-insensitively.

---

## 10. Text Normalization

Before matching query to results, normalize both sides.

Example:

```ts
function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ");
}
```

For later improvements, punctuation handling and transliteration can be introduced if needed.

Do not over-engineer this in the MVP.

---

## 11. Ranking Logic

Provider ranking should be treated as one signal, not the final ranking.

Recommended priority:

```text
1. exact canonical-name match
2. exact alias match
3. canonical-name prefix match
4. alias prefix match
5. canonical/alias contains query
6. relevant city/locality result
7. provider ranking
8. street/highway/irrelevant result
```

Example scoring model:

```ts
function scoreResult(result, query) {
  const q = normalizeText(query);

  const canonical = normalizeText(result.canonicalName);
  const aliases = result.aliases.map(normalizeText);

  let score = 0;

  if (canonical === q) {
    score += 1000;
  }

  if (aliases.some((alias) => alias === q)) {
    score += 950;
  }

  if (canonical.startsWith(q)) {
    score += 500;
  }

  if (aliases.some((alias) => alias.startsWith(q))) {
    score += 450;
  }

  if (canonical.includes(q)) {
    score += 200;
  }

  if (aliases.some((alias) => alias.includes(q))) {
    score += 180;
  }

  if (
    result.resultType === "city" ||
    result.resultType === "locality"
  ) {
    score += 150;
  }

  if (
    result.resultType === "street" ||
    /highway|road|street/i.test(result.canonicalName)
  ) {
    score -= 200;
  }

  return score;
}
```

The exact numbers are not important.

The order of intent is what matters.

---

## 12. Ooty Example

Raw provider candidates may conceptually look like:

```text
Mysore Ooty Highway
Mysore Ooty Highway
Udhagamandalam
```

The Udhagamandalam result includes:

```text
other_names:
  Ooty
  Ootacamund
```

For:

```text
query = "ooty"
```

TrailNote should calculate:

```text
Udhagamandalam
alias exact match: Ooty
=> very high score
```

and:

```text
Mysore Ooty Highway
contains "ooty"
street/highway result
=> much lower score
```

Final output:

```text
1. Ooty
   Udhagamandalam, Tamil Nadu

2. other relevant destination
```

---

## 13. Choosing the Display Name

The search query itself can influence the display label.

If the user searched an alias exactly:

```text
query: Ooty

canonicalName: Udhagamandalam
aliases: ["Ooty", "Ootacamund"]
```

show:

```text
Ooty
Udhagamandalam, Tamil Nadu
```

If the user searches:

```text
Udhagamandalam
```

show:

```text
Udhagamandalam
Tamil Nadu
```

Pseudo-code:

```ts
function chooseDisplayName(query, canonicalName, aliases) {
  const q = normalizeText(query);

  const exactAlias = aliases.find(
    (alias) => normalizeText(alias) === q
  );

  if (exactAlias) {
    return exactAlias;
  }

  return canonicalName;
}
```

This gives TrailNote traveler-friendly naming without corrupting canonical geographic data.

---

## 14. Database Model

Do not use latitude and longitude as the identity of a destination.

Coordinates can differ slightly between providers or change if geocoding data improves.

Recommended conceptual schema:

```sql
CREATE TABLE places (
  id TEXT PRIMARY KEY,

  name TEXT NOT NULL,
  canonical_name TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'India',

  latitude REAL NOT NULL,
  longitude REAL NOT NULL,

  provider TEXT,
  provider_place_id TEXT,

  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

Aliases can initially be stored as JSON if Turso/SQLite usage makes that simplest:

```sql
aliases TEXT
```

Example value:

```json
["Ooty", "Ootacamund"]
```

Alternatively normalize later into:

```text
place_aliases
-------------
id
place_id
alias
```

For the MVP, JSON is sufficient unless alias searching will happen directly in SQL.

---

## 15. Contribution Relationship

Contributions should reference TrailNote's internal place ID:

```text
places
------
id: place_ooty
name: Ooty
canonical_name: Udhagamandalam
lat: ...
lng: ...
```

```text
contributions
-------------
id
place_id: place_ooty
category
...
```

Use:

```text
place_id
```

for relationships.

Do not use:

```text
lat/lng
```

as the foreign identity.

---

## 16. When to Create a `places` Row

For the first version, do **not** store every search result.

Recommended behavior:

```text
User searches Ooty
        ↓
Geoapify result
        ↓
User views Ooty
        ↓
No database insert necessarily required
```

Create a persistent TrailNote place when it becomes relevant to TrailNote's own content.

For example:

```text
First contribution submitted for Ooty
        ↓
resolve/create canonical place
        ↓
store place
        ↓
store contribution with place_id
```

This prevents the database filling up with destinations that users searched once and never contributed to.

---

## 17. Existing TrailNote Places

Once TrailNote has meaningful destination data, the search can evolve into:

```text
User types "ham"
        │
        ├── search TrailNote places
        │
        └── Geoapify search
                │
                ▼
        merge + deduplicate + rank
```

Existing TrailNote destinations can receive a ranking bonus.

Example:

```text
★ Hampi, Karnataka
  47 traveler contributions

──────── Other destinations ────────

📍 Hampapura, Karnataka
```

This can be implemented later.

It is not required for the MVP.

---

## 18. Search Selection Behavior

After the user selects a result:

```ts
onDestinationSelected(destination)
```

the application should:

1. close autocomplete,
2. update selected destination state,
3. update the URL,
4. load contributions,
5. move the map if the map is present.

Recommended URL:

```text
/place/ooty
```

or:

```text
/destination/ooty
```

Internally, avoid relying solely on the slug for identity.

A database ID should remain the canonical identifier once the destination exists in TrailNote.

---

## 19. Map Integration

Coordinates returned from the normalized search result are used only for geographic presentation and geo-related features.

With MapLibre:

```ts
map.flyTo({
  center: [
    destination.longitude,
    destination.latitude
  ],
  zoom: 11
});
```

Important:

MapLibre expects:

```text
[lng, lat]
```

not:

```text
[lat, lng]
```

A selected destination can therefore trigger:

```text
India overview
      ↓
state
      ↓
destination
```

through a smooth camera animation.

Do not require users to manually navigate the map to find a destination.

The map is an exploration layer, not the primary input mechanism.

---

## 20. Suggested Map Zoom Levels

These should be tuned visually rather than treated as fixed rules.

Possible defaults:

```text
India overview       4-5
state / region        6-8
destination           10-12
local neighborhood    12-14
```

For destination search, starting near:

```text
zoom: 11
```

is reasonable.

The final value should depend on TrailNote's map layout and whether a bottom sheet/panel covers part of the map.

---

## 21. Frontend Component Structure

Possible structure:

```text
components/
  destination-search/
    DestinationSearch.tsx
    DestinationSearchInput.tsx
    DestinationSearchResults.tsx
    DestinationSearchItem.tsx

  map/
    TravelMap.tsx

lib/
  geo/
    normalizeGeoapifyResult.ts
    rankDestinations.ts
    extractAliases.ts
    normalizeText.ts

app/
  api/
    places/
      search/
        route.ts
```

This keeps:

```text
API integration
ranking logic
presentation
map behavior
```

separate.

---

## 22. Suggested Search Hook

Conceptually:

```ts
const {
  query,
  setQuery,
  results,
  loading
} = useDestinationSearch();
```

Responsibilities:

```text
input state
debounce
abort stale requests
fetch normalized results
error handling
```

Do not place ranking logic inside the React component.

Ranking should happen server-side or in a shared domain utility.

---

## 23. Abort Stale Requests

Autocomplete creates a common race-condition problem.

Example:

```text
user types: o
request A

user types: oo
request B

user types: ooty
request C
```

Request A may finish after request C.

Use `AbortController` or equivalent request cancellation.

Conceptually:

```ts
useEffect(() => {
  if (query.length < 2) return;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    fetch(
      `/api/places/search?q=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );
  }, 350);

  return () => {
    clearTimeout(timeout);
    controller.abort();
  };
}, [query]);
```

---

## 24. API-Key Security

Do not call Geoapify directly from the client with an unrestricted API key if it can be avoided.

Preferred:

```text
Browser
   ↓
TrailNote /api/places/search
   ↓
Geoapify
```

Benefits:

- the key stays server-side,
- TrailNote controls rate limits,
- TrailNote controls normalization,
- the frontend does not become dependent on Geoapify's response shape,
- switching providers becomes easier.

Store the key in an environment variable:

```text
GEOAPIFY_API_KEY=...
```

Do not commit it to Git.

---

## 25. Basic Rate Limiting

Autocomplete can generate many requests.

Add lightweight protection to:

```text
/api/places/search
```

Possible rules:

```text
minimum query length: 2 or 3 characters
debounce on frontend: 300-500 ms
max query length: reasonable cap
short-term IP/session rate limit
```

Caching can be added later.

---

## 26. Search Cache

Search results are excellent cache candidates because geographic names rarely change.

Example:

```text
query:
ooty

normalized cache key:
places:search:ooty
```

Possible TTL:

```text
several hours
or
1 day
```

Caching is optional for the first iteration.

Do not add Redis just for this feature.

A Next.js caching strategy or simple application-level approach is enough initially if caching becomes necessary.

---

## 27. Deduplication

Geo providers may return several nearly identical records.

Before displaying suggestions, deduplicate using the strongest identifiers available.

Priority:

```text
provider place ID
        ↓
canonical name + state + coordinates
        ↓
canonical name + state
```

Do not deduplicate only on name.

For example:

```text
Aurangabad
```

may refer to different places.

---

## 28. Empty State

When no good destination is found:

```text
We couldn't find that destination.

Try another spelling or nearby town.
```

Later TrailNote could provide:

```text
Can't find the place? Suggest a destination
```

Do not add this contribution workflow in the initial search implementation unless necessary.

---

## 29. Error State

If Geoapify is unavailable:

```text
Couldn't load destinations right now.
Please try again.
```

Do not expose raw provider errors or API details to the traveler.

Log provider errors server-side.

---

## 30. Keyboard UX

Autocomplete should work without a mouse.

Support:

```text
Arrow Down     next result
Arrow Up       previous result
Enter          select
Escape         close
```

Use accessible combobox semantics.

This is particularly important because search is expected to be one of TrailNote's primary navigation mechanisms.

---

## 31. Mobile UX

On mobile:

- keep the search box large enough for easy tapping,
- suggestions should have generous row heights,
- avoid overly detailed metadata,
- if using a map, consider a bottom sheet for destination content,
- after destination selection, hide the keyboard quickly.

Suggested result:

```text
Ooty
Udhagamandalam, Tamil Nadu
```

is preferable to a long address.

---

## 32. What Not to Build Initially

Do not start with:

- fuzzy-search infrastructure,
- Elasticsearch,
- Algolia,
- PostGIS,
- a complete India destination database,
- complex geospatial indexes,
- AI-based query interpretation,
- typo correction models,
- multilingual semantic search,
- map clustering for thousands of places,
- Redis solely for autocomplete.

The first version should remain:

```text
Geoapify
    +
TrailNote normalization/ranking
    +
simple autocomplete
    +
coordinates
    +
MapLibre if map UI is enabled
```

---

## 33. Suggested MVP Implementation Order

### Phase 1 — Basic search

Implement:

```text
input
debounce
/api/places/search
Geoapify autocomplete
India filter
normalized response
autocomplete dropdown
```

Success condition:

```text
"Hampi" → Hampi, Karnataka
```

---

### Phase 2 — Alias-aware ranking

Implement:

```text
other_names extraction
canonical/alias matching
internal ranking
traveler-friendly display name
```

Success condition:

```text
"Ooty" → Ooty / Udhagamandalam
```

appears before:

```text
Mysore Ooty Highway
```

---

### Phase 3 — Map behavior

Implement:

```text
selected destination
        ↓
lat/lng
        ↓
MapLibre flyTo()
```

Success condition:

```text
Search Hampi
→ select Hampi
→ map smoothly centers on Hampi
```

---

### Phase 4 — TrailNote integration

Implement:

```text
selected destination
        ↓
lookup existing TrailNote place
        ↓
load contributions
```

Persist the destination when TrailNote has community data associated with it.

---

### Phase 5 — Improve relevance using TrailNote data

When enough places exist:

```text
TrailNote destination search
        +
Geoapify fallback
```

Give destinations containing traveler contributions higher prominence.

---

## 34. Test Dataset

Before calling the feature complete, manually test at least these kinds of destinations.

### Alias / alternate-name cases

```text
Ooty
Udhagamandalam

Pondy
Puducherry

Banaras
Varanasi

Cochin
Kochi

Allepey
Alappuzha
```

### Major destinations

```text
Hampi
Badami
Munnar
Varkala
Gokarna
Jaipur
Manali
Varanasi
Rishikesh
Darjeeling
```

### Smaller / less obvious travel destinations

Include destinations from:

```text
Northeast India
Himachal
Uttarakhand
Kerala
Karnataka
Tamil Nadu
Rajasthan
```

The purpose is to verify that optimizing Ooty does not accidentally make common destinations worse.

---

## 35. Acceptance Criteria

The MVP can be considered successful when:

- users can search Indian destinations,
- irrelevant international results do not appear,
- results arrive quickly after a short debounce,
- the UI displays no more than a small number of useful suggestions,
- Ooty correctly resolves to the Udhagamandalam destination,
- exact matches in aliases influence ranking,
- road/highway results do not outrank obvious destination matches,
- selecting a destination yields coordinates,
- map mode can zoom to the selected coordinates,
- TrailNote's frontend does not depend on Geoapify's raw response format,
- the API key is kept server-side,
- stale autocomplete requests cannot overwrite newer results.

---

## 36. Final Recommended Architecture

For the initial TrailNote implementation:

```text
                       ┌──────────────────────────┐
                       │  DestinationSearch UI    │
                       └────────────┬─────────────┘
                                    │
                             query: "ooty"
                                    │
                                    ▼
                       ┌──────────────────────────┐
                       │ /api/places/search       │
                       │ Next.js server route     │
                       └────────────┬─────────────┘
                                    │
                                    ▼
                       ┌──────────────────────────┐
                       │ Geoapify Autocomplete    │
                       │ India-filtered results   │
                       └────────────┬─────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │ TrailNote Search Relevance      │
                    │                                 │
                    │ • normalize                     │
                    │ • extract aliases               │
                    │ • match other_names             │
                    │ • rank cities/localities        │
                    │ • penalize streets/highways     │
                    │ • choose display name           │
                    └───────────────┬─────────────────┘
                                    │
                                    ▼
                         Autocomplete suggestions
                                    │
                         traveler selects place
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
          TrailNote destination                MapLibre map
          + contributions                      flyTo(lng, lat)
```

This preserves the simplicity of using a third-party geocoder while allowing TrailNote to provide search results that make sense specifically to travelers.

---

## 37. Key Decision Summary

The implementation should follow these decisions:

1. **Search remains core even if the map UI changes.**
2. **Use Geoapify as the initial geographic search provider.**
3. **Do not display Geoapify results directly.**
4. **Process and rerank results inside TrailNote.**
5. **Use `other_names` to recognize traveler-known aliases such as Ooty.**
6. **Prefer India destinations and city/locality-style results.**
7. **Use traveler-friendly names in the UI while retaining canonical names internally.**
8. **Use latitude/longitude for map positioning, not destination identity.**
9. **Use a TrailNote `place_id` once a destination becomes part of TrailNote's data.**
10. **Keep the implementation simple enough that the geocoding provider can be replaced later.**

---

## References

- Geoapify Address Autocomplete API:
  https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/

- Geoapify Geocoding API:
  https://apidocs.geoapify.com/docs/geocoding/

- MapLibre GL JS:
  https://maplibre.org/maplibre-gl-js/docs/

- MapLibre `flyTo` example:
  https://maplibre.org/maplibre-gl-js/docs/examples/fly-to-a-location/
