CREATE TABLE `gps_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(180) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp NOT NULL,
	`durationSeconds` int NOT NULL,
	`distanceMeters` decimal(12,2) NOT NULL,
	`averageSpeedKph` decimal(7,2) NOT NULL,
	`routeJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gps_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metric_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weightKg` decimal(6,2) NOT NULL,
	`capturedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metric_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nutrition_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mealType` varchar(32) NOT NULL,
	`label` varchar(180) NOT NULL,
	`calories` int NOT NULL,
	`proteinGrams` decimal(7,2) NOT NULL,
	`carbGrams` decimal(7,2) NOT NULL,
	`fatGrams` decimal(7,2) NOT NULL,
	`consumedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nutrition_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `workout_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`focus` varchar(120) NOT NULL,
	`movementCount` int NOT NULL,
	`volumeKg` decimal(11,2) NOT NULL,
	`completedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gps_sessions` ADD CONSTRAINT `gps_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `metric_entries` ADD CONSTRAINT `metric_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nutrition_entries` ADD CONSTRAINT `nutrition_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workout_entries` ADD CONSTRAINT `workout_entries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gps_sessions_user_date_idx` ON `gps_sessions` (`userId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `metric_entries_user_date_idx` ON `metric_entries` (`userId`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `nutrition_entries_user_date_idx` ON `nutrition_entries` (`userId`,`consumedAt`);--> statement-breakpoint
CREATE INDEX `workout_entries_user_date_idx` ON `workout_entries` (`userId`,`completedAt`);