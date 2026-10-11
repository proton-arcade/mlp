-- Browser app: opens the sites in the internet folder, searched by MPLmit.
-- Offline by design: outside addresses are blocked, not loaded.

INSERT INTO `apps` (
    `uid`,
    `owner_user_id`,
    `icon`,
    `name`,
    `title`,
    `description`,
    `index_url`,
    `approved_for_listing`,
    `approved_for_opening_items`,
    `approved_for_incentive_program`,
    `timestamp`,
    `last_review`,
    `godmode`
) VALUES (
    'app-9598a0b2-3120-4e28-82cb-c71b4fc7648a',
    1,
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDY0IDY0Ij48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHJ4PSI0IiBmaWxsPSIjNjhiNzIzIi8+PHJlY3QgeD0iMzYiIHk9IjgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcng9IjQiIGZpbGw9IiM0ZThmMTciLz48cmVjdCB4PSI4IiB5PSIzNiIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzRlOGYxNyIvPjxyZWN0IHg9IjM2IiB5PSIzNiIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY4YjcyMyIvPjwvc3ZnPg==',
    'app-center',
    'App Center',
    'Install, open, and uninstall apps',
    'https://builtins.namespaces.mixt.mpl/app-center',
    1, 1, 0,
    '2026-10-11 00:00:00',
    NULL,
    0
);
