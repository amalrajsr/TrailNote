import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database, Transaction } from "../../db/client";
import * as s from "../../db/schema";
import {
  profileInput,
  usernameCandidates,
  type ProfileInput,
} from "../../lib/validation/profile";
import { DomainError } from "../result";
import { enqueueAssetDelete } from "./uploads";

async function reserveUsername(
  tx: Transaction,
  userId: string,
  username: string,
  now: number,
) {
  const existing = (
    await tx
      .select({ userId: s.usernameClaims.userId })
      .from(s.usernameClaims)
      .where(eq(s.usernameClaims.username, username))
  )[0];
  if (existing) return existing.userId === userId;
  const inserted = await tx
    .insert(s.usernameClaims)
    .values({ username, userId, createdAt: now })
    .onConflictDoNothing()
    .returning({ username: s.usernameClaims.username });
  if (inserted.length === 1) return true;
  const winner = (
    await tx
      .select({ userId: s.usernameClaims.userId })
      .from(s.usernameClaims)
      .where(eq(s.usernameClaims.username, username))
  )[0];
  return winner?.userId === userId;
}

export async function createProfile(
  db: Database,
  userId: string,
  providerName: string,
  now = Date.now(),
) {
  const existing = (
    await db.select().from(s.profiles).where(eq(s.profiles.userId, userId))
  )[0];
  if (existing) return existing;
  const displayName = providerName.trim().split(/\s+/)[0] || "Traveller";
  for (const username of usernameCandidates(displayName, userId)) {
    const created = await db.transaction(async (tx) => {
      if (!(await reserveUsername(tx, userId, username, now))) return null;
      const inserted = await tx
        .insert(s.profiles)
        .values({
          userId,
          displayName,
          username,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();
      if (inserted[0]) return inserted[0];
      return (
        await tx.select().from(s.profiles).where(eq(s.profiles.userId, userId))
      )[0];
    });
    if (created) return created;
  }
  throw new Error("PROFILE_USERNAME_ALLOCATION_FAILED");
}

export async function updateProfile(
  db: Database,
  userId: string,
  raw: ProfileInput,
  now = Date.now(),
) {
  const input = profileInput.parse(raw);
  return db.transaction(async (tx) => {
    const profile = (
      await tx.select().from(s.profiles).where(eq(s.profiles.userId, userId))
    )[0];
    if (!profile || profile.status !== "active")
      throw new DomainError("FORBIDDEN", "This profile cannot be updated.");
    if (!(await reserveUsername(tx, userId, input.username, now)))
      throw new DomainError("CONFLICT", "That username is taken.");

    const currentAvatar = (
      await tx
        .select()
        .from(s.uploadAssets)
        .where(
          and(
            eq(s.uploadAssets.attachedProfileUserId, userId),
            eq(s.uploadAssets.status, "attached"),
          ),
        )
    )[0];

    if (input.avatarIntent === "replace") {
      if (!input.avatarId)
        throw new DomainError("VALIDATION", "Choose a profile image.");
      if (currentAvatar?.id !== input.avatarId) {
        if (currentAvatar) {
          await tx
            .update(s.uploadAssets)
            .set({
              status: "deleting",
              attachedProfileUserId: null,
              updatedAt: now,
            })
            .where(eq(s.uploadAssets.id, currentAvatar.id));
          await enqueueAssetDelete(
            tx,
            currentAvatar.id,
            "profile_replaced",
            now,
          );
        }
        const attached = await tx
          .update(s.uploadAssets)
          .set({
            status: "attached",
            attachedProfileUserId: userId,
            updatedAt: now,
          })
          .where(
            and(
              eq(s.uploadAssets.id, input.avatarId),
              eq(s.uploadAssets.ownerId, userId),
              eq(s.uploadAssets.status, "ready"),
              gt(s.uploadAssets.expiresAt, now),
              isNull(s.uploadAssets.attachedContributionId),
              isNull(s.uploadAssets.attachedProfileUserId),
            ),
          )
          .returning({ id: s.uploadAssets.id });
        if (!attached.length)
          throw new DomainError(
            "VALIDATION",
            "That profile image is unavailable. Upload it again.",
          );
      }
    } else if (input.avatarIntent === "remove" && currentAvatar) {
      await tx
        .update(s.uploadAssets)
        .set({
          status: "deleting",
          attachedProfileUserId: null,
          updatedAt: now,
        })
        .where(eq(s.uploadAssets.id, currentAvatar.id));
      await enqueueAssetDelete(tx, currentAvatar.id, "profile_removed", now);
    }

    const [updated] = await tx
      .update(s.profiles)
      .set({
        displayName: input.displayName,
        username: input.username,
        updatedAt: now,
      })
      .where(eq(s.profiles.userId, userId))
      .returning();
    return updated!;
  });
}
