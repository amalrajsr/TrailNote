import "server-only";

import { and, desc, eq, like, or, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
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
      .orderBy(desc(s.reports.createdAt))
      .limit(25),
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
      .orderBy(desc(s.contactRemovalRequests.createdAt))
      .limit(25),
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
      .limit(25),
  ]);
  return { contributions, contacts, events };
}

const pageSize = 25;
const moderationQuery = z.object({
  section: z.enum(["reports", "users", "tips"]).default("reports"),
  type: z.enum(["all", "tip", "contact"]).default("all"),
  q: z.string().trim().max(200).default(""),
  status: z.enum(["all", "open", "resolved", "dismissed", "active", "blocked", "published", "hidden"]).default("all"),
  from: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine((value) => !value || Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))).default(""),
  to: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/).refine((value) => !value || Number.isFinite(Date.parse(`${value}T00:00:00.000Z`))).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

function dateWhere(column: AnySQLiteColumn, from: string, to: string) {
  return and(
    from ? sql`${column} >= ${Date.parse(`${from}T00:00:00.000Z`)}` : undefined,
    to ? sql`${column} <= ${Date.parse(`${to}T23:59:59.999Z`)}` : undefined,
  );
}

export async function moderationDashboard(
  db: Database,
  userId: string,
  raw: unknown = {},
) {
  await moderator(db, userId);
  const parsed = moderationQuery.safeParse(raw);
  if (!parsed.success)
    throw new DomainError("VALIDATION", "One or more moderation filters are invalid.");
  const input = parsed.data;
  const offset = (input.page - 1) * pageSize;
  const search = input.q ? `%${input.q}%` : undefined;
  const reportStatus = ["all", "open", "resolved", "dismissed"].includes(input.status)
    ? input.status
    : "all";
  const statusWhere = (column: AnySQLiteColumn) =>
    reportStatus === "all" ? undefined : eq(column, reportStatus);

  if (input.section === "users") {
    const status = input.status === "blocked" ? "suspended" : input.status === "active" ? "active" : undefined;
    const rows = await db
      .select({ id: s.profiles.userId, displayName: s.profiles.displayName, username: s.profiles.username, email: s.user.email, status: s.profiles.status, createdAt: s.profiles.createdAt })
      .from(s.profiles)
      .innerJoin(s.user, eq(s.user.id, s.profiles.userId))
      .where(and(eq(s.profiles.role, "traveler"), status ? eq(s.profiles.status, status) : undefined, search ? or(like(s.profiles.displayName, search), like(s.profiles.username, search), like(s.user.email, search)) : undefined, dateWhere(s.profiles.createdAt, input.from, input.to)))
      .orderBy(desc(s.profiles.createdAt), desc(s.profiles.userId))
      .limit(pageSize + 1)
      .offset(offset);
    return { ...input, users: rows.slice(0, pageSize), tips: [], contributions: [], contacts: [], events: [], hasPrevious: input.page > 1, hasNext: rows.length > pageSize };
  }

  if (input.section === "tips") {
    const tipStatus = input.status === "published" || input.status === "hidden" ? input.status : undefined;
    const rows = await db
      .select({ id: s.contributions.id, body: s.contributions.body, destination: s.destinations.name, authorId: s.contributions.authorId, authorName: s.profiles.displayName, authorUsername: s.profiles.username, status: s.contributions.status, createdAt: s.contributions.createdAt })
      .from(s.contributions)
      .innerJoin(s.destinations, eq(s.destinations.id, s.contributions.destinationId))
      .innerJoin(s.profiles, eq(s.profiles.userId, s.contributions.authorId))
      .where(and(sql`${s.contributions.status} <> 'deleted'`, tipStatus ? eq(s.contributions.status, tipStatus) : undefined, search ? or(like(s.contributions.body, search), like(s.destinations.name, search), like(s.profiles.displayName, search), like(s.profiles.username, search), eq(s.contributions.id, input.q)) : undefined, dateWhere(s.contributions.createdAt, input.from, input.to)))
      .orderBy(desc(s.contributions.createdAt), desc(s.contributions.id))
      .limit(pageSize + 1)
      .offset(offset);
    const events = await db.select({ targetType: s.moderationEvents.targetType, targetId: s.moderationEvents.targetId, action: s.moderationEvents.action, reason: s.moderationEvents.reason, createdAt: s.moderationEvents.createdAt }).from(s.moderationEvents).where(rows.length ? or(...rows.slice(0, pageSize).map((row) => eq(s.moderationEvents.targetId, row.id))) : sql`0`).orderBy(desc(s.moderationEvents.createdAt));
    return { ...input, users: [], tips: rows.slice(0, pageSize), contributions: [], contacts: [], events, hasPrevious: input.page > 1, hasNext: rows.length > pageSize };
  }

  const reportLimit = offset + pageSize + 1;
  const contributionRows = input.type === "contact" ? [] : await db.select({ id: s.reports.id, contributionId: s.reports.contributionId, revision: s.reports.contributionRevision, reason: s.reports.reason, details: s.reports.details, createdAt: s.reports.createdAt, status: s.reports.status, resolutionNote: s.reports.resolutionNote, resolvedAt: s.reports.resolvedAt, body: s.contributions.body, destination: s.destinations.name, contributionStatus: s.contributions.status, authorId: s.contributions.authorId, authorName: s.profiles.displayName, authorStatus: s.profiles.status }).from(s.reports).innerJoin(s.contributions, eq(s.contributions.id, s.reports.contributionId)).innerJoin(s.destinations, eq(s.destinations.id, s.contributions.destinationId)).innerJoin(s.profiles, eq(s.profiles.userId, s.contributions.authorId)).where(and(statusWhere(s.reports.status), search ? or(like(s.reports.reason, search), like(s.reports.details, search), like(s.contributions.body, search), like(s.destinations.name, search)) : undefined, dateWhere(s.reports.createdAt, input.from, input.to))).orderBy(desc(s.reports.createdAt)).limit(reportLimit);
  const contactRows = input.type === "tip" ? [] : await db.select({ id: s.contactRemovalRequests.id, contributionId: s.contactRemovalRequests.contributionId, contactId: s.contactRemovalRequests.contactId, requestText: s.contactRemovalRequests.requestText, createdAt: s.contactRemovalRequests.createdAt, status: s.contactRemovalRequests.status, resolutionNote: s.contactRemovalRequests.resolutionNote, resolvedAt: s.contactRemovalRequests.resolvedAt, body: s.contributions.body, destination: s.destinations.name, contactStatus: s.contacts.status }).from(s.contactRemovalRequests).innerJoin(s.contributions, eq(s.contributions.id, s.contactRemovalRequests.contributionId)).innerJoin(s.destinations, eq(s.destinations.id, s.contributions.destinationId)).innerJoin(s.contacts, eq(s.contacts.id, s.contactRemovalRequests.contactId)).where(and(statusWhere(s.contactRemovalRequests.status), search ? or(like(s.contactRemovalRequests.requestText, search), like(s.contributions.body, search), like(s.destinations.name, search)) : undefined, dateWhere(s.contactRemovalRequests.createdAt, input.from, input.to))).orderBy(desc(s.contactRemovalRequests.createdAt)).limit(reportLimit);
  const merged = [...contributionRows.map((row) => ({ ...row, kind: "tip" as const })), ...contactRows.map((row) => ({ ...row, kind: "contact" as const }))].sort((a, b) => b.createdAt - a.createdAt);
  const selected = merged.slice(offset, offset + pageSize);
  const events = await db.select({ targetType: s.moderationEvents.targetType, targetId: s.moderationEvents.targetId, action: s.moderationEvents.action, reason: s.moderationEvents.reason, createdAt: s.moderationEvents.createdAt }).from(s.moderationEvents).where(selected.length ? or(...selected.map((row) => eq(s.moderationEvents.targetId, row.kind === "tip" ? row.contributionId : row.contactId))) : sql`0`).orderBy(desc(s.moderationEvents.createdAt));
  return { ...input, users: [], tips: [], contributions: selected.filter((row) => row.kind === "tip"), contacts: selected.filter((row) => row.kind === "contact"), events, hasPrevious: input.page > 1, hasNext: merged.length > offset + pageSize };
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
  const input = z.object({
    id: z.uuid(),
    expectedStatus: z.enum(["hidden", "published"]),
    status: z.enum(["hidden", "published"]),
    reason,
  }).parse({ id, expectedStatus, status, reason: rawReason });
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const [tip] = await tx
      .select()
      .from(s.contributions)
      .where(eq(s.contributions.id, input.id));
    if (!tip) throw new DomainError("NOT_FOUND", "This tip is unavailable.");
    if (tip.status !== input.expectedStatus)
      throw new DomainError(
        "CONFLICT",
        "This tip's status changed. Refresh and try again.",
      );
    const changed = await tx
      .update(s.contributions)
      .set({ status: input.status, updatedAt: now })
      .where(
        and(
          eq(s.contributions.id, input.id),
          eq(s.contributions.status, input.expectedStatus),
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
      targetId: input.id,
      action: input.status === "hidden" ? "hide" : "restore",
      reason: input.reason,
      createdAt: now,
    });
    return { id: input.id, status: input.status };
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
  const input = z.object({
    targetUserId: z.uuid(),
    expectedStatus: z.enum(["active", "suspended"]),
    status: z.enum(["active", "suspended"]),
    reason,
  }).parse({ targetUserId, expectedStatus, status, reason: rawReason });
  return db.transaction(async (tx) => {
    await moderator(tx, userId);
    const [profile] = await tx
      .select({ status: s.profiles.status, role: s.profiles.role })
      .from(s.profiles)
      .where(eq(s.profiles.userId, input.targetUserId));
    if (!profile)
      throw new DomainError("NOT_FOUND", "This account is unavailable.");
    if (input.targetUserId === userId || profile.role !== "traveler")
      throw new DomainError(
        "FORBIDDEN",
        "Moderators can only block or unblock travelers other than themselves.",
      );
    if (profile.status !== input.expectedStatus)
      throw new DomainError(
        "CONFLICT",
        "This account's status changed. Refresh and try again.",
      );
    const changed = await tx
      .update(s.profiles)
      .set({ status: input.status, updatedAt: now })
      .where(
        and(
          eq(s.profiles.userId, input.targetUserId),
          eq(s.profiles.status, input.expectedStatus),
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
      targetId: input.targetUserId,
      action: input.status === "suspended" ? "suspend" : "restore",
      reason: input.reason,
      createdAt: now,
    });
    return { id: input.targetUserId, status: input.status };
  });
}
