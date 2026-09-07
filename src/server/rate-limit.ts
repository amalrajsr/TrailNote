import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { rateLimitBuckets } from "../db/schema";
import { DomainError } from "./result";

export async function consumeRateLimit(
  db: Database,
  keyHash: string,
  action: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  await db
    .insert(rateLimitBuckets)
    .values({ keyHash, action, windowStart, count: 1, expiresAt: windowStart + windowMs * 2 })
    .onConflictDoUpdate({
      target: [rateLimitBuckets.keyHash, rateLimitBuckets.action, rateLimitBuckets.windowStart],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    });
  const bucket = (
    await db
      .select({ count: rateLimitBuckets.count })
      .from(rateLimitBuckets)
      .where(and(eq(rateLimitBuckets.keyHash, keyHash), eq(rateLimitBuckets.action, action), eq(rateLimitBuckets.windowStart, windowStart)))
  )[0];
  if (!bucket || bucket.count > limit) {
    const error = new DomainError("RATE_LIMITED", "You have reached the temporary limit. Try again shortly.") as DomainError & { retryAfterSeconds?: number };
    error.retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
    throw error;
  }
  return { remaining: limit - bucket.count };
}
