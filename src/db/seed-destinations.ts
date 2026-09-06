import "server-only";
import type { Database } from "./client";
import { destinations, destinationAliases } from "./schema";
export const curatedDestinations = [
  {
    slug: "badami",
    name: "Badami",
    state: "Karnataka",
    description:
      "Sandstone caves, lakeside walks and practical tips from the road.",
    aliases: [],
  },
  {
    slug: "hampi",
    name: "Hampi",
    state: "Karnataka",
    description:
      "Temple ruins and boulder-strewn landscapes along the Tungabhadra.",
    aliases: [],
  },
  {
    slug: "varkala",
    name: "Varkala",
    state: "Kerala",
    description: "Clifftop paths and coastal stays on Kerala’s southern coast.",
    aliases: [],
  },
  {
    slug: "gokarna",
    name: "Gokarna",
    state: "Karnataka",
    description: "A temple town with beaches and coastal walking routes.",
    aliases: [],
  },
  {
    slug: "munnar",
    name: "Munnar",
    state: "Kerala",
    description: "Hill-country journeys through tea-growing landscapes.",
    aliases: [],
  },
  {
    slug: "mysuru",
    name: "Mysuru",
    state: "Karnataka",
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
        })
        .onConflictDoUpdate({
          target: destinations.slug,
          set: {
            name: d.name,
            state: d.state,
            description: d.description,
            normalizedName: d.name.toLowerCase(),
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
