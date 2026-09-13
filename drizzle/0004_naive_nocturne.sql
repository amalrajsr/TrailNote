CREATE TABLE `username_claims` (
	`username` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "username_claim_format" CHECK(length("username_claims"."username") between 3 and 36 and "username_claims"."username" = lower("username_claims"."username") and "username_claims"."username" not glob '*[^a-z0-9-]*' and substr("username_claims"."username", 1, 1) <> '-' and substr("username_claims"."username", -1, 1) <> '-')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `username_claim_unique` ON `username_claims` (lower(username));--> statement-breakpoint
CREATE INDEX `username_claim_user_idx` ON `username_claims` (`user_id`);--> statement-breakpoint
INSERT INTO `username_claims` (`username`, `user_id`, `created_at`) VALUES
	('admin', NULL, cast(unixepoch('subsecond') * 1000 as integer)),
	('administrator', NULL, cast(unixepoch('subsecond') * 1000 as integer)),
	('moderator', NULL, cast(unixepoch('subsecond') * 1000 as integer)),
	('support', NULL, cast(unixepoch('subsecond') * 1000 as integer)),
	('system', NULL, cast(unixepoch('subsecond') * 1000 as integer)),
	('trailnote', NULL, cast(unixepoch('subsecond') * 1000 as integer));--> statement-breakpoint
WITH `ranked_profiles` AS (
	SELECT `user_id`, `created_at`, row_number() OVER (ORDER BY `user_id`) AS `position` FROM `profiles`
)
INSERT INTO `username_claims` (`username`, `user_id`, `created_at`)
SELECT 'traveler-' || printf('%06d', `position`), `user_id`, `created_at` FROM `ranked_profiles`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_upload_assets` (
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
	`attached_profile_user_id` text,
	`error_code` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attached_contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attached_profile_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "upload_status" CHECK("__new_upload_assets"."status" in ('reserved', 'processing', 'ready', 'attached', 'rejected', 'deleting', 'deleted')),
	CONSTRAINT "upload_slot" CHECK("__new_upload_assets"."slot" between 0 and 2 and "__new_upload_assets"."attempt" between 1 and 3),
	CONSTRAINT "upload_verified" CHECK("__new_upload_assets"."status" not in ('ready','attached') or ("__new_upload_assets"."byte_size" is not null and typeof("__new_upload_assets"."byte_size") = 'integer' and "__new_upload_assets"."byte_size" > 0 and "__new_upload_assets"."width" is not null and "__new_upload_assets"."width" > 0 and "__new_upload_assets"."height" is not null and "__new_upload_assets"."height" > 0 and "__new_upload_assets"."format" is not null and "__new_upload_assets"."format" = 'webp' and "__new_upload_assets"."imagekit_file_id" is not null and "__new_upload_assets"."imagekit_path" is not null)),
	CONSTRAINT "upload_attached" CHECK("__new_upload_assets"."status" <> 'attached' or (("__new_upload_assets"."attached_contribution_id" is not null and "__new_upload_assets"."attached_profile_user_id" is null) or ("__new_upload_assets"."attached_contribution_id" is null and "__new_upload_assets"."attached_profile_user_id" is not null)))
);
--> statement-breakpoint
INSERT INTO `__new_upload_assets`("id", "owner_id", "upload_request_id", "slot", "attempt", "imagekit_file_id", "imagekit_path", "status", "byte_size", "width", "height", "format", "source_digest", "attached_contribution_id", "error_code", "expires_at", "created_at", "updated_at") SELECT "id", "owner_id", "upload_request_id", "slot", "attempt", "imagekit_file_id", "imagekit_path", "status", "byte_size", "width", "height", "format", "source_digest", "attached_contribution_id", "error_code", "expires_at", "created_at", "updated_at" FROM `upload_assets`;--> statement-breakpoint
DROP TABLE `upload_assets`;--> statement-breakpoint
ALTER TABLE `__new_upload_assets` RENAME TO `upload_assets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `upload_assets_imagekit_file_id_unique` ON `upload_assets` (`imagekit_file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `upload_request_unique` ON `upload_assets` (`owner_id`,`upload_request_id`,`slot`,`attempt`);--> statement-breakpoint
CREATE UNIQUE INDEX `upload_profile_unique` ON `upload_assets` (`attached_profile_user_id`);--> statement-breakpoint
CREATE INDEX `upload_expiry_idx` ON `upload_assets` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `upload_owner_idx` ON `upload_assets` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`username` text NOT NULL,
	`role` text DEFAULT 'traveler' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "profile_username" CHECK(length("__new_profiles"."username") between 3 and 36 and "__new_profiles"."username" = lower("__new_profiles"."username") and "__new_profiles"."username" not glob '*[^a-z0-9-]*' and substr("__new_profiles"."username", 1, 1) <> '-' and substr("__new_profiles"."username", -1, 1) <> '-'),
	CONSTRAINT "profile_role" CHECK("__new_profiles"."role" in ('traveler', 'moderator')),
	CONSTRAINT "profile_status" CHECK("__new_profiles"."status" in ('active', 'suspended'))
);
--> statement-breakpoint
WITH `ranked_profiles` AS (
	SELECT *, row_number() OVER (ORDER BY `user_id`) AS `position` FROM `profiles`
)
INSERT INTO `__new_profiles`("user_id", "display_name", "username", "role", "status", "created_at", "updated_at") SELECT "user_id", "display_name", 'traveler-' || printf('%06d', "position"), "role", "status", "created_at", "updated_at" FROM `ranked_profiles`;--> statement-breakpoint
DROP TABLE `profiles`;--> statement-breakpoint
ALTER TABLE `__new_profiles` RENAME TO `profiles`;--> statement-breakpoint
CREATE UNIQUE INDEX `profile_username_unique` ON `profiles` (lower(username));
