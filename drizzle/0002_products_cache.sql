CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`unit_id` text,
	`filter_value` text,
	`tl_updated_at` text,
	`synced_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `products_tenant` ON `products` (`tenant_id`);