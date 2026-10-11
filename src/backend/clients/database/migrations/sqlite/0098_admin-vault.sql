-- Admin vault: records the server can write but not read. The server holds
-- only the public key; the private key lives in a passphrase-protected file on
-- the admin's devices and never reaches the server.

CREATE TABLE IF NOT EXISTS `vault_keys` (
  `id` INTEGER PRIMARY KEY CHECK (`id` = 1),
  `public_key_spki` TEXT NOT NULL,
  `key_id` varchar(32) NOT NULL,
  `created_at` INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS `vault_records` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `label` varchar(200) NOT NULL,
  `wrapped_key` TEXT NOT NULL,
  `iv` varchar(64) NOT NULL,
  `sealed` TEXT NOT NULL,
  `created_at` INTEGER NOT NULL
);

INSERT INTO `apps` (
    `uid`, `owner_user_id`, `icon`, `name`, `title`, `description`, `index_url`,
    `approved_for_listing`, `approved_for_opening_items`, `approved_for_incentive_program`,
    `timestamp`, `last_review`, `godmode`
) VALUES (
    'app-947522ee-5132-4b2f-8960-a6575703247c', 1, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHJ4PSIxMiIgZmlsbD0iIzZiM2ZhMCIvPjx0ZXh0IHg9IjMyIiB5PSI0NCIgZm9udC1zaXplPSIyOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPiYjMTI4Mjc0OzwvdGV4dD48L3N2Zz4=', 'admin-vault', 'Admin Vault', 'Encrypted records only the administrator can read',
    'https://builtins.namespaces.mixt.mpl/admin-vault',
    1, 1, 0, '2026-10-11 00:00:00', NULL, 0
);
