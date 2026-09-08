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
	`error_code` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attached_contribution_id`) REFERENCES `contributions`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "upload_status" CHECK("__new_upload_assets"."status" in ('reserved', 'processing', 'ready', 'attached', 'rejected', 'deleting', 'deleted')),
	CONSTRAINT "upload_slot" CHECK("__new_upload_assets"."slot" between 0 and 2 and "__new_upload_assets"."attempt" between 1 and 3),
	CONSTRAINT "upload_verified" CHECK("__new_upload_assets"."status" not in ('ready','attached') or ("__new_upload_assets"."byte_size" is not null and typeof("__new_upload_assets"."byte_size") = 'integer' and "__new_upload_assets"."byte_size" > 0 and "__new_upload_assets"."width" is not null and "__new_upload_assets"."width" > 0 and "__new_upload_assets"."height" is not null and "__new_upload_assets"."height" > 0 and "__new_upload_assets"."format" is not null and "__new_upload_assets"."format" = 'webp' and "__new_upload_assets"."imagekit_file_id" is not null and "__new_upload_assets"."imagekit_path" is not null)),
	CONSTRAINT "upload_attached" CHECK("__new_upload_assets"."status" <> 'attached' or "__new_upload_assets"."attached_contribution_id" is not null)
);
--> statement-breakpoint
INSERT INTO `__new_upload_assets`("id", "owner_id", "upload_request_id", "slot", "attempt", "imagekit_file_id", "imagekit_path", "status", "byte_size", "width", "height", "format", "source_digest", "attached_contribution_id", "error_code", "expires_at", "created_at", "updated_at") SELECT "id", "owner_id", "upload_request_id", "slot", "attempt", "imagekit_file_id", "imagekit_path", "status", "byte_size", "width", "height", "format", "source_digest", "attached_contribution_id", "error_code", "expires_at", "created_at", "updated_at" FROM `upload_assets`;--> statement-breakpoint
DROP TABLE `upload_assets`;--> statement-breakpoint
ALTER TABLE `__new_upload_assets` RENAME TO `upload_assets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `upload_assets_imagekit_file_id_unique` ON `upload_assets` (`imagekit_file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `upload_request_unique` ON `upload_assets` (`owner_id`,`upload_request_id`,`slot`,`attempt`);--> statement-breakpoint
CREATE INDEX `upload_expiry_idx` ON `upload_assets` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `upload_owner_idx` ON `upload_assets` (`owner_id`,`created_at`);