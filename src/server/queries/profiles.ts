import "server-only";

import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import { DomainError } from "../result";
import { cardsForRows } from "./contributions";

const cursorSchema = z.object({
  v: z.literal(1),
  userId: z.uuid(),
  snapshot: z.number().int().positive(),
  created: z.number().int(),
  id: z.uuid(),
});

export async function publicProfile(
  db: Database,
  userId: string,
  cursor?: string,
  now = Date.now(),
) {
  const profile = (
    await db
      .select({
        id: s.profiles.userId,
        displayName: s.profiles.displayName,
        username: s.profiles.username,
        bio: s.profiles.bio,
        instagramUrl: s.profiles.instagramUrl,
        youtubeUrl: s.profiles.youtubeUrl,
        avatarPath: s.uploadAssets.imagekitPath,
        avatarWidth: s.uploadAssets.width,
        avatarHeight: s.uploadAssets.height,
      })
      .from(s.profiles)
      .leftJoin(
        s.uploadAssets,
        and(
          eq(s.uploadAssets.attachedProfileUserId, s.profiles.userId),
          eq(s.uploadAssets.status, "attached"),
        ),
      )
      .where(
        and(eq(s.profiles.userId, userId), eq(s.profiles.status, "active")),
      )
  )[0];
  if (!profile) return null;

  let snapshot = now;
  let after: SQL | undefined;
  if (cursor) {
    try {
      if (cursor.length > 2048) throw Error();
      const data = cursorSchema.parse(
        JSON.parse(Buffer.from(cursor, "base64url").toString()),
      );
      if (
        data.userId !== userId ||
        data.snapshot > now ||
        data.snapshot < now - 86_400_000
      )
        throw Error();
      snapshot = data.snapshot;
      after = sql`(${s.contributions.createdAt},${s.contributions.id}) < (${data.created},${data.id})`;
    } catch {
      throw new DomainError(
        "VALIDATION",
        "This profile page link expired or is invalid.",
      );
    }
  }

  const rows = await db
    .select({ tip: s.contributions })
    .from(s.contributions)
    .innerJoin(
      s.destinations,
      and(
        eq(s.destinations.id, s.contributions.destinationId),
        eq(s.destinations.enabled, true),
      ),
    )
    .where(
      and(
        eq(s.contributions.authorId, userId),
        eq(s.contributions.status, "published"),
        sql`${s.contributions.createdAt} <= ${snapshot}`,
        after,
      ),
    )
    .orderBy(desc(s.contributions.createdAt), desc(s.contributions.id))
    .limit(13);
  const selected = rows.slice(0, 12);
  const cards = await cardsForRows(
    db,
    selected.map(({ tip }) => tip),
  );
  const last = selected.at(-1)?.tip;
  const nextCursor =
    rows.length > 12 && last
      ? Buffer.from(
          JSON.stringify({
            v: 1,
            userId,
            snapshot,
            created: last.createdAt,
            id: last.id,
          }),
        ).toString("base64url")
      : null;
  return {
    id: profile.id,
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    instagramUrl: profile.instagramUrl,
    youtubeUrl: profile.youtubeUrl,
    avatar:
      profile.avatarPath && profile.avatarWidth && profile.avatarHeight
        ? {
            path: profile.avatarPath,
            width: profile.avatarWidth,
            height: profile.avatarHeight,
          }
        : null,
    cards,
    nextCursor,
  };
}
