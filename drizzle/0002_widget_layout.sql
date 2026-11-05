-- Per-user content widget slots. No sticker-default seed rows. Auth is not stored.

CREATE TABLE `widget_layout` (
  `user_id` text NOT NULL,
  `widget_id` text NOT NULL,
  `x` real NOT NULL,
  `y` real NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY(`user_id`, `widget_id`),
  FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON UPDATE no action ON DELETE cascade
);
