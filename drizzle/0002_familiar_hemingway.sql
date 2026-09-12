PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`canonical_name` text,
	`state` text NOT NULL,
	`country_code` text DEFAULT 'IN' NOT NULL,
	`latitude` real,
	`longitude` real,
	`provider` text,
	`provider_place_id` text,
	`normalized_name` text NOT NULL,
	`description` text NOT NULL,
	`hero_path` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "destination_country" CHECK("__new_destinations"."country_code" = 'IN'),
	CONSTRAINT "destination_coordinates" CHECK(("__new_destinations"."latitude" is null and "__new_destinations"."longitude" is null) or ("__new_destinations"."latitude" is not null and "__new_destinations"."longitude" is not null and "__new_destinations"."latitude" between -90 and 90 and "__new_destinations"."longitude" between -180 and 180)),
	CONSTRAINT "destination_provider" CHECK(("__new_destinations"."provider" is null and "__new_destinations"."provider_place_id" is null) or ("__new_destinations"."provider" is not null and "__new_destinations"."provider" = 'geoapify' and "__new_destinations"."provider_place_id" is not null)),
	CONSTRAINT "destination_description" CHECK(length("__new_destinations"."description") <= 240),
	CONSTRAINT "destination_enabled" CHECK("__new_destinations"."enabled" in (0,1))
);
--> statement-breakpoint
INSERT INTO `__new_destinations`("id", "slug", "name", "state", "country_code", "normalized_name", "description", "hero_path", "enabled", "created_at", "updated_at") SELECT "id", "slug", "name", "state", "country_code", "normalized_name", "description", "hero_path", "enabled", "created_at", "updated_at" FROM `destinations`;--> statement-breakpoint
DROP TABLE `destinations`;--> statement-breakpoint
ALTER TABLE `__new_destinations` RENAME TO `destinations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `destinations_slug_unique` ON `destinations` (`slug`);--> statement-breakpoint
CREATE INDEX `destination_name_idx` ON `destinations` (`normalized_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `destination_provider_place_unique` ON `destinations` (`provider`,`provider_place_id`);
