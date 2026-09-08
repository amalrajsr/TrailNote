import "server-only";
import { eq } from "drizzle-orm";
import type { Database } from "./client";
import {
  user,
  profiles,
  destinations,
  contributions,
  contributionRevisions,
  confirmations,
  contacts,
  uploadAssets,
  session,
} from "./schema";
import { seedDestinations } from "./seed-destinations";
import { categories, type Category, type PriceUnit } from "../lib/constants";

export const fixtureClock = new Date("2026-09-06T06:30:00Z");
export const fixtureId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const fixtureSessionToken = "fieldnotes-development-observer-session";
export const fixtureNewObserverSessionToken =
  "fieldnotes-development-new-observer-session";
export function assertDevelopmentSeed(appEnv: string, url: string) {
  if (!["development", "test"].includes(appEnv) || !url.startsWith("file:"))
    throw new Error(
      "Development seed requires APP_ENV=development/test and a local file database.",
    );
}

export async function seedDevelopment(
  db: Database,
  appEnv: string,
  url: string,
) {
  assertDevelopmentSeed(appEnv, url);
  await seedDestinations(db);
  await db.transaction(async (tx) => {
    for (let i = 1; i <= 10; i++) {
      const displayName =
        ["Ananya", "Rohan", "Meera"][i - 1] ?? `Observer ${i - 3}`;
      await tx
        .insert(user)
        .values({
          id: fixtureId(i),
          name: `${displayName} (fictional)`,
          email: `fixture-${i}@example.invalid`,
          createdAt: fixtureClock,
          updatedAt: fixtureClock,
        })
        .onConflictDoNothing();
      await tx
        .insert(profiles)
        .values({
          userId: fixtureId(i),
          displayName: `${displayName} (fictional)`,
          createdAt: +fixtureClock,
          updatedAt: +fixtureClock,
        })
        .onConflictDoNothing();
    }
    await tx
      .insert(session)
      .values({
        id: fixtureId(50),
        token: fixtureSessionToken,
        userId: fixtureId(4),
        expiresAt: new Date(+fixtureClock + 365 * 86400000),
        createdAt: fixtureClock,
        updatedAt: fixtureClock,
      })
      .onConflictDoNothing();
    await tx
      .insert(session)
      .values({
        id: fixtureId(51),
        token: fixtureNewObserverSessionToken,
        userId: fixtureId(1),
        expiresAt: new Date(+fixtureClock + 365 * 86400000),
        createdAt: fixtureClock,
        updatedAt: fixtureClock,
      })
      .onConflictDoNothing();
    const badami = (
      await tx
        .select()
        .from(destinations)
        .where(eq(destinations.slug, "badami"))
    )[0];
    const examples: Array<{
      category: Category;
      body: string;
      placeName?: string;
      pricePaise?: number;
      priceUnit?: PriceUnit;
      fromName?: string;
      toName?: string;
      transportMode?: "bus";
      durationMinutes?: number;
      walkMinutes?: number;
    }> = [
      {
        category: "stay",
        placeName: "ABC Lodge",
        pricePaise: 65000,
        priceUnit: "room_night",
        body: "Fictional development example: paid ₹650 for a private room. Calling directly was useful; ask about hot water before booking.",
      },
      {
        category: "food",
        placeName: "Krishna Bhavan",
        pricePaise: 9000,
        priceUnit: "meal",
        body: "Fictional development example: a filling lunch meal cost ₹90. We went just before the midday rush.",
      },
      {
        category: "transport",
        fromName: "Badami",
        toName: "Pattadakal",
        transportMode: "bus",
        durationMinutes: 40,
        pricePaise: 3500,
        priceUnit: "person_trip",
        body: "Fictional development example: the local bus cost ₹35 per person. Ask at the bus stand which platform serves Pattadakal.",
      },
      {
        category: "explore",
        placeName: "Lakeside viewpoint",
        pricePaise: 0,
        priceUnit: "entry_person",
        walkMinutes: 20,
        body: "Fictional development example: the viewpoint was free to enter. Allow twenty minutes for the walk and carry water.",
      },
      {
        category: "transport",
        pricePaise: 80000,
        priceUnit: "vehicle_trip",
        body: "Fictional development example: the auto fare was ₹800 for the whole vehicle, not per person. Agree on stops before leaving.",
      },
    ];
    for (let i = 0; i < 18; i++) {
      const e = examples[i] ?? {
        category: categories[i % 5],
        body: `Fictional development example ${i + 1}: carry drinking water and ask locally about opening hours before making the journey.${i === 7 ? " Leave time for a slow walk and an unhurried lunch.".repeat(10) : ""}`,
      };
      const contributionId = fixtureId(100 + i),
        authorId = fixtureId((i % 3) + 1);
      const content = {
        category: e.category,
        body: e.body,
        visitedMonth: i === 6 ? null : i === 8 ? "2025-01" : "2026-08",
        pricePaise: e.pricePaise ?? null,
        priceUnit: e.priceUnit ?? null,
        priceUnitLabel: null,
        placeName: e.placeName ?? null,
        fromName: e.fromName ?? null,
        toName: e.toName ?? null,
        transportMode: e.transportMode ?? null,
        durationMinutes: e.durationMinutes ?? null,
        walkMinutes: e.walkMinutes ?? null,
      };
      await tx
        .insert(contributions)
        .values({
          id: contributionId,
          destinationId: badami.id,
          authorId,
          ...content,
          revision: i === 9 ? 2 : 1,
          status: i === 17 ? "hidden" : "published",
          clientMutationId: fixtureId(300 + i),
          initialPayloadDigest: `fixture-${i}`,
          createdAt: +fixtureClock - i * 3600000,
          updatedAt: +fixtureClock,
        })
        .onConflictDoNothing();
      await tx
        .insert(contributionRevisions)
        .values({
          contributionId,
          revision: 1,
          editorId: authorId,
          snapshotJson: JSON.stringify(content),
          createdAt: +fixtureClock - i * 3600000,
        })
        .onConflictDoNothing();
      if (i === 9) {
        await tx
          .insert(contributionRevisions)
          .values({
            contributionId,
            revision: 2,
            editorId: authorId,
            snapshotJson: JSON.stringify(content),
            createdAt: +fixtureClock,
          })
          .onConflictDoNothing();
        await tx
          .insert(confirmations)
          .values({
            contributionId,
            revision: 1,
            userId: fixtureId(4),
            visitedMonth: "2026-09",
          })
          .onConflictDoNothing();
      }
    }
    for (let i = 4; i <= 10; i++)
      await tx
        .insert(confirmations)
        .values({
          contributionId: fixtureId(102),
          revision: 1,
          userId: fixtureId(i),
          visitedMonth: "2026-09",
          createdAt: +fixtureClock,
          updatedAt: +fixtureClock,
        })
        .onConflictDoNothing();
    const updated = {
      category: "transport" as const,
      body: "Fictional development update: I paid ₹40 for the same local bus trip in September. Please check the fare before travelling.",
      visitedMonth: "2026-09",
      pricePaise: 4000,
      priceUnit: "person_trip" as const,
    };
    await tx
      .insert(contributions)
      .values({
        id: fixtureId(200),
        destinationId: badami.id,
        authorId: fixtureId(2),
        ...updated,
        parentContributionId: fixtureId(102),
        parentRevision: 1,
        clientMutationId: fixtureId(400),
        initialPayloadDigest: "fixture-update",
        createdAt: +fixtureClock,
        updatedAt: +fixtureClock,
      })
      .onConflictDoNothing();
    await tx
      .insert(contributionRevisions)
      .values({
        contributionId: fixtureId(200),
        revision: 1,
        editorId: fixtureId(2),
        snapshotJson: JSON.stringify(updated),
        createdAt: +fixtureClock,
      })
      .onConflictDoNothing();
    await tx
      .insert(contacts)
      .values({
        id: fixtureId(500),
        contributionId: fixtureId(100),
        phoneE164: "+919000000000",
        status: "hidden",
      })
      .onConflictDoNothing();
    await tx
      .insert(uploadAssets)
      .values({
        id: fixtureId(600),
        ownerId: fixtureId(1),
        uploadRequestId: fixtureId(601),
        slot: 0,
        attempt: 1,
        status: "rejected",
        sourceDigest: "fixture-corrupt",
        errorCode: "INVALID_IMAGE",
        expiresAt: +fixtureClock,
      })
      .onConflictDoNothing();
    // Unattached test asset; never displayed or treated as a real ImageKit upload.
    await tx
      .insert(uploadAssets)
      .values({
        id: fixtureId(602),
        ownerId: fixtureId(1),
        uploadRequestId: fixtureId(603),
        slot: 0,
        attempt: 1,
        status: "ready",
        sourceDigest: "fixture-ready",
        byteSize: 1000,
        width: 100,
        height: 100,
        format: "webp",
        imagekitFileId: "fixture-not-remote",
        imagekitPath: "/fixture-only.webp",
        expiresAt: +fixtureClock + 86400000,
      })
      .onConflictDoNothing();
  });
}
