CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`title_en` text DEFAULT '' NOT NULL,
	`short_description_en` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `articles_publish_order_idx` ON `articles` (`published`,`sort_order`);--> statement-breakpoint
ALTER TABLE `clients` ADD `title_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `short_description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `coverage` ADD `title_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `coverage` ADD `short_description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `coverage` ADD `description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fleet` ADD `title_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fleet` ADD `short_description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `fleet` ADD `description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `service_type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `container_type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `title_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `short_description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `title_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `short_description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `tagline_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `short_description_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `about_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `vision_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `mission_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `cta_text_en` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `credentials_en` text DEFAULT '' NOT NULL;