PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contributions` (
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
	`timing_note` text,
	`boarding_point` text,
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
	CONSTRAINT "contribution_category" CHECK("__new_contributions"."category" in ('stay', 'food', 'transport', 'explore', 'general')),
	CONSTRAINT "contribution_status" CHECK("__new_contributions"."status" in ('published', 'hidden', 'deleted')),
	CONSTRAINT "contribution_body" CHECK(length(trim("__new_contributions"."body")) between 10 and 1000),
	CONSTRAINT "contribution_revision" CHECK("__new_contributions"."revision" >= 1 and typeof("__new_contributions"."revision") = 'integer'),
	CONSTRAINT "contribution_month" CHECK("__new_contributions"."visited_month" is null or (length("__new_contributions"."visited_month") = 7 and "__new_contributions"."visited_month" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and "__new_contributions"."visited_month" >= '2000-01' and substr("__new_contributions"."visited_month", 6, 2) between '01' and '12')),
	CONSTRAINT "contribution_currency" CHECK("__new_contributions"."currency" = 'INR'),
	CONSTRAINT "contribution_money" CHECK(("__new_contributions"."price_paise" is null and "__new_contributions"."price_unit" is null and "__new_contributions"."price_unit_label" is null) or ("__new_contributions"."price_paise" is not null and typeof("__new_contributions"."price_paise") = 'integer' and "__new_contributions"."price_paise" between 0 and 100000000 and "__new_contributions"."price_unit" is not null and "__new_contributions"."price_unit" in ('room_night', 'bed_night', 'person_night', 'meal', 'item', 'person_trip', 'vehicle_trip', 'entry_person', 'other') and (("__new_contributions"."price_unit" = 'other' and "__new_contributions"."price_unit_label" is not null and length(trim("__new_contributions"."price_unit_label")) between 1 and 40) or ("__new_contributions"."price_unit" <> 'other' and "__new_contributions"."price_unit_label" is null)))),
	CONSTRAINT "contribution_parent" CHECK(("__new_contributions"."parent_contribution_id" is null and "__new_contributions"."parent_revision" is null) or ("__new_contributions"."parent_contribution_id" is not null and "__new_contributions"."parent_revision" is not null and "__new_contributions"."parent_contribution_id" <> "__new_contributions"."id" and "__new_contributions"."parent_revision" >= 1)),
	CONSTRAINT "contribution_room_type" CHECK("__new_contributions"."room_type" in ('private', 'dorm', 'shared', 'other')),
	CONSTRAINT "contribution_booking" CHECK("__new_contributions"."booking_method" in ('direct_call', 'walk_in', 'online', 'other')),
	CONSTRAINT "contribution_transport_mode" CHECK("__new_contributions"."transport_mode" in ('bus', 'train', 'shared_jeep', 'auto', 'taxi', 'ferry', 'rental', 'other')),
	CONSTRAINT "contribution_duration" CHECK("__new_contributions"."duration_minutes" is null or (typeof("__new_contributions"."duration_minutes") = 'integer' and "__new_contributions"."duration_minutes" between 1 and 2880)),
	CONSTRAINT "contribution_walk" CHECK("__new_contributions"."walk_minutes" is null or (typeof("__new_contributions"."walk_minutes") = 'integer' and "__new_contributions"."walk_minutes" between 1 and 2880)),
	CONSTRAINT "contribution_short_text_0" CHECK(length("__new_contributions"."place_name") <= 120),
	CONSTRAINT "contribution_short_text_1" CHECK(length("__new_contributions"."from_name") <= 120),
	CONSTRAINT "contribution_short_text_2" CHECK(length("__new_contributions"."to_name") <= 120),
	CONSTRAINT "contribution_short_text_3" CHECK(length("__new_contributions"."dish") <= 120),
	CONSTRAINT "contribution_location" CHECK(length("__new_contributions"."location_text") <= 200),
	CONSTRAINT "contribution_timing" CHECK(length("__new_contributions"."timing_note") <= 240),
	CONSTRAINT "contribution_boarding" CHECK(length("__new_contributions"."boarding_point") <= 200)
);
--> statement-breakpoint
INSERT INTO `__new_contributions`("id", "destination_id", "author_id", "category", "body", "visited_month", "price_paise", "currency", "price_unit", "price_unit_label", "place_name", "room_type", "booking_method", "dish", "from_name", "to_name", "transport_mode", "duration_minutes", "walk_minutes", "timing_note", "boarding_point", "location_text", "maps_url", "parent_contribution_id", "parent_revision", "revision", "status", "client_mutation_id", "initial_payload_digest", "created_at", "updated_at", "deleted_at") SELECT "id", "destination_id", "author_id", "category", "body", "visited_month", "price_paise", "currency", "price_unit", "price_unit_label", "place_name", "room_type", "booking_method", "dish", "from_name", "to_name", "transport_mode", "duration_minutes", "walk_minutes", NULL, NULL, "location_text", "maps_url", "parent_contribution_id", "parent_revision", "revision", "status", "client_mutation_id", "initial_payload_digest", "created_at", "updated_at", "deleted_at" FROM `contributions`;--> statement-breakpoint
DROP TABLE `contributions`;--> statement-breakpoint
ALTER TABLE `__new_contributions` RENAME TO `contributions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_mutation_unique` ON `contributions` (`author_id`,`client_mutation_id`);--> statement-breakpoint
CREATE INDEX `contribution_destination_category_idx` ON `contributions` (`destination_id`,`status`,`category`,"created_at" desc,"id" desc);--> statement-breakpoint
CREATE INDEX `contribution_destination_month_idx` ON `contributions` (`destination_id`,`status`,"visited_month" desc,"id" desc);--> statement-breakpoint
CREATE INDEX `contribution_author_idx` ON `contributions` (`author_id`,`status`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `contribution_parent_idx` ON `contributions` (`parent_contribution_id`,`parent_revision`,`status`,"created_at" desc);
