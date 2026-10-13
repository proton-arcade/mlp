-- Mail and Contacts built-in apps, plus their tables.
-- Messages only move between accounts on this server (@mixt.mpl addresses).

CREATE TABLE IF NOT EXISTS `mail_messages` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `from_user_id` INTEGER NOT NULL,
  `to_user_id` INTEGER NOT NULL,
  `thread_key` varchar(64) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` INTEGER NOT NULL,
  `read_at` INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS `mail_messages_thread` ON `mail_messages` (`thread_key`, `created_at`);
CREATE INDEX IF NOT EXISTS `mail_messages_to` ON `mail_messages` (`to_user_id`, `read_at`);

CREATE TABLE IF NOT EXISTS `mail_contacts` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `owner_user_id` INTEGER NOT NULL,
  `name` varchar(200) NOT NULL,
  `address` varchar(200) DEFAULT NULL,
  `phone` varchar(60) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS `mail_contacts_owner` ON `mail_contacts` (`owner_user_id`);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-178191b8-4220-4b0b-8871-2b32e6431bc8', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzJhNmNiMCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPuKciTwvdGV4dD48L3N2Zz4=', 'mail', 'Mail', 'Chat-style messages to other accounts on this computer',
    'https://builtins.namespaces.mixt.mpl/mail',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-65063023-f423-46a8-8806-be0d4a28ede2', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzFmN2E0ZCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIzMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkA8L3RleHQ+PC9zdmc+', 'contacts', 'Contacts', 'Keep names, numbers and notes for people you message',
    'https://builtins.namespaces.mixt.mpl/contacts',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
