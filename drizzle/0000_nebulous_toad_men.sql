CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_identity_unique` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `confirmations` (
	`contribution_id` text NOT NULL,
	`revision` integer NOT NULL,
	`user_id` text NOT NULL,
	`visited_month` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`contribution_id`, `revision`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contribution_id`,`revision`) REFERENCES `contribution_revisions`(`contribution_id`,`revision`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "confirmation_month" CHECK("confirmations"."visited_month" is null or (length("confirmations"."visited_month") = 7 and "confirmations"."visited_month" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and "confirmations"."visited_month" >= '2000-01' and substr("confirmations"."visited_month", 6, 2) between '01' and '12'))
);
--> statement-breakpoint
CREATE INDEX `confirmation_month_idx` ON `confirmations` (`contribution_id`,`revision`,"visited_month" desc);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`contribution_id` text NOT NULL,
	`phone_e164` text NOT NULL,
	`sharing_basis` text DEFAULT 'public_service' NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "contact_basis" CHECK("contacts"."sharing_basis" = 'public_service'),
	CONSTRAINT "contact_status" CHECK("contacts"."status" in ('visible', 'hidden'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_contribution_id_unique` ON `contacts` (`contribution_id`);--> statement-breakpoint
CREATE TABLE `contribution_photos` (
	`contribution_id` text NOT NULL,
	`revision` integer NOT NULL,
	`asset_id` text NOT NULL,
	`position` integer NOT NULL,
	`alt_text` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`contribution_id`, `revision`, `position`),
	FOREIGN KEY (`asset_id`) REFERENCES `upload_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contribution_id`,`revision`) REFERENCES `contribution_revisions`(`contribution_id`,`revision`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "photo_position" CHECK("contribution_photos"."position" between 0 and 2),
	CONSTRAINT "photo_alt" CHECK(length("contribution_photos"."alt_text") <= 160)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photo_asset_revision_unique` ON `contribution_photos` (`contribution_id`,`revision`,`asset_id`);--> statement-breakpoint
CREATE TABLE `contribution_revisions` (
	`contribution_id` text NOT NULL,
	`revision` integer NOT NULL,
	`editor_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`contribution_id`, `revision`),
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`editor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "revision_number" CHECK("contribution_revisions"."revision" >= 1),
	CONSTRAINT "revision_json" CHECK(json_valid("contribution_revisions"."snapshot_json"))
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`destination_id` text NOT NULL,
	`author_id` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`visited_month` text,
	`price_paise` integer,
	`currency` text DEFAULT 'INR' NOT NULL,
	`price_unit` text,
	`price_unit_label` text,
	`place_name` text,
	`room_type` text,
	`booking_method` text,
	`dish` text,
	`from_name` text,
	`to_name` text,
	`transport_mode` text,
	`duration_minutes` integer,
	`walk_minutes` integer,
	`location_text` text,
	`maps_url` text,
	`parent_contribution_id` text,
	`parent_revision` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`client_mutation_id` text NOT NULL,
	`initial_payload_digest` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_contribution_id`,`parent_revision`) REFERENCES `contribution_revisions`(`contribution_id`,`revision`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "contribution_category" CHECK("contributions"."category" in ('stay', 'food', 'transport', 'explore', 'general')),
	CONSTRAINT "contribution_status" CHECK("contributions"."status" in ('published', 'hidden', 'deleted')),
	CONSTRAINT "contribution_body" CHECK(length(trim("contributions"."body")) between 10 and 1000),
	CONSTRAINT "contribution_revision" CHECK("contributions"."revision" >= 1 and typeof("contributions"."revision") = 'integer'),
	CONSTRAINT "contribution_month" CHECK("contributions"."visited_month" is null or (length("contributions"."visited_month") = 7 and "contributions"."visited_month" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and "contributions"."visited_month" >= '2000-01' and substr("contributions"."visited_month", 6, 2) between '01' and '12')),
	CONSTRAINT "contribution_currency" CHECK("contributions"."currency" = 'INR'),
	CONSTRAINT "contribution_money" CHECK(("contributions"."price_paise" is null and "contributions"."price_unit" is null and "contributions"."price_unit_label" is null) or ("contributions"."price_paise" is not null and typeof("contributions"."price_paise") = 'integer' and "contributions"."price_paise" between 0 and 100000000 and "contributions"."price_unit" is not null and "contributions"."price_unit" in ('room_night', 'bed_night', 'person_night', 'meal', 'item', 'person_trip', 'vehicle_trip', 'entry_person', 'other') and (("contributions"."price_unit" = 'other' and "contributions"."price_unit_label" is not null and length(trim("contributions"."price_unit_label")) between 1 and 40) or ("contributions"."price_unit" <> 'other' and "contributions"."price_unit_label" is null)))),
	CONSTRAINT "contribution_parent" CHECK(("contributions"."parent_contribution_id" is null and "contributions"."parent_revision" is null) or ("contributions"."parent_contribution_id" is not null and "contributions"."parent_revision" is not null and "contributions"."parent_contribution_id" <> "contributions"."id" and "contributions"."parent_revision" >= 1)),
	CONSTRAINT "contribution_room_type" CHECK("contributions"."room_type" in ('private', 'dorm', 'shared', 'other')),
	CONSTRAINT "contribution_booking" CHECK("contributions"."booking_method" in ('direct_call', 'walk_in', 'online', 'other')),
	CONSTRAINT "contribution_transport_mode" CHECK("contributions"."transport_mode" in ('bus', 'train', 'shared_jeep', 'auto', 'taxi', 'ferry', 'rental', 'other')),
	CONSTRAINT "contribution_duration" CHECK("contributions"."duration_minutes" is null or (typeof("contributions"."duration_minutes") = 'integer' and "contributions"."duration_minutes" between 1 and 2880)),
	CONSTRAINT "contribution_walk" CHECK("contributions"."walk_minutes" is null or (typeof("contributions"."walk_minutes") = 'integer' and "contributions"."walk_minutes" between 1 and 2880)),
	CONSTRAINT "contribution_short_text_0" CHECK(length("contributions"."place_name") <= 120),
	CONSTRAINT "contribution_short_text_1" CHECK(length("contributions"."from_name") <= 120),
	CONSTRAINT "contribution_short_text_2" CHECK(length("contributions"."to_name") <= 120),
	CONSTRAINT "contribution_short_text_3" CHECK(length("contributions"."dish") <= 120),
	CONSTRAINT "contribution_location" CHECK(length("contributions"."location_text") <= 200)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_mutation_unique` ON `contributions` (`author_id`,`client_mutation_id`);--> statement-breakpoint
CREATE INDEX `contribution_destination_category_idx` ON `contributions` (`destination_id`,`status`,`category`,"created_at" desc,"id" desc);--> statement-breakpoint
CREATE INDEX `contribution_destination_month_idx` ON `contributions` (`destination_id`,`status`,"visited_month" desc,"id" desc);--> statement-breakpoint
CREATE INDEX `contribution_author_idx` ON `contributions` (`author_id`,`status`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `contribution_parent_idx` ON `contributions` (`parent_contribution_id`,`parent_revision`,`status`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `destination_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`destination_id` text NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	FOREIGN KEY (`destination_id`) REFERENCES `destinations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `destination_alias_unique` ON `destination_aliases` (`destination_id`,`normalized_alias`);--> statement-breakpoint
CREATE INDEX `alias_search_idx` ON `destination_aliases` (`normalized_alias`);--> statement-breakpoint
CREATE TABLE `destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`country_code` text DEFAULT 'IN' NOT NULL,
	`normalized_name` text NOT NULL,
	`description` text NOT NULL,
	`hero_path` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "destination_country" CHECK("destinations"."country_code" = 'IN'),
	CONSTRAINT "destination_description" CHECK(length("destinations"."description") <= 240),
	CONSTRAINT "destination_enabled" CHECK("destinations"."enabled" in (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_slug_unique` ON `destinations` (`slug`);--> statement-breakpoint
CREATE INDEX `destination_name_idx` ON `destinations` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `helpful_votes` (
	`contribution_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`contribution_id`, `user_id`),
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'traveler' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "profile_role" CHECK("profiles"."role" in ('traveler', 'moderator')),
	CONSTRAINT "profile_status" CHECK("profiles"."status" in ('active', 'suspended'))
);
--> statement-breakpoint
CREATE TABLE `upload_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`upload_request_id` text NOT NULL,
	`slot` integer NOT NULL,
	`attempt` integer NOT NULL,
	`imagekit_file_id` text,
	`imagekit_path` text,
	`status` text NOT NULL,
	`byte_size` integer,
	`width` integer,
	`height` integer,
	`format` text,
	`source_digest` text NOT NULL,
	`attached_contribution_id` text,
	`error_code` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attached_contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "upload_status" CHECK("upload_assets"."status" in ('reserved', 'processing', 'ready', 'attached', 'rejected', 'deleting', 'deleted')),
	CONSTRAINT "upload_slot" CHECK("upload_assets"."slot" between 0 and 2 and "upload_assets"."attempt" between 1 and 3),
	CONSTRAINT "upload_verified" CHECK("upload_assets"."status" not in ('ready','attached') or ("upload_assets"."byte_size" is not null and typeof("upload_assets"."byte_size") = 'integer' and "upload_assets"."byte_size" between 1 and 400000 and "upload_assets"."width" is not null and "upload_assets"."width" > 0 and "upload_assets"."height" is not null and "upload_assets"."height" > 0 and "upload_assets"."format" is not null and "upload_assets"."format" = 'webp' and "upload_assets"."imagekit_file_id" is not null and "upload_assets"."imagekit_path" is not null)),
	CONSTRAINT "upload_attached" CHECK("upload_assets"."status" <> 'attached' or "upload_assets"."attached_contribution_id" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upload_assets_imagekit_file_id_unique` ON `upload_assets` (`imagekit_file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `upload_request_unique` ON `upload_assets` (`owner_id`,`upload_request_id`,`slot`,`attempt`);--> statement-breakpoint
CREATE INDEX `upload_expiry_idx` ON `upload_assets` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `upload_owner_idx` ON `upload_assets` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `contact_removal_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`contribution_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`request_text` text NOT NULL,
	`reply_email` text,
	`status` text DEFAULT 'open' NOT NULL,
	`moderator_id` text,
	`resolution_note` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moderator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "removal_status" CHECK("contact_removal_requests"."status" in ('open','resolved','dismissed')),
	CONSTRAINT "removal_text" CHECK(length(trim("contact_removal_requests"."request_text")) between 10 and 1000)
);
--> statement-breakpoint
CREATE INDEX `contact_removal_queue_idx` ON `contact_removal_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_cleanup_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`operation` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_until` integer,
	`last_error_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `upload_assets`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cleanup_operation" CHECK("media_cleanup_jobs"."operation" in ('delete','purge')),
	CONSTRAINT "cleanup_status" CHECK("media_cleanup_jobs"."status" in ('pending','running','done','failed')),
	CONSTRAINT "cleanup_attempts" CHECK("media_cleanup_jobs"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX `cleanup_queue_idx` ON `media_cleanup_jobs` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `moderation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`moderator_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`moderator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "moderation_reason" CHECK(length(trim("moderation_events"."reason")) between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE `mutation_receipts` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`result_ref` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mutation_receipt_expiry_idx` ON `mutation_receipts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rate_limit_buckets` (
	`key_hash` text NOT NULL,
	`action` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`key_hash`, `action`, `window_start`),
	CONSTRAINT "rate_count" CHECK("rate_limit_buckets"."count" >= 0 and typeof("rate_limit_buckets"."count") = 'integer')
);
--> statement-breakpoint
CREATE INDEX `rate_limit_expiry_idx` ON `rate_limit_buckets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`contribution_id` text NOT NULL,
	`contribution_revision` integer NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution_note` text,
	`moderator_id` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moderator_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contribution_id`,`contribution_revision`) REFERENCES `contribution_revisions`(`contribution_id`,`revision`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "report_reason" CHECK("reports"."reason" in ('spam','inaccurate','unsafe','private_information','other')),
	CONSTRAINT "report_status" CHECK("reports"."status" in ('open','resolved','dismissed')),
	CONSTRAINT "report_details" CHECK(length("reports"."details") <= 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_unique` ON `reports` (`contribution_id`,`contribution_revision`,`reporter_id`);--> statement-breakpoint
CREATE INDEX `report_queue_idx` ON `reports` (`status`,`created_at`);