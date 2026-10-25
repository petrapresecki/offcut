CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`item_id` text NOT NULL,
	`client_key` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_board_idx` ON `comments` (`board_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `votes` (
	`board_id` text NOT NULL,
	`item_id` text NOT NULL,
	`client_key` text NOT NULL,
	`name` text NOT NULL,
	`vote` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`board_id`, `item_id`, `client_key`),
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boards_share_token_unique` ON `boards` (`share_token`);