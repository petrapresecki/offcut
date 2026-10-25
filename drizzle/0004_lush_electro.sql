CREATE TABLE `fonts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`family` text NOT NULL,
	`style` text NOT NULL,
	`weight` integer DEFAULT 400 NOT NULL,
	`italic` integer DEFAULT false NOT NULL,
	`file_key` text NOT NULL,
	`format` text NOT NULL,
	`bytes` integer NOT NULL,
	`designer` text,
	`foundry` text,
	`foundry_url` text,
	`license` text,
	`license_url` text,
	`version` text,
	`glyphs` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fonts_user_family_style_idx` ON `fonts` (`user_id`,`family`,`style`);--> statement-breakpoint
CREATE TABLE `item_fonts` (
	`item_id` text NOT NULL,
	`font_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `font_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`font_id`) REFERENCES `fonts`(`id`) ON UPDATE no action ON DELETE cascade
);
