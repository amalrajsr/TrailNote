import "server-only";

import { and, desc, eq } from "drizzle-orm";
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
  const [contributions, contacts, events] = await Promise.all([
    db
      .select({
        id: s.reports.id,
        contributionId: s.reports.contributionId,
        revision: s.reports.contributionRevision,
        reason: s.reports.reason,
        details: s.reports.details,
        createdAt: s.reports.createdAt,
        status: s.reports.status,
        resolutionNote: s.reports.resolutionNote,
        resolvedAt: s.reports.resolvedAt,
        body: s.contributions.body,
        destination: s.destinations.name,
        contributionStatus: s.contributions.status,
        authorId: s.contributions.authorId,
        authorName: s.profiles.displayName,
        authorStatus: s.profiles.status,
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
      .innerJoin(s.profiles, eq(s.profiles.userId, s.contributions.authorId))
      .orderBy(desc(s.reports.createdAt)),
    db
      .select({
        id: s.contactRemovalRequests.id,
        contributionId: s.contactRemovalRequests.contributionId,
        contactId: s.contactRemovalRequests.contactId,
        requestText: s.contactRemovalRequests.requestText,
        createdAt: s.contactRemovalRequests.createdAt,
        status: s.contactRemovalRequests.status,
        resolutionNote: s.contactRemovalRequests.resolutionNote,
        resolvedAt: s.contactRemovalRequests.resolvedAt,
        body: s.contributions.body,
        destination: s.destinations.name,
        contactStatus: s.contacts.status,
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
      .innerJoin(
        s.contacts,
        eq(s.contacts.id, s.contactRemovalRequests.contactId),
      )
      .orderBy(desc(s.contactRemovalRequests.createdAt)),
    db
      .select({
        targetType: s.moderationEvents.targetType,
        targetId: s.moderationEvents.targetId,
        action: s.moderationEvents.action,
        reason: s.moderationEvents.reason,
        createdAt: s.moderationEvents.createdAt,
      })
      .from(s.moderationEvents)
      .orderBy(desc(s.moderationEvents.createdAt))
      .limit(100),
  ]);
  return { contributions, contacts, events };
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
      expectedStatus: z.literal("open"),
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
    if (report.status !== input.expectedStatus)
      throw new DomainError("CONFLICT", "This report was already reviewed.");
    if (input.disposition === "hide")
      await tx
        .update(s.contributions)
        .set({ status: "hidden", updatedAt: now })
        .where(eq(s.contributions.id, report.contributionId));
    const changed = await tx
      .update(s.reports)
      .set({
        status: input.disposition === "hide" ? "resolved" : "dismissed",
        resolutionNote: input.reason,
        moderatorId: userId,
        resolvedAt: now,
      })
      .where(
        and(
          eq(s.reports.id, input.reportId),
          eq(s.reports.status, input.expectedStatus),
        ),
      )
      .returning({ id: s.reports.id });
    if (!changed.length)
      throw new DomainError("CONFLICT", "This report was already reviewed.");
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
      expectedStatus: z.literal("open"),
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
    if (request.status !== input.expectedStatus)
      throw new DomainError("CONFLICT", "This request was already reviewed.");
    if (input.disposition === "hide")
      await tx
        .update(s.contacts)
        .set({ status: "hidden", updatedAt: now })
        .where(eq(s.contacts.id, request.contactId));
    const changed = await tx
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
          eq(s.contactRemovalRequests.status, input.expectedStatus),
        ),
      )
      .returning({ id: s.contactRemovalRequests.id });
    if (!changed.length)
      throw new DomainError("CONFLICT", "This request was already reviewed.");
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
  expectedStatus: "hidden" | "published",
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
    if (tip.status !== expectedStatus)
      throw new DomainError(
        "CONFLICT",
        "This tip's status changed. Refresh and try again.",
      );
    const changed = await tx
      .update(s.contributions)
      .set({ status, updatedAt: now })
      .where(
        and(
          eq(s.contributions.id, id),
          eq(s.contributions.status, expectedStatus),
        ),
      )
      .returning({ id: s.contributions.id });
    if (!changed.length)
      throw new DomainError(
        "CONFLICT",
        "This tip's status changed. Refresh and try again.",
      );
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
  expectedStatus: "active" | "suspended",
  status: "active" | "suspended",
  rawReason: string,
  now = Date.now(),
) {
  const actionReason = reason.parse(rawReason);
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const [profile] = await tx
      .select({ status: s.profiles.status })
      .from(s.profiles)
      .where(eq(s.profiles.userId, targetUserId));
    if (!profile)
      throw new DomainError("NOT_FOUND", "This account is unavailable.");
    if (profile.status !== expectedStatus)
      throw new DomainError(
        "CONFLICT",
        "This account's status changed. Refresh and try again.",
      );
    const changed = await tx
      .update(s.profiles)
      .set({ status, updatedAt: now })
      .where(
        and(
          eq(s.profiles.userId, targetUserId),
          eq(s.profiles.status, expectedStatus),
        ),
      )
      .returning({ id: s.profiles.userId });
    if (!changed.length)
      throw new DomainError(
        "CONFLICT",
        "This account's status changed. Refresh and try again.",
      );
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
