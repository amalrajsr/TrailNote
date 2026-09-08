import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db/client";
import * as s from "../../db/schema";
import { DomainError } from "../result";
import { activeProfile, visibleContribution } from "./contributions";

const reportInput = z.object({
  id: z.uuid(),
  revision: z.number().int().positive(),
  reason: z.enum([
    "spam",
    "inaccurate",
    "unsafe",
    "private_information",
    "other",
  ]),
  details: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
});

const removalInput = z.object({
  contributionId: z.uuid(),
  contactId: z.uuid(),
  requestText: z.string().trim().min(10).max(1000),
  replyEmail: z.string().trim().email().max(254).or(z.literal("")),
  honeypot: z.string().max(0),
});

export async function reportContribution(
  db: Database,
  userId: string,
  raw: unknown,
  now = Date.now(),
) {
  const input = reportInput.parse(raw);
  return db.transaction(async (tx) => {
    await activeProfile(tx, userId);
    const tip = await visibleContribution(tx, input.id);
    if (tip.revision !== input.revision)
      throw new DomainError(
        "CONFLICT",
        "This tip changed. Review the latest version first.",
      );
    await tx
      .insert(s.reports)
      .values({
        contributionId: input.id,
        contributionRevision: input.revision,
        reporterId: userId,
        reason: input.reason,
        details: input.details,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [
          s.reports.contributionId,
          s.reports.contributionRevision,
          s.reports.reporterId,
        ],
        set: {
          reason: input.reason,
          details: input.details,
          status: "open",
          resolutionNote: null,
          moderatorId: null,
          resolvedAt: null,
        },
      });
    return { id: input.id };
  });
}

export async function submitContactRemoval(
  db: Database,
  raw: unknown,
  now = Date.now(),
) {
  const input = removalInput.parse(raw);
  const contact = (
    await db
      .select({ id: s.contacts.id })
      .from(s.contacts)
      .innerJoin(
        s.contributions,
        eq(s.contributions.id, s.contacts.contributionId),
      )
      .where(
        and(
          eq(s.contacts.id, input.contactId),
          eq(s.contacts.contributionId, input.contributionId),
          eq(s.contacts.status, "visible"),
          eq(s.contributions.status, "published"),
        ),
      )
  )[0];
  if (!contact)
    throw new DomainError("NOT_FOUND", "This contact is no longer available.");
  const [request] = await db
    .insert(s.contactRemovalRequests)
    .values({
      contributionId: input.contributionId,
      contactId: input.contactId,
      requestText: input.requestText,
      replyEmail: input.replyEmail || null,
      createdAt: now,
    })
    .returning({ id: s.contactRemovalRequests.id });
  return request;
}
