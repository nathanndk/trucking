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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`website` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_slug_unique` ON `clients` (`slug`);--> statement-breakpoint
CREATE INDEX `clients_order_idx` ON `clients` (`sort_order`);--> statement-breakpoint
CREATE TABLE `coverage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`province` text DEFAULT '' NOT NULL,
	`latitude` real,
	`longitude` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coverage_slug_unique` ON `coverage` (`slug`);--> statement-breakpoint
CREATE INDEX `coverage_publish_order_idx` ON `coverage` (`published`,`sort_order`);--> statement-breakpoint
CREATE TABLE `fleet` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`vehicle_type` text DEFAULT '' NOT NULL,
	`capacity` text DEFAULT '' NOT NULL,
	`specifications` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fleet_slug_unique` ON `fleet` (`slug`);--> statement-breakpoint
CREATE INDEX `fleet_publish_order_idx` ON `fleet` (`published`,`sort_order`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`company` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`pickup` text NOT NULL,
	`destination` text NOT NULL,
	`cargo` text NOT NULL,
	`weight` text NOT NULL,
	`vehicle` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_date_idx` ON `inquiries` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_path_unique` ON `media` (`path`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`client_name` text DEFAULT '' NOT NULL,
	`project_year` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_publish_order_idx` ON `projects` (`published`,`sort_order`);--> statement-breakpoint
CREATE TABLE `rate_limit` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`icon` text DEFAULT 'Truck' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_unique` ON `services` (`slug`);--> statement-breakpoint
CREATE INDEX `services_publish_order_idx` ON `services` (`published`,`sort_order`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`legal_name` text NOT NULL,
	`tagline` text NOT NULL,
	`short_description` text NOT NULL,
	`about` text NOT NULL,
	`vision` text NOT NULL,
	`mission` text NOT NULL,
	`established` text NOT NULL,
	`phone` text NOT NULL,
	`whatsapp` text NOT NULL,
	`email` text NOT NULL,
	`address` text NOT NULL,
	`maps_url` text DEFAULT '' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`cta_text` text NOT NULL,
	`logo` text DEFAULT '' NOT NULL,
	`favicon` text DEFAULT '' NOT NULL,
	`statistics` text NOT NULL,
	`credentials` text DEFAULT '' NOT NULL,
	`demo_mode` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);