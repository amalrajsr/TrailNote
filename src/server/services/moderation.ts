import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database, Transaction } from "../../db/client";
import * as s from "../../db/schema";
import { DomainError } from "../result";
import { activeProfile } from "./contributions";

const reason = z.string().trim().min(1).max(1000);

async function moderator(db: Database | Transaction, userId: string) {
  const profile = await activeProfile(db, userId);
  if (profile.role !== "moderator")
    throw new DomainError("FORBIDDEN", "Moderator access is required.");
}

export async function moderationQueues(db: Database, userId: string) {
  await moderator(db, userId);
  const [contributions, contacts] = await Promise.all([
    db
      .select({
        id: s.reports.id,
        contributionId: s.reports.contributionId,
        revision: s.reports.contributionRevision,
        reason: s.reports.reason,
        details: s.reports.details,
        createdAt: s.reports.createdAt,
        status: s.reports.status,
        body: s.contributions.body,
        destination: s.destinations.name,
      })
      .from(s.reports)
      .innerJoin(
        s.contributions,
        eq(s.contributions.id, s.reports.contributionId),
      )
      .innerJoin(
        s.destinations,
        eq(s.destinations.id, s.contributions.destinationId),
      )
      .where(eq(s.reports.status, "open"))
      .orderBy(s.reports.createdAt),
    db
      .select({
        id: s.contactRemovalRequests.id,
        contributionId: s.contactRemovalRequests.contributionId,
        contactId: s.contactRemovalRequests.contactId,
        requestText: s.contactRemovalRequests.requestText,
        createdAt: s.contactRemovalRequests.createdAt,
        status: s.contactRemovalRequests.status,
        body: s.contributions.body,
        destination: s.destinations.name,
      })
      .from(s.contactRemovalRequests)
      .innerJoin(
        s.contributions,
        eq(s.contributions.id, s.contactRemovalRequests.contributionId),
      )
      .innerJoin(
        s.destinations,
        eq(s.destinations.id, s.contributions.destinationId),
      )
      .where(eq(s.contactRemovalRequests.status, "open"))
      .orderBy(s.contactRemovalRequests.createdAt),
  ]);
  return { contributions, contacts };
}

export async function resolveReport(
  db: Database,
  userId: string,
  raw: unknown,
  now = Date.now(),
) {
  const input = z
    .object({
      reportId: z.uuid(),
      disposition: z.enum(["hide", "dismiss"]),
      reason,
    })
    .parse(raw);
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const [report] = await tx
      .select()
      .from(s.reports)
      .where(eq(s.reports.id, input.reportId));
    if (!report)
      throw new DomainError("NOT_FOUND", "This report is unavailable.");
    if (report.status !== "open")
      throw new DomainError("CONFLICT", "This report was already reviewed.");
    if (input.disposition === "hide")
      await tx
        .update(s.contributions)
        .set({ status: "hidden", updatedAt: now })
        .where(eq(s.contributions.id, report.contributionId));
    await tx
      .update(s.reports)
      .set({
        status: input.disposition === "hide" ? "resolved" : "dismissed",
        resolutionNote: input.reason,
        moderatorId: userId,
        resolvedAt: now,
      })
      .where(
        and(eq(s.reports.id, input.reportId), eq(s.reports.status, "open")),
      );
    await tx.insert(s.moderationEvents).values({
      moderatorId: userId,
      targetType: "contribution",
      targetId: report.contributionId,
      action: input.disposition === "hide" ? "hide" : "dismiss",
      reason: input.reason,
      createdAt: now,
    });
    return { id: report.contributionId };
  });
}

export async function resolveContactRemoval(
  db: Database,
  userId: string,
  raw: unknown,
  now = Date.now(),
) {
  const input = z
    .object({
      requestId: z.uuid(),
      disposition: z.enum(["hide", "dismiss"]),
      reason,
    })
    .parse(raw);
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const [request] = await tx
      .select()
      .from(s.contactRemovalRequests)
      .where(eq(s.contactRemovalRequests.id, input.requestId));
    if (!request)
      throw new DomainError("NOT_FOUND", "This request is unavailable.");
    if (request.status !== "open")
      throw new DomainError("CONFLICT", "This request was already reviewed.");
    if (input.disposition === "hide")
      await tx
        .update(s.contacts)
        .set({ status: "hidden", updatedAt: now })
        .where(eq(s.contacts.id, request.contactId));
    await tx
      .update(s.contactRemovalRequests)
      .set({
        status: input.disposition === "hide" ? "resolved" : "dismissed",
        resolutionNote: input.reason,
        moderatorId: userId,
        resolvedAt: now,
      })
      .where(
        and(
          eq(s.contactRemovalRequests.id, input.requestId),
          eq(s.contactRemovalRequests.status, "open"),
        ),
      );
    await tx.insert(s.moderationEvents).values({
      moderatorId: userId,
      targetType: "contact",
      targetId: request.contactId,
      action: input.disposition === "hide" ? "hide" : "dismiss",
      reason: input.reason,
      createdAt: now,
    });
    return { id: request.contactId };
  });
}

export async function setContributionVisibility(
  db: Database,
  userId: string,
  id: string,
  status: "hidden" | "published",
  rawReason: string,
  now = Date.now(),
) {
  const actionReason = reason.parse(rawReason);
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const [tip] = await tx
      .select()
      .from(s.contributions)
      .where(eq(s.contributions.id, id));
    if (!tip) throw new DomainError("NOT_FOUND", "This tip is unavailable.");
    await tx
      .update(s.contributions)
      .set({ status, updatedAt: now })
      .where(eq(s.contributions.id, id));
    await tx.insert(s.moderationEvents).values({
      moderatorId: userId,
      targetType: "contribution",
      targetId: id,
      action: status === "hidden" ? "hide" : "restore",
      reason: actionReason,
      createdAt: now,
    });
    return { id, status };
  });
}

export async function setAccountStatus(
  db: Database,
  userId: string,
  targetUserId: string,
  status: "active" | "suspended",
  rawReason: string,
  now = Date.now(),
) {
  const actionReason = reason.parse(rawReason);
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const changed = await tx
      .update(s.profiles)
      .set({ status, updatedAt: now })
      .where(eq(s.profiles.userId, targetUserId))
      .returning({ id: s.profiles.userId });
    if (!changed.length)
      throw new DomainError("NOT_FOUND", "This account is unavailable.");
    await tx.insert(s.moderationEvents).values({
      moderatorId: userId,
      targetType: "account",
      targetId: targetUserId,
      action: status === "suspended" ? "suspend" : "restore",
      reason: actionReason,
      createdAt: now,
    });
    return { id: targetUserId, status };
  });
}
