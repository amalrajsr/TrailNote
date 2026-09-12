import { sql, desc } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  check,
  index,
  uniqueIndex,
  primaryKey,
  foreignKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import {
  categories,
  priceUnits,
  roomTypes,
  bookingMethods,
  transportModes,
} from "../../lib/constants";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const timestamps = () => ({
  createdAt: integer("created_at").notNull().$defaultFn(Date.now),
  updatedAt: integer("updated_at").notNull().$defaultFn(Date.now),
});
const choice = (column: AnySQLiteColumn, values: readonly string[]) =>
  sql`${column} in (${sql.join(
    values.map((v) => sql.raw(`'${v}'`)),
    sql`, `,
  )})`;
const monthCheck = (column: AnySQLiteColumn) =>
  sql`${column} is null or (length(${column}) = 7 and ${column} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and ${column} >= '2000-01' and substr(${column}, 6, 2) between '01' and '12')`;

export const profiles = sqliteTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["traveler", "moderator"] })
      .notNull()
      .default("traveler"),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    ...timestamps(),
  },
  (t) => [
    check("profile_role", choice(t.role, ["traveler", "moderator"])),
    check("profile_status", choice(t.status, ["active", "suspended"])),
  ],
);

export const destinations = sqliteTable(
  "destinations",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    canonicalName: text("canonical_name"),
    state: text("state").notNull(),
    countryCode: text("country_code").notNull().default("IN"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    provider: text("provider", { enum: ["geoapify"] }),
    providerPlaceId: text("provider_place_id"),
    normalizedName: text("normalized_name").notNull(),
    description: text("description").notNull(),
    heroPath: text("hero_path"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    check("destination_country", sql`${t.countryCode} = 'IN'`),
    check(
      "destination_coordinates",
      sql`(${t.latitude} is null and ${t.longitude} is null) or (${t.latitude} is not null and ${t.longitude} is not null and ${t.latitude} between -90 and 90 and ${t.longitude} between -180 and 180)`,
    ),
    check(
      "destination_provider",
      sql`(${t.provider} is null and ${t.providerPlaceId} is null) or (${t.provider} is not null and ${t.provider} = 'geoapify' and ${t.providerPlaceId} is not null)`,
    ),
    check("destination_description", sql`length(${t.description}) <= 240`),
    check("destination_enabled", sql`${t.enabled} in (0,1)`),
    index("destination_name_idx").on(t.normalizedName),
    uniqueIndex("destination_provider_place_unique").on(
      t.provider,
      t.providerPlaceId,
    ),
  ],
);

export const destinationAliases = sqliteTable(
  "destination_aliases",
  {
    id: id(),
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
  },
  (t) => [
    uniqueIndex("destination_alias_unique").on(
      t.destinationId,
      t.normalizedAlias,
    ),
    index("alias_search_idx").on(t.normalizedAlias),
  ],
);

export const contributions = sqliteTable(
  "contributions",
  {
    id: id(),
    destinationId: text("destination_id")
      .notNull()
      .references(() => destinations.id),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    category: text("category", { enum: categories }).notNull(),
    body: text("body").notNull(),
    visitedMonth: text("visited_month"),
    pricePaise: integer("price_paise"),
    currency: text("currency").notNull().default("INR"),
    priceUnit: text("price_unit", { enum: priceUnits }),
    priceUnitLabel: text("price_unit_label"),
    placeName: text("place_name"),
    roomType: text("room_type", { enum: roomTypes }),
    bookingMethod: text("booking_method", { enum: bookingMethods }),
    dish: text("dish"),
    fromName: text("from_name"),
    toName: text("to_name"),
    transportMode: text("transport_mode", { enum: transportModes }),
    durationMinutes: integer("duration_minutes"),
    walkMinutes: integer("walk_minutes"),
    locationText: text("location_text"),
    mapsUrl: text("maps_url"),
    parentContributionId: text("parent_contribution_id").references(
      (): AnySQLiteColumn => contributions.id,
    ),
    parentRevision: integer("parent_revision"),
    revision: integer("revision").notNull().default(1),
    status: text("status", { enum: ["published", "hidden", "deleted"] })
      .notNull()
      .default("published"),
    clientMutationId: text("client_mutation_id").notNull(),
    initialPayloadDigest: text("initial_payload_digest").notNull(),
    ...timestamps(),
    deletedAt: integer("deleted_at"),
  },
  (t) => [
    uniqueIndex("contribution_mutation_unique").on(
      t.authorId,
      t.clientMutationId,
    ),
    foreignKey({
      name: "parent_revision_fk",
      columns: [t.parentContributionId, t.parentRevision],
      foreignColumns: [
        contributionRevisions.contributionId,
        contributionRevisions.revision,
      ],
    }),
    check("contribution_category", choice(t.category, categories)),
    check(
      "contribution_status",
      choice(t.status, ["published", "hidden", "deleted"]),
    ),
    check(
      "contribution_body",
      sql`length(trim(${t.body})) between 10 and 1000`,
    ),
    check(
      "contribution_revision",
      sql`${t.revision} >= 1 and typeof(${t.revision}) = 'integer'`,
    ),
    check("contribution_month", monthCheck(t.visitedMonth)),
    check("contribution_currency", sql`${t.currency} = 'INR'`),
    check(
      "contribution_money",
      sql`(${t.pricePaise} is null and ${t.priceUnit} is null and ${t.priceUnitLabel} is null) or (${t.pricePaise} is not null and typeof(${t.pricePaise}) = 'integer' and ${t.pricePaise} between 0 and 100000000 and ${t.priceUnit} is not null and ${choice(t.priceUnit, priceUnits)} and ((${t.priceUnit} = 'other' and ${t.priceUnitLabel} is not null and length(trim(${t.priceUnitLabel})) between 1 and 40) or (${t.priceUnit} <> 'other' and ${t.priceUnitLabel} is null)))`,
    ),
    check(
      "contribution_parent",
      sql`(${t.parentContributionId} is null and ${t.parentRevision} is null) or (${t.parentContributionId} is not null and ${t.parentRevision} is not null and ${t.parentContributionId} <> ${t.id} and ${t.parentRevision} >= 1)`,
    ),
    check("contribution_room_type", choice(t.roomType, roomTypes)),
    check("contribution_booking", choice(t.bookingMethod, bookingMethods)),
    check(
      "contribution_transport_mode",
      choice(t.transportMode, transportModes),
    ),
    check(
      "contribution_duration",
      sql`${t.durationMinutes} is null or (typeof(${t.durationMinutes}) = 'integer' and ${t.durationMinutes} between 1 and 2880)`,
    ),
    check(
      "contribution_walk",
      sql`${t.walkMinutes} is null or (typeof(${t.walkMinutes}) = 'integer' and ${t.walkMinutes} between 1 and 2880)`,
    ),
    ...[t.placeName, t.fromName, t.toName, t.dish].map((c, i) =>
      check(`contribution_short_text_${i}`, sql`length(${c}) <= 120`),
    ),
    check("contribution_location", sql`length(${t.locationText}) <= 200`),
    index("contribution_destination_category_idx").on(
      t.destinationId,
      t.status,
      t.category,
      desc(t.createdAt),
      desc(t.id),
    ),
    index("contribution_destination_month_idx").on(
      t.destinationId,
      t.status,
      desc(t.visitedMonth),
      desc(t.id),
    ),
    index("contribution_author_idx").on(
      t.authorId,
      t.status,
      desc(t.createdAt),
    ),
    index("contribution_parent_idx").on(
      t.parentContributionId,
      t.parentRevision,
      t.status,
      desc(t.createdAt),
    ),
  ],
);

export const contributionRevisions = sqliteTable(
  "contribution_revisions",
  {
    contributionId: text("contribution_id")
      .notNull()
      .references((): AnySQLiteColumn => contributions.id),
    revision: integer("revision").notNull(),
    editorId: text("editor_id")
      .notNull()
      .references(() => user.id),
    snapshotJson: text("snapshot_json").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(Date.now),
  },
  (t) => [
    primaryKey({ columns: [t.contributionId, t.revision] }),
    check("revision_number", sql`${t.revision} >= 1`),
    check("revision_json", sql`json_valid(${t.snapshotJson})`),
  ],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: id(),
    contributionId: text("contribution_id")
      .notNull()
      .unique()
      .references(() => contributions.id),
    phoneE164: text("phone_e164").notNull(),
    sharingBasis: text("sharing_basis").notNull().default("public_service"),
    status: text("status", { enum: ["visible", "hidden"] })
      .notNull()
      .default("visible"),
    ...timestamps(),
  },
  (t) => [
    check("contact_basis", sql`${t.sharingBasis} = 'public_service'`),
    check("contact_status", choice(t.status, ["visible", "hidden"])),
  ],
);

export const confirmations = sqliteTable(
  "confirmations",
  {
    contributionId: text("contribution_id").notNull(),
    revision: integer("revision").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    visitedMonth: text("visited_month").notNull(),
    ...timestamps(),
  },
  (t) => [
    primaryKey({ columns: [t.contributionId, t.revision, t.userId] }),
    foreignKey({
      columns: [t.contributionId, t.revision],
      foreignColumns: [
        contributionRevisions.contributionId,
        contributionRevisions.revision,
      ],
    }),
    check("confirmation_month", monthCheck(t.visitedMonth)),
    index("confirmation_month_idx").on(
      t.contributionId,
      t.revision,
      desc(t.visitedMonth),
    ),
  ],
);

export const helpfulVotes = sqliteTable(
  "helpful_votes",
  {
    contributionId: text("contribution_id")
      .notNull()
      .references(() => contributions.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at").notNull().$defaultFn(Date.now),
  },
  (t) => [primaryKey({ columns: [t.contributionId, t.userId] })],
);

export const uploadAssets = sqliteTable(
  "upload_assets",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id),
    uploadRequestId: text("upload_request_id").notNull(),
    slot: integer("slot").notNull(),
    attempt: integer("attempt").notNull(),
    imagekitFileId: text("imagekit_file_id").unique(),
    imagekitPath: text("imagekit_path"),
    status: text("status", {
      enum: [
        "reserved",
        "processing",
        "ready",
        "attached",
        "rejected",
        "deleting",
        "deleted",
      ],
    }).notNull(),
    byteSize: integer("byte_size"),
    width: integer("width"),
    height: integer("height"),
    format: text("format"),
    sourceDigest: text("source_digest").notNull(),
    attachedContributionId: text("attached_contribution_id").references(
      () => contributions.id,
    ),
    errorCode: text("error_code"),
    expiresAt: integer("expires_at").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("upload_request_unique").on(
      t.ownerId,
      t.uploadRequestId,
      t.slot,
      t.attempt,
    ),
    check(
      "upload_status",
      choice(t.status, [
        "reserved",
        "processing",
        "ready",
        "attached",
        "rejected",
        "deleting",
        "deleted",
      ]),
    ),
    check(
      "upload_slot",
      sql`${t.slot} between 0 and 2 and ${t.attempt} between 1 and 3`,
    ),
    check(
      "upload_verified",
      sql`${t.status} not in ('ready','attached') or (${t.byteSize} is not null and typeof(${t.byteSize}) = 'integer' and ${t.byteSize} > 0 and ${t.width} is not null and ${t.width} > 0 and ${t.height} is not null and ${t.height} > 0 and ${t.format} is not null and ${t.format} = 'webp' and ${t.imagekitFileId} is not null and ${t.imagekitPath} is not null)`,
    ),
    check(
      "upload_attached",
      sql`${t.status} <> 'attached' or ${t.attachedContributionId} is not null`,
    ),
    index("upload_expiry_idx").on(t.status, t.expiresAt),
    index("upload_owner_idx").on(t.ownerId, t.createdAt),
  ],
);

export const contributionPhotos = sqliteTable(
  "contribution_photos",
  {
    contributionId: text("contribution_id").notNull(),
    revision: integer("revision").notNull(),
    assetId: text("asset_id")
      .notNull()
      .references(() => uploadAssets.id),
    position: integer("position").notNull(),
    altText: text("alt_text").notNull().default(""),
  },
  (t) => [
    primaryKey({ columns: [t.contributionId, t.revision, t.position] }),
    uniqueIndex("photo_asset_revision_unique").on(
      t.contributionId,
      t.revision,
      t.assetId,
    ),
    foreignKey({
      columns: [t.contributionId, t.revision],
      foreignColumns: [
        contributionRevisions.contributionId,
        contributionRevisions.revision,
      ],
    }),
    check("photo_position", sql`${t.position} between 0 and 2`),
    check("photo_alt", sql`length(${t.altText}) <= 160`),
  ],
);
