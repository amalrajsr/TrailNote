import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
  check,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import {
  contributions,
  contributionRevisions,
  contacts,
  uploadAssets,
} from "./travel";
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const created = () => integer("created_at").notNull().$defaultFn(Date.now);
export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    contributionId: text("contribution_id")
      .notNull()
      .references(() => contributions.id),
    contributionRevision: integer("contribution_revision").notNull(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason", {
      enum: ["spam", "inaccurate", "unsafe", "private_information", "other"],
    }).notNull(),
    details: text("details"),
    status: text("status", { enum: ["open", "resolved", "dismissed"] })
      .notNull()
      .default("open"),
    resolutionNote: text("resolution_note"),
    moderatorId: text("moderator_id").references(() => user.id),
    createdAt: created(),
    resolvedAt: integer("resolved_at"),
  },
  (t) => [
    uniqueIndex("report_unique").on(
      t.contributionId,
      t.contributionRevision,
      t.reporterId,
    ),
    foreignKey({
      columns: [t.contributionId, t.contributionRevision],
      foreignColumns: [
        contributionRevisions.contributionId,
        contributionRevisions.revision,
      ],
    }),
    index("report_queue_idx").on(t.status, t.createdAt),
    check(
      "report_reason",
      sql`${t.reason} in ('spam','inaccurate','unsafe','private_information','other')`,
    ),
    check("report_status", sql`${t.status} in ('open','resolved','dismissed')`),
    check("report_details", sql`length(${t.details}) <= 1000`),
  ],
);
export const contactRemovalRequests = sqliteTable(
  "contact_removal_requests",
  {
    id: id(),
    contributionId: text("contribution_id")
      .notNull()
      .references(() => contributions.id),
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id),
    requestText: text("request_text").notNull(),
    replyEmail: text("reply_email"),
    status: text("status", { enum: ["open", "resolved", "dismissed"] })
      .notNull()
      .default("open"),
    moderatorId: text("moderator_id").references(() => user.id),
    resolutionNote: text("resolution_note"),
    createdAt: created(),
    resolvedAt: integer("resolved_at"),
  },
  (t) => [
    index("contact_removal_queue_idx").on(t.status, t.createdAt),
    check(
      "removal_status",
      sql`${t.status} in ('open','resolved','dismissed')`,
    ),
    check(
      "removal_text",
      sql`length(trim(${t.requestText})) between 10 and 1000`,
    ),
  ],
);
export const moderationEvents = sqliteTable(
  "moderation_events",
  {
    id: id(),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => user.id),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    action: text("action").notNull(),
    reason: text("reason").notNull(),
    createdAt: created(),
  },
  (t) => [
    check(
      "moderation_reason",
      sql`length(trim(${t.reason})) between 1 and 1000`,
    ),
  ],
);
export const rateLimitBuckets = sqliteTable(
  "rate_limit_buckets",
  {
    keyHash: text("key_hash").notNull(),
    action: text("action").notNull(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.keyHash, t.action, t.windowStart] }),
    index("rate_limit_expiry_idx").on(t.expiresAt),
    check(
      "rate_count",
      sql`${t.count} >= 0 and typeof(${t.count}) = 'integer'`,
    ),
  ],
);
export const mediaCleanupJobs = sqliteTable(
  "media_cleanup_jobs",
  {
    id: id(),
    assetId: text("asset_id")
      .notNull()
      .references(() => uploadAssets.id),
    operation: text("operation", { enum: ["delete", "purge"] }).notNull(),
    reason: text("reason").notNull(),
    status: text("status", { enum: ["pending", "running", "done", "failed"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    leaseUntil: integer("lease_until"),
    lastErrorCode: text("last_error_code"),
    createdAt: created(),
    updatedAt: integer("updated_at").notNull().$defaultFn(Date.now),
  },
  (t) => [
    index("cleanup_queue_idx").on(t.status, t.nextAttemptAt),
    check("cleanup_operation", sql`${t.operation} in ('delete','purge')`),
    check(
      "cleanup_status",
      sql`${t.status} in ('pending','running','done','failed')`,
    ),
    check("cleanup_attempts", sql`${t.attempts} >= 0`),
  ],
);
export const mutationReceipts = sqliteTable(
  "mutation_receipts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    key: text("key").notNull(),
    payloadHash: text("payload_hash").notNull(),
    resultRef: text("result_ref").notNull(),
    createdAt: created(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.key] }),
    index("mutation_receipt_expiry_idx").on(t.expiresAt),
  ],
);
