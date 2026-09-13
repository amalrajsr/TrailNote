import "server-only";
import type { Database } from "./client";
import { destinations, destinationAliases } from "./schema";
export const curatedDestinations = [
  {
    slug: "badami",
    name: "Badami",
    state: "Karnataka",
    latitude: 15.9186,
    longitude: 75.6761,
    description:
      "Sandstone caves, lakeside walks and practical tips from the road.",
    aliases: [],
  },
  {
    slug: "hampi",
    name: "Hampi",
    state: "Karnataka",
    latitude: 15.335,
    longitude: 76.46,
    description:
      "Temple ruins and boulder-strewn landscapes along the Tungabhadra.",
    aliases: [],
  },
  {
    slug: "varkala",
    name: "Varkala",
    state: "Kerala",
    latitude: 8.7379,
    longitude: 76.7163,
    description: "Clifftop paths and coastal stays on Kerala’s southern coast.",
    aliases: [],
  },
  {
    slug: "gokarna",
    name: "Gokarna",
    state: "Karnataka",
    latitude: 14.5479,
    longitude: 74.3188,
    description: "A temple town with beaches and coastal walking routes.",
    aliases: [],
  },
  {
    slug: "munnar",
    name: "Munnar",
    state: "Kerala",
    latitude: 10.0889,
    longitude: 77.0595,
    description: "Hill-country journeys through tea-growing landscapes.",
    aliases: [],
  },
  {
    slug: "mysuru",
    name: "Mysuru",
    state: "Karnataka",
    latitude: 12.2958,
    longitude: 76.6394,
    description: "Palaces, markets and everyday discoveries in the city.",
    aliases: ["Mysore"],
  },
];
export async function seedDestinations(db: Database) {
  await db.transaction(async (tx) => {
    for (const d of curatedDestinations) {
      const inserted = await tx
        .insert(destinations)
        .values({
          slug: d.slug,
          name: d.name,
          state: d.state,
          description: d.description,
          normalizedName: d.name.toLowerCase(),
          latitude: d.latitude,
          longitude: d.longitude,
        })
        .onConflictDoUpdate({
          target: destinations.slug,
          set: {
            name: d.name,
            state: d.state,
            description: d.description,
            normalizedName: d.name.toLowerCase(),
            latitude: d.latitude,
            longitude: d.longitude,
          },
        })
        .returning({ id: destinations.id });
      for (const alias of d.aliases)
        await tx
          .insert(destinationAliases)
          .values({
            destinationId: inserted[0].id,
            alias,
            normalizedAlias: alias.toLowerCase(),
          })
          .onConflictDoNothing();
    }
  });
}
